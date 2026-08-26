import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { scrapeWebsiteDetailed } from "@/lib/scraper/websiteScraper";
import { runWebsiteAuditAgent } from "@/lib/ai/modules/websiteAuditAgent";

export async function POST(request: Request) {
  try {
    const { leadId, company, website } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    // 1. Multi-page Web Scrape
    const scrapedData = await scrapeWebsiteDetailed(website || "");

    // 2. Run Audit Agent
    const aiResponse = await runWebsiteAuditAgent({
      leadId,
      company: company || "Target Company",
      website: website || "",
      scrapedContent: scrapedData.combinedCleanText,
      pagesScraped: scrapedData.pagesScraped,
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Website Audit agent execution failed" },
        { status: 500 }
      );
    }

    const audit = aiResponse.data;
    const leadsAdmin = getLeadsAdminClient();

    // 3. Persist to deorch_website_audits table
    try {
      await leadsAdmin.from("deorch_website_audits").insert([
        {
          lead_id: leadId,
          overall_score: audit.overall_score || 70,
          category_scores: audit.category_scores || {},
          strengths: audit.strengths || [],
          issues: audit.issues || [],
          opportunities: audit.opportunities || [],
          priority: audit.priority || "medium",
          recommendations: audit.recommendations || [],
          evidence: audit.evidence || [],
          pages_scraped: scrapedData.pagesScraped,
        },
      ]);
    } catch (dbErr) {
      console.warn("Could not insert into deorch_website_audits (table may need migration):", dbErr);
    }

    // 4. Update deorch_leads website_score
    await leadsAdmin
      .from("deorch_leads")
      .update({
        website_score: Math.round((audit.overall_score || 70) / 10), // Scale 1-10
      })
      .eq("id", leadId);

    return NextResponse.json({
      success: true,
      data: audit,
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
    });
  } catch (error: any) {
    console.error("AI Audit API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
