import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { scrapeWebsiteDetailed } from "@/lib/scraper/websiteScraper";
import { runResearchAgent } from "@/lib/ai/modules/researchAgent";

export async function POST(request: Request) {
  try {
    const { leadId, name, company, role, website } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // 1. Web Extraction
    const scrapedData = await scrapeWebsiteDetailed(website || "");

    // 2. Run AI Research Agent
    const aiResponse = await runResearchAgent({
      leadId,
      name: name || "Prospect",
      company: company || "Target Company",
      role: role || "Executive",
      website: website || "",
      scrapedContent: scrapedData.combinedCleanText,
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Research agent execution failed" },
        { status: 500 }
      );
    }

    const research = aiResponse.data;
    const leadsAdmin = getLeadsAdminClient();

    // 3. Persist to deorch_research artifact table
    try {
      await leadsAdmin.from("deorch_research").insert([
        {
          lead_id: leadId,
          company_summary: research.company_summary,
          industry: research.industry,
          business_model: research.business_model,
          target_audience: research.target_audience,
          products_services: research.products_services || [],
          positioning: research.positioning,
          company_signals: research.company_signals || [],
          recent_relevant_information: research.recent_relevant_information || [],
          relevant_people_context: research.relevant_people_context,
          research_points: research.research_points || [],
          sources: research.sources || [website],
          confidence: research.confidence || "medium",
        },
      ]);
    } catch (dbErr) {
      console.warn("Could not insert into deorch_research (table may need migration):", dbErr);
    }

    // 4. Update deorch_leads for backwards compatibility
    const researchPointsStr = Array.isArray(research.research_points)
      ? research.research_points.join("\n\n")
      : String(research.research_points || "");

    await leadsAdmin
      .from("deorch_leads")
      .update({
        industry: research.industry || "N/A",
        bio: research.company_summary || "",
        research_points: researchPointsStr,
        outreach_status: "researched",
      })
      .eq("id", leadId);

    return NextResponse.json({
      success: true,
      data: research,
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
    });
  } catch (error: any) {
    console.error("AI Research API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
