import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { runEmailGenerator } from "@/lib/ai/modules/emailGenerator";

export async function POST(request: Request) {
  try {
    const { leadId, name, role, company, research, audit, strategy } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const aiResponse = await runEmailGenerator({
      leadId,
      name: name || "Prospect",
      role: role || "Executive",
      company: company || "Company",
      research,
      audit,
      strategy,
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Email Generator execution failed" },
        { status: 500 }
      );
    }

    const emailResult = aiResponse.data;
    const leadsAdmin = getLeadsAdminClient();

    // Persist to deorch_generated_messages table
    try {
      await leadsAdmin.from("deorch_generated_messages").insert([
        {
          lead_id: leadId,
          stage: "initial",
          subject: emailResult.subject,
          body: emailResult.body,
          angle_used: emailResult.angle_used,
          status: "draft",
        },
      ]);
    } catch (dbErr) {
      console.warn("Could not insert into deorch_generated_messages:", dbErr);
    }

    // Update deorch_leads for mailer compatibility
    await leadsAdmin
      .from("deorch_leads")
      .update({
        subject: emailResult.subject,
        email_draft: emailResult.body,
        outreach_status: "generated",
      })
      .eq("id", leadId);

    return NextResponse.json({
      success: true,
      data: emailResult,
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
    });
  } catch (error: any) {
    console.error("AI Email API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
