import { EvidenceItem, EvidenceSourceType } from "./schemas";
import { ScrapedWebsiteData } from "../scraper/websiteScraper";
import { ExternalResearchResult } from "../scraper/externalResearch";

export interface LeadContextInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  website: string;
  industry?: string;
  bio?: string;
  previousResearchPoints?: string;
  previousAudit?: any;
}

export interface EvidencePackage {
  lead: LeadContextInput;
  evidence: EvidenceItem[];
  evidenceMap: Record<string, EvidenceItem>;
  summary: {
    totalItems: number;
    websiteItems: number;
    externalItems: number;
    deorchItems: number;
  };
}

export function buildEvidencePackage(
  lead: LeadContextInput,
  siteData?: ScrapedWebsiteData,
  extData?: ExternalResearchResult
): EvidencePackage {
  const evidence: EvidenceItem[] = [];
  let evdCounter = 1;

  const nextId = () => `EVD-${evdCounter++}`;

  // 1. Candidate Evidence from Lead DB Context
  if (lead.bio && lead.bio.trim() !== "") {
    const id = nextId();
    evidence.push({
      id,
      lead_id: lead.leadId,
      type: "fact",
      claim: `Database Profile Bio: ${lead.bio}`,
      content: lead.bio,
      source_url: lead.website || "",
      source_title: "DeOrch Lead DB",
      source_type: "existing_deorch_data",
      confidence: "verified",
      supporting_evidence_ids: [],
      collected_at: new Date().toISOString(),
      metadata: { field: "bio" },
    });
  }

  if (lead.industry && lead.industry !== "N/A" && lead.industry.trim() !== "") {
    const id = nextId();
    evidence.push({
      id,
      lead_id: lead.leadId,
      type: "fact",
      claim: `Industry Category: ${lead.industry}`,
      content: lead.industry,
      source_url: lead.website || "",
      source_title: "DeOrch Lead DB",
      source_type: "existing_deorch_data",
      confidence: "verified",
      supporting_evidence_ids: [],
      collected_at: new Date().toISOString(),
      metadata: { field: "industry" },
    });
  }

  const deorchCount = evidence.length;

  // 2. Candidate Evidence from Website Pages Scraped
  let siteCount = 0;
  if (siteData && siteData.pageEvidences && siteData.pageEvidences.length > 0) {
    for (const page of siteData.pageEvidences) {
      if (page.title) {
        const id = nextId();
        evidence.push({
          id,
          lead_id: lead.leadId,
          type: "observation",
          claim: `Page Title at ${page.url}: "${page.title}"`,
          content: page.title,
          source_url: page.url,
          source_title: page.title,
          source_type: "company_website",
          confidence: "observed",
          supporting_evidence_ids: [],
          collected_at: page.scrapedAt,
          metadata: { pageUrl: page.url },
        });
        siteCount++;
      }

      if (page.headings && page.headings.length > 0) {
        const id = nextId();
        evidence.push({
          id,
          lead_id: lead.leadId,
          type: "observation",
          claim: `Observed Key Navigation/Section Headings on ${page.url}: ${page.headings.slice(0, 4).join(" | ")}`,
          content: page.headings.join("\n"),
          source_url: page.url,
          source_title: page.title,
          source_type: "company_website",
          confidence: "observed",
          supporting_evidence_ids: [],
          collected_at: page.scrapedAt,
          metadata: { headings: page.headings },
        });
        siteCount++;
      }

      if (page.observedClaims && page.observedClaims.length > 0) {
        for (const claimText of page.observedClaims.slice(0, 3)) {
          const id = nextId();
          evidence.push({
            id,
            lead_id: lead.leadId,
            type: "observation",
            claim: `Direct Website Excerpt from ${page.url}: "${claimText}"`,
            content: claimText,
            source_url: page.url,
            source_title: page.title,
            source_type: "company_website",
            confidence: "observed",
            supporting_evidence_ids: [],
            collected_at: page.scrapedAt,
            metadata: { pageUrl: page.url },
          });
          siteCount++;
        }
      }
    }
  }

  // 3. Candidate Evidence from External Web Research
  let extCount = 0;
  if (extData && extData.items && extData.items.length > 0) {
    for (const item of extData.items) {
      const id = nextId();
      evidence.push({
        id,
        lead_id: lead.leadId,
        type: item.source_type === "news" ? "fact" : "observation",
        claim: `External Web Research [Query: "${item.query}"]: ${item.passage}`,
        content: item.passage,
        source_url: item.source_url,
        source_title: item.source_title,
        source_type: item.source_type === "news" ? "news" : "external_web",
        confidence: "verified",
        supporting_evidence_ids: [],
        collected_at: item.retrieved_at,
        metadata: { query: item.query },
      });
      extCount++;
    }
  }

  const evidenceMap: Record<string, EvidenceItem> = {};
  evidence.forEach(item => {
    evidenceMap[item.id] = item;
  });

  return {
    lead,
    evidence,
    evidenceMap,
    summary: {
      totalItems: evidence.length,
      websiteItems: siteCount,
      externalItems: extCount,
      deorchItems: deorchCount,
    },
  };
}
