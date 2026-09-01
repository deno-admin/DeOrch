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
    let researchPoints: string[] = research?.research_points || [];

    try {
      // 1. Check deorch_research table
      const { data: researchRow } = await leadsAdmin
        .from("deorch_research")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (researchRow) {
        if (Array.isArray(researchRow.facts) && researchRow.facts.length > 0) {
          facts = researchRow.facts.map((f: any) => (typeof f === "string" ? f : f.claim || ""));
        }
        if (Array.isArray(researchRow.observations) && researchRow.observations.length > 0) {
          observations = researchRow.observations.map((o: any) => (typeof o === "string" ? o : o.claim || ""));
        }
        if (Array.isArray(researchRow.commercial_opportunities) && researchRow.commercial_opportunities.length > 0) {
          commercialOpportunities = researchRow.commercial_opportunities;
        }
        if (Array.isArray(researchRow.research_points) && researchRow.research_points.length > 0 && researchPoints.length === 0) {
          researchPoints = researchRow.research_points;
        }
      }

      // 2. Fallback to deorch_research_evidence if needed
      if (facts.length === 0 || observations.length === 0) {
        const { data: evidenceRows } = await leadsAdmin
          .from("deorch_research_evidence")
          .select("type, claim, source_url")
          .eq("lead_id", leadId);

        if (evidenceRows && evidenceRows.length > 0) {
          if (facts.length === 0) {
            facts = evidenceRows.filter(e => e.type === "fact").map(e => e.claim);
          }
          if (observations.length === 0) {
            observations = evidenceRows.filter(e => e.type === "observation").map(e => e.claim);
          }
        }
      }

      // 3. Fallback to deorch_commercial_opportunities if needed
      if (commercialOpportunities.length === 0) {
        const { data: oppRows } = await leadsAdmin
          .from("deorch_commercial_opportunities")
          .select("opportunity, why_it_matters, priority")
          .eq("lead_id", leadId);

        if (oppRows && oppRows.length > 0) {
          commercialOpportunities = oppRows;
        }
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
