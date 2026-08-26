import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { runSingleFollowUpGenerator } from "@/lib/ai/modules/followUpGenerator";

export async function POST(request: Request) {
  try {
    const {
      leadId,
      name,
      role,
      company,
      stage = "follow_up_1",
      initialSubject,
      previousDraft,
      researchPoints,
      auditOpportunities,
    } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const validStages = ["follow_up_1", "follow_up_2", "follow_up_3", "follow_up_4", "follow_up_5"];
    if (!validStages.includes(stage)) {
      return NextResponse.json({ error: `Invalid stage: ${stage}` }, { status: 400 });
    }

    const aiResponse = await runSingleFollowUpGenerator({
      leadId,
      name: name || "Prospect",
      role: role || "Executive",
      company: company || "Company",
      stage,
      initialSubject: initialSubject || "Outreach",
      previousDraft: previousDraft || "",
      researchPoints: Array.isArray(researchPoints) ? researchPoints : [],
      auditOpportunities: Array.isArray(auditOpportunities) ? auditOpportunities : [],
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || `Follow-up generation for ${stage} failed` },
        { status: 500 }
      );
    }

    const followUp = aiResponse.data;
    const leadsAdmin = getLeadsAdminClient();

    // Map stage to database column: email_follow_up_1 .. email_follow_up_5
    const columnMap: Record<string, string> = {
      follow_up_1: "email_follow_up_1",
      follow_up_2: "email_follow_up_2",
      follow_up_3: "email_follow_up_3",
      follow_up_4: "email_follow_up_4",
      follow_up_5: "email_follow_up_5",
    };

    const targetColumn = columnMap[stage];

    await leadsAdmin
      .from("deorch_leads")
      .update({
        [targetColumn]: followUp.body,
      })
      .eq("id", leadId);

    // Also insert record into deorch_generated_messages
    try {
      await leadsAdmin.from("deorch_generated_messages").insert([
        {
          lead_id: leadId,
          stage: stage,
          subject: followUp.subject,
          body: followUp.body,
          angle_used: followUp.angle_used,
          status: "draft",
        },
      ]);
    } catch (dbErr) {
      console.warn("Could not insert into deorch_generated_messages:", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: followUp,
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
