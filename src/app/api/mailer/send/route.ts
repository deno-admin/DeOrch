import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDeOrchAdminClient, getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { generateUnsubscribeToken } from "@/lib/unsubscribeToken";
import { renderColdOutreachEmail } from "@/lib/coldOutreachTemplateSource";

export async function POST(request: Request) {
  try {
    const { leadIds, stage = "initial" } = await request.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "leadIds must be a non-empty array" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json(
        {
          error:
            "NEXT_PUBLIC_APP_URL is not configured — sending is blocked because emails must include a working unsubscribe link (see outreach compliance policy). Deploy DeOrch and set NEXT_PUBLIC_APP_URL before sending.",
        },
        { status: 400 }
      );
    }

    let draftColumn = "email_draft";
    let sentAtColumn = "email_sent_at";

    if (stage !== "initial") {
      const match = stage.match(/^follow_up_([1-5])$/);
      if (!match) {
        return NextResponse.json({ error: `Invalid stage: ${stage}` }, { status: 400 });
      }
      const followUpNumber = match[1];
      draftColumn = `email_follow_up_${followUpNumber}`;
      sentAtColumn = `email_follow_up_${followUpNumber}_sent_at`;
    }

    const deOrchAdmin = getDeOrchAdminClient();
    const { data: smtpConfigs, error: smtpError } = await deOrchAdmin
      .from("smtp_settings")
      .select("*");

    if (smtpError || !smtpConfigs || smtpConfigs.length === 0) {
      return NextResponse.json(
        { error: "SMTP not configured. Visit Settings to set it up." },
        { status: 400 }
      );
    }

    // Find the active SMTP config, fallback to the first saved one
    const smtpConfig = smtpConfigs.find(c => c.username.endsWith("::active")) || smtpConfigs[0];
    const cleanUsername = smtpConfig.username.replace(/::active$/, "");

    const leadsAdmin = getLeadsAdminClient();
    const { data, error: leadsError } = await leadsAdmin
      .from("deorch_leads")
      .select(`id, email, name, company, subject, status, ${draftColumn}`)
      .in("id", leadIds);

    const leads = data as any[] | null;

    if (leadsError) {
      throw leadsError;
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: cleanUsername,
        pass: smtpConfig.password,
      },
    });

    const results: { leadId: number; success: boolean; error?: string }[] = [];

    for (const lead of leads || []) {
      if (!lead.email) {
        results.push({ leadId: lead.id, success: false, error: "No email on file" });
        continue;
      }

      // Do not send to unsubscribed or not interested leads, at any stage
      // (including the initial email — a lead already marked Unsubscribed
      // should never receive a first email either).
      {
        const leadStatus = (lead.status || "").toLowerCase().trim();
        if (leadStatus === "unsubscribed" || leadStatus === "not interested" || leadStatus === "wrong icp") {
          results.push({
            leadId: lead.id,
            success: false,
            error: `Skipped: Lead status is '${lead.status || "Unsubscribed/Not Interested"}'`,
          });
          continue;
        }
      }

      const draftText = (lead as any)[draftColumn] || "";
      let subject = (lead.subject && lead.subject.trim())
        || `Quick thought on ${lead.company}'s website`;

      if (stage !== "initial") {
        if (!subject.toLowerCase().startsWith("re:")) {
          subject = `Re: ${subject}`;
        }
      }

      const unsubscribeUrl = `${appUrl}/api/unsubscribe?id=${lead.id}&token=${generateUnsubscribeToken(lead.id)}`;
      const bodyWithFooter = `${draftText}\n\n---\nDenovation (denovation.in)\nDon't want these emails? Unsubscribe: ${unsubscribeUrl}`;
      const html = renderColdOutreachEmail({
        companyName: lead.company,
        firstName: (lead.name || "").split(" ")[0],
        draftText,
        unsubscribeUrl,
        stage,
      });

      let emailLogId: number | null = null;
      try {
        // 1. Create the email log first
        const { data: emailLog, error: emailLogError } = await leadsAdmin
          .from("email_logs")
          .insert({
            lead_id: lead.id,
            recipient_email: lead.email,
            sender_email: smtpConfig.from_email,
            subject,
            email_type: stage,
            status: "queued",
            queued_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (emailLogError) {
          throw new Error(`Failed to create email log: ${emailLogError.message}`);
        }
        emailLogId = emailLog.id;

        // 2. Send through the currently active SMTP provider
        const configSet = process.env.SES_CONFIGURATION_SET || "denovation-email-tracking";
        const info = await transporter.sendMail({
          from: `${smtpConfig.from_name || ""} <${smtpConfig.from_email}>`.trim(),
          to: lead.email,
          subject,
          text: bodyWithFooter,
          html,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:unsubscribe@denovation.in>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-SES-CONFIGURATION-SET": configSet,
          },
        });

        // 3. Get the SMTP provider's message ID (try to parse SES message ID from SMTP response)
        let messageId = null;
        if (info.response) {
          // Response usually looks like: "250 2.0.0 OK 01000189eb81c19b-6e9fa25c-a55e-49b8-aa34-dbb320d8a770-000000"
          const parts = info.response.split(" ");
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart.includes("-") && !lastPart.includes("@")) {
            messageId = lastPart;
          }
        }
        if (!messageId && info.messageId) {
          // Fallback: strip brackets from standard messageId
          messageId = info.messageId.replace(/[<>]/g, "");
        }

        // 4. Update the log as successfully sent
        await leadsAdmin
          .from("email_logs")
          .update({
            message_id: messageId,
            status: "sent",
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", emailLogId);

        // 5. Keep existing lead status logic
        const updatePayload: Record<string, any> = {};
        if (stage === "initial") {
          updatePayload.email_sent_status = "success";
          updatePayload.outreach_status = "sent";
          updatePayload.email_sent_at = new Date().toISOString();
        } else {
          updatePayload[sentAtColumn] = new Date().toISOString();
        }

        await leadsAdmin
          .from("deorch_leads")
          .update(updatePayload)
          .eq("id", lead.id);

        results.push({ leadId: lead.id, success: true });
      } catch (sendError) {
        console.error(`Failed to send to lead ${lead.id}:`, sendError);
        const message = sendError instanceof Error ? sendError.message : "Send failed";

        // Mark the email log as failed if it was created
        if (emailLogId !== null) {
          await leadsAdmin
            .from("email_logs")
            .update({
              status: "failed",
              error_message: message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", emailLogId);
        }

        if (stage === "initial") {
          await leadsAdmin
            .from("deorch_leads")
            .update({ email_sent_status: "failed" })
            .eq("id", lead.id);
        }

        results.push({ leadId: lead.id, success: false, error: message });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Mailer send route error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
