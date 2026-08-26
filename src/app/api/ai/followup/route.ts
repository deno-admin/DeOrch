import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { runFollowUpGenerator } from "@/lib/ai/modules/followUpGenerator";

export async function POST(request: Request) {
  try {
    const { leadId, name, role, company, initialSubject, initialBody, research, audit, strategy } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const aiResponse = await runFollowUpGenerator({
      leadId,
      name: name || "Prospect",
      role: role || "Executive",
      company: company || "Company",
      initialSubject: initialSubject || "Outreach",
      initialBody: initialBody || "",
      research,
      audit,
      strategy,
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Follow-up Generator execution failed" },
        { status: 500 }
      );
    }

    const seq = aiResponse.data;
    const leadsAdmin = getLeadsAdminClient();

    // Persist follow-up drafts directly to deorch_leads columns (email_follow_up_1..4)
    await leadsAdmin
      .from("deorch_leads")
      .update({
        email_follow_up_1: seq.follow_up_1?.body || "",
        email_follow_up_2: seq.follow_up_2?.body || "",
        email_follow_up_3: seq.follow_up_3?.body || "",
        email_follow_up_4: seq.follow_up_4?.body || "",
      })
      .eq("id", leadId);

    // Also persist to deorch_generated_messages
    try {
      const messagesToInsert = [
        { lead_id: leadId, stage: "follow_up_1", subject: seq.follow_up_1.subject, body: seq.follow_up_1.body, angle_used: seq.follow_up_1.angle_focus },
        { lead_id: leadId, stage: "follow_up_2", subject: seq.follow_up_2.subject, body: seq.follow_up_2.body, angle_used: seq.follow_up_2.angle_focus },
        { lead_id: leadId, stage: "follow_up_3", subject: seq.follow_up_3.subject, body: seq.follow_up_3.body, angle_used: seq.follow_up_3.angle_focus },
        { lead_id: leadId, stage: "follow_up_4", subject: seq.follow_up_4.subject, body: seq.follow_up_4.body, angle_used: seq.follow_up_4.angle_focus },
      ];
      await leadsAdmin.from("deorch_generated_messages").insert(messagesToInsert);
    } catch (dbErr) {
      console.warn("Could not insert into deorch_generated_messages:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: seq,
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
    });
  } catch (error: any) {
    console.error("AI Follow-up API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
