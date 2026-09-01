import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { runOutreachStrategyAgent } from "@/lib/ai/modules/outreachStrategyAgent";

export async function POST(request: Request) {
  try {
    const { leadId, name, role, company, research, audit } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const leadsAdmin = getLeadsAdminClient();

    let leadResearch = research;
    if (!leadResearch) {
      try {
        const { data: researchRow } = await leadsAdmin
          .from("deorch_research")
          .select("*")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (researchRow) {
          leadResearch = {
            company_research: researchRow.company_research,
            facts: researchRow.facts,
            observations: researchRow.observations,
            inferences: researchRow.inferences,
            research_points: researchRow.research_points,
            commercial_opportunities: researchRow.commercial_opportunities,
          };
        }
      } catch (e) {
        console.warn("Could not fetch research for strategy:", e);
      }
    }

    const aiResponse = await runOutreachStrategyAgent({
      leadId,
      name: name || "Prospect",
      role: role || "Decision Maker",
      company: company || "Target Company",
      research: leadResearch,
      audit,
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Outreach Strategy agent execution failed" },
        { status: 500 }
      );
    }

    const strategy = aiResponse.data;

    // Persist to deorch_outreach_strategies table
    try {
      await leadsAdmin.from("deorch_outreach_strategies").insert([
        {
          lead_id: leadId,
          primary_opportunity: strategy.primary_opportunity,
          secondary_opportunity: strategy.secondary_opportunity,
          recommended_angle: strategy.recommended_angle,
          why_this_matters: strategy.why_this_matters,
          supporting_evidence: strategy.supporting_evidence || [],
          suggested_cta: strategy.suggested_cta,
          things_to_avoid: strategy.things_to_avoid || [],
        },
      ]);
    } catch (dbErr) {
      console.warn("Could not insert into deorch_outreach_strategies (table may need migration):", dbErr);
    }

    return NextResponse.json({
      success: true,
      data: strategy,
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
    });
  } catch (error: any) {
    console.error("AI Strategy API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
