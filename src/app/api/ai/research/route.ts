import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { scrapeWebsiteDetailed } from "@/lib/scraper/websiteScraper";
import { fetchTargetedExternalResearch } from "@/lib/scraper/externalResearch";
import { buildEvidencePackage } from "@/lib/ai/evidenceEngine";
import { runResearchAgent } from "@/lib/ai/modules/researchAgent";

export async function POST(request: Request) {
  try {
    const { leadId, name, company, role, website } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const leadsAdmin = getLeadsAdminClient();

    // 1. Fetch existing lead context from database for previous context
    let existingLeadData: any = {};
    try {
      const { data } = await leadsAdmin
        .from("deorch_leads")
        .select("*")
        .eq("id", leadId)
        .single();
      if (data) existingLeadData = data;
    } catch (e) {
      console.warn("Could not fetch existing lead record:", e);
    }

    const leadContext = {
      leadId,
      name: name || existingLeadData.name || "Prospect",
      role: role || existingLeadData.role || "Executive",
      company: company || existingLeadData.company || "Company",
      website: website || existingLeadData.domain || existingLeadData.website || "",
      industry: existingLeadData.industry || "N/A",
      bio: existingLeadData.bio || "",
      previousResearchPoints: existingLeadData.research_points || "",
    };

    // 2. Parallel Extraction: Website Scraper + External Web Research
    const [scrapedData, externalData] = await Promise.all([
      scrapeWebsiteDetailed(leadContext.website),
      fetchTargetedExternalResearch(leadContext.company, leadContext.website, leadContext.role),
    ]);

    // 3. Build Evidence Package
    const evidencePackage = buildEvidencePackage(leadContext, scrapedData, externalData);

    // 4. Run AI Research Agent (NVIDIA Provider with strict rules & Zod validation)
    const aiResponse = await runResearchAgent({
      leadId,
      evidencePackage,
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Evidence-based research agent execution failed" },
        { status: 500 }
      );
    }

    const research = aiResponse.data;

    // 5. Persist Evidence items to deorch_research_evidence table
    try {
      const evidenceInserts = evidencePackage.evidence.map((evd) => ({
        lead_id: leadId,
        evidence_key: evd.id,
        type: evd.type,
        claim: evd.claim,
        content: evd.content || "",
        source_url: evd.source_url || leadContext.website,
        source_title: evd.source_title || "Source",
        source_type: evd.source_type,
        confidence: evd.confidence,
        supporting_evidence_keys: evd.supporting_evidence_ids || [],
        metadata: evd.metadata || {},
      }));

      if (evidenceInserts.length > 0) {
        await leadsAdmin.from("deorch_research_evidence").insert(evidenceInserts);
      }
    } catch (dbErr) {
      console.warn("Could not insert into deorch_research_evidence:", dbErr);
    }

    // 6. Persist Commercial Opportunities to deorch_commercial_opportunities table
    try {
      if (research.commercial_opportunities && research.commercial_opportunities.length > 0) {
        const oppInserts = research.commercial_opportunities.map((opp) => ({
          lead_id: leadId,
          opportunity: opp.opportunity,
          why_it_matters: opp.why_it_matters,
          supporting_evidence_keys: opp.supporting_evidence_ids || [],
          priority: opp.priority || "high",
        }));
        await leadsAdmin.from("deorch_commercial_opportunities").insert(oppInserts);
      }
    } catch (dbErr) {
      console.warn("Could not insert into deorch_commercial_opportunities:", dbErr);
    }

    // 7. Persist to deorch_research table
    try {
      const researchRecord = {
        lead_id: leadId,
        company_summary: research.company_research?.summary || "Summary",
        industry: research.company_research?.industry || "Software & Services",
        business_model: research.company_research?.business_model || "B2B",
        target_audience: research.company_research?.target_audience || "Enterprise Customers",
        key_offerings: research.company_research?.key_offerings || [],
        products_services: research.company_research?.key_offerings || [],
        positioning: research.company_research?.summary || "",
        facts: research.facts || [],
        observations: research.observations || [],
        inferences: research.inferences || [],
        research_points: research.research_points || [],
        commercial_opportunities: research.commercial_opportunities || [],
        company_signals: research.facts ? research.facts.map((f: any) => f.claim) : [],
        recent_relevant_information: research.observations ? research.observations.map((o: any) => o.claim) : [],
        relevant_people_context: `Context regarding ${leadContext.name} as ${leadContext.role}`,
        sources: [leadContext.website].filter(Boolean),
        evidence_summary: evidencePackage.summary || {},
        confidence: research.confidence || "medium",
        provider: aiResponse.provider || "nvidia",
        model: aiResponse.model || "meta/llama-3.3-70b-instruct",
        latency_ms: aiResponse.latencyMs || null,
        updated_at: new Date().toISOString(),
      };

      // Check if research already exists for this lead_id
      const { data: existingRows } = await leadsAdmin
        .from("deorch_research")
        .select("id")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        const { error: updErr } = await leadsAdmin
          .from("deorch_research")
          .update(researchRecord)
          .eq("id", existingRows[0].id);

        if (updErr) {
          console.error("Error updating deorch_research:", updErr);
        } else {
          console.log(`Successfully updated deorch_research for lead ${leadId}`);
        }
      } else {
        const { error: insErr } = await leadsAdmin
          .from("deorch_research")
          .insert([researchRecord]);

        if (insErr) {
          console.error("Error inserting into deorch_research:", insErr);
        } else {
          console.log(`Successfully inserted into deorch_research for lead ${leadId}`);
        }
      }
    } catch (dbErr) {
      console.error("Exception writing to deorch_research:", dbErr);
    }

    // 8. Update deorch_leads for backwards compatibility
    const researchPointsStr = Array.isArray(research.research_points)
      ? research.research_points.join("\n\n")
      : String(research.research_points || "");

    await leadsAdmin
      .from("deorch_leads")
      .update({
        industry: research.company_research?.industry || "Software & Services",
        bio: research.company_research?.summary || "",
        research_points: researchPointsStr,
        outreach_status: "researched",
      })
      .eq("id", leadId);

    return NextResponse.json({
      success: true,
      data: research,
      evidenceSummary: evidencePackage.summary,
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
    });
  } catch (error: any) {
    console.error("AI Evidence Research API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    const leadsAdmin = getLeadsAdminClient();
    const { data, error } = await leadsAdmin
      .from("deorch_research")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.warn("Error fetching deorch_research:", error);
    }

    if (!data) {
      return NextResponse.json({ success: true, research: null });
    }

    const formattedResearch = {
      company_research: {
        summary: data.company_summary || "",
        industry: data.industry || "",
        business_model: data.business_model || "",
        target_audience: data.target_audience || "",
        key_offerings: data.key_offerings || data.products_services || [],
        positioning: data.positioning || data.company_summary || "",
      },
      facts: data.facts || [],
      observations: data.observations || [],
      inferences: data.inferences || [],
      research_points: data.research_points || [],
      commercial_opportunities: data.commercial_opportunities || [],
      confidence: data.confidence || "medium",
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json({
      success: true,
      research: formattedResearch,
      raw: data,
    });
  } catch (error: any) {
    console.error("Error fetching research:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
