import { generateStructured } from "../provider";
import { WebsiteAuditResult } from "../types";

export interface WebsiteAuditAgentInput {
  leadId?: number;
  company: string;
  website: string;
  scrapedContent: string;
  pagesScraped?: string[];
}

export async function runWebsiteAuditAgent(input: WebsiteAuditAgentInput) {
  const systemPrompt = `You are an expert Website Audit & UX/Commercial Optimization Specialist.
Your task is to analyze website content to identify observable strengths, conversion bottlenecks, messaging issues, and commercial opportunities for outreach.

CRITICAL RULES:
1. Base your evaluation strictly on observable site content provided.
2. Separate clear observable issues from assumptions.
3. Do NOT make unsupported technical claims (e.g. don't claim latency is 5.2s unless measured).
4. Focus on insights that are useful for sales outreach (conversion, value proposition clarity, CTA effectiveness, messaging friction).`;

  const userPrompt = `Company: ${input.company}
Website URL: ${input.website}
Pages Analyzed: ${JSON.stringify(input.pagesScraped || [input.website])}

Extracted Content from Website:
"""
${input.scrapedContent || "No site content available."}
"""

Perform a comprehensive website audit and return JSON with keys:
{
  "overall_score": 78, // Integer 1-100 score
  "category_scores": {
    "ux_ui": 75,
    "navigation": 80,
    "messaging_clarity": 70,
    "conversion_cta": 65,
    "trust_signals": 85,
    "mobile_responsiveness": 80,
    "seo_content": 75,
    "brand_consistency": 85
  },
  "strengths": [
    "Observable strength 1",
    "Observable strength 2"
  ],
  "issues": [
    {
      "category": "Messaging Clarity",
      "description": "Value proposition is buried below the fold",
      "impact": "high"
    },
    {
      "category": "Conversion CTA",
      "description": "Call to action buttons are vague or lack contrast",
      "impact": "medium"
    }
  ],
  "opportunities": [
    "Key commercial optimization opportunity 1",
    "Key commercial optimization opportunity 2"
  ],
  "priority": "high", // high | medium | low
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "evidence": [
    "Evidence quote or observable pattern from text 1",
    "Evidence quote or observable pattern from text 2"
  ]
}`;

  return generateStructured<WebsiteAuditResult>({
    task: "audit",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });
}
