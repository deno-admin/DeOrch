import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { runEmailGenerator } from "@/lib/ai/modules/emailGenerator";

export async function POST(request: Request) {
  try {
    const { leadId, name, role, company, research } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const leadsAdmin = getLeadsAdminClient();

    // Fetch evidence and commercial opportunities for the lead
    let facts: string[] = [];
    let observations: string[] = [];
    let commercialOpportunities: any[] = [];

    try {
      const { data: evidenceRows } = await leadsAdmin
        .from("deorch_research_evidence")
        .select("type, claim, source_url")
        .eq("lead_id", leadId);

      if (evidenceRows && evidenceRows.length > 0) {
        facts = evidenceRows.filter(e => e.type === "fact").map(e => e.claim);
        observations = evidenceRows.filter(e => e.type === "observation").map(e => e.claim);
      }

      const { data: oppRows } = await leadsAdmin
        .from("deorch_commercial_opportunities")
        .select("opportunity, why_it_matters, priority")
        .eq("lead_id", leadId);

      if (oppRows && oppRows.length > 0) {
        commercialOpportunities = oppRows;
      }
    } catch (e) {
      console.warn("Could not fetch evidence rows for lead:", e);
    }

    const aiResponse = await runEmailGenerator({
      leadId,
      name: name || "Prospect",
      role: role || "Executive",
      company: company || "Company",
      facts: facts.length > 0 ? facts : (research?.facts || []),
      observations: observations.length > 0 ? observations : (research?.observations || []),
      commercialOpportunities: commercialOpportunities.length > 0 ? commercialOpportunities : (research?.commercial_opportunities || []),
      researchPoints: research?.research_points || [],
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Email Generator execution failed" },
        { status: 500 }
      );
    }

    const emailResult = aiResponse.data;

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
