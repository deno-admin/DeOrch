import { generateStructured } from "../provider";
import { LeadResearchResult } from "../types";

export interface ResearchAgentInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  website: string;
  scrapedContent?: string;
}

export async function runResearchAgent(input: ResearchAgentInput) {
  const systemPrompt = `You are an elite B2B Sales Research Intelligence Agent.
Your job is to synthesize verified research on a company and prospect for sales outreach.

IMPORTANT RULES:
1. Do NOT fabricate or invent fake company information, news, revenue figures, funding, or clients.
2. If information cannot be confidently determined or scraped, state "Unknown" or "Unverified" instead of guessing.
3. Distinguish clearly between factual evidence from website text vs reasonable industry inference.
4. Provide structured JSON output.`;

  const userPrompt = `Research Target:
- Lead Name: ${input.name}
- Lead Role: ${input.role || "Executive/Decision Maker"}
- Company Name: ${input.company}
- Website: ${input.website}

Website Scraped Content:
"""
${input.scrapedContent || "No scraped content available."}
"""

Synthesize research and output JSON with the exact structure:
{
  "company_summary": "Short 2-3 sentence overview of what the company actually does",
  "industry": "Specific industry category (e.g. SaaS, Staffing & Recruiting, FinTech)",
  "business_model": "B2B, B2C, Marketplace, Agency, SaaS, etc.",
  "target_audience": "Who their primary customers appear to be",
  "products_services": ["List of 2-4 primary offerings or products"],
  "positioning": "Their core value proposition or brand slogan",
  "company_signals": ["Notable growth indicators, tech stack clues, or operational focus"],
  "recent_relevant_information": ["Observations or developments extracted from website/context"],
  "relevant_people_context": "Context regarding someone in ${input.name}'s role as ${input.role}",
  "research_points": [
    "Point 1: Core focus or strategic objective of ${input.company}",
    "Point 2: Key operational/business challenge faced by a ${input.role}",
    "Point 3: Commercial opportunity for how modern tech/operations solutions align with their goals"
  ],
  "sources": ["${input.website || "Company domain"}"],
  "confidence": "high"
}`;

  return generateStructured<LeadResearchResult>({
    task: "research",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });
}
