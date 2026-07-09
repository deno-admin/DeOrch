import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDeOrchAdminClient, getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { generateUnsubscribeToken } from "@/lib/unsubscribeToken";

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
    const { data: smtpConfig, error: smtpError } = await deOrchAdmin
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (smtpError || !smtpConfig) {
      return NextResponse.json(
        { error: "SMTP not configured. Visit Settings to set it up." },
        { status: 400 }
      );
    }

    const leadsAdmin = getLeadsAdminClient();
    const { data, error: leadsError } = await leadsAdmin
      .from("clay_outreach_leads")
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
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    });

    const results: { leadId: number; success: boolean; error?: string }[] = [];

    for (const lead of leads || []) {
      if (!lead.email) {
        results.push({ leadId: lead.id, success: false, error: "No email on file" });
        continue;
      }

      // Do not send followups to unsubscribed or not interested leads
      if (stage !== "initial") {
        const leadStatus = (lead.status || "").toLowerCase().trim();
        if (leadStatus === "unsubscribed" || leadStatus === "not interested") {
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

      try {
        await transporter.sendMail({
          from: `${smtpConfig.from_name || ""} <${smtpConfig.from_email}>`.trim(),
          to: lead.email,
          subject,
          text: bodyWithFooter,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:unsubscribe@denovation.in>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

        const updatePayload: Record<string, any> = {};
        if (stage === "initial") {
          updatePayload.email_sent_status = "success";
          updatePayload.outreach_status = "sent";
          updatePayload.email_sent_at = new Date().toISOString();
        } else {
          updatePayload[sentAtColumn] = new Date().toISOString();
        }

        await leadsAdmin
          .from("clay_outreach_leads")
          .update(updatePayload)
          .eq("id", lead.id);

        results.push({ leadId: lead.id, success: true });
      } catch (sendError) {
        console.error(`Failed to send to lead ${lead.id}:`, sendError);
        const message = sendError instanceof Error ? sendError.message : "Send failed";

        if (stage === "initial") {
          await leadsAdmin
            .from("clay_outreach_leads")
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
