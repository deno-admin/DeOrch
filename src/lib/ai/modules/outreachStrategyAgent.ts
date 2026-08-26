import { generateStructured } from "../provider";
import { OutreachStrategyResult, LeadResearchResult, WebsiteAuditResult } from "../types";

export interface OutreachStrategyInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  research?: Partial<LeadResearchResult>;
  audit?: Partial<WebsiteAuditResult>;
  deorchServiceInfo?: string;
}

export async function runOutreachStrategyAgent(input: OutreachStrategyInput) {
  const systemPrompt = `You are a Senior B2B Outreach Strategist.
Your goal is to analyze company research and website audit findings to determine the single strongest, most compelling commercial outreach angle for a prospect.

CRITICAL INSTRUCTIONS:
- Do NOT output generic claims like "Your website has some UX problems".
- Identify specific, high-value commercial disconnects (e.g. "The company has a strong sustainability story, but that value proposition is buried and may not be obvious to first-time visitors.").
- Align the outreach angle with the prospect's role (${input.role}) and key business metrics.`;

  const userPrompt = `Prospect Information:
- Name: ${input.name}
- Role: ${input.role}
- Company: ${input.company}

Company Research Findings:
${JSON.stringify(input.research || {}, null, 2)}

Website Audit Findings:
${JSON.stringify(input.audit || {}, null, 2)}

Our Service / Value Prop Context:
${input.deorchServiceInfo || "DeOrch provides AI-powered sales automation, digital operations optimization, conversion strategy, and technical performance engineering."}

Determine the optimal outreach strategy and output JSON with:
{
  "primary_opportunity": "The most compelling, high-impact commercial opportunity discovered",
  "secondary_opportunity": "A secondary supporting pain point or opportunity",
  "recommended_angle": "The specific strategic angle to take in the cold email",
  "why_this_matters": "Why this specific opportunity matters to someone in ${input.role}'s role",
  "supporting_evidence": ["Evidence point 1", "Evidence point 2"],
  "suggested_cta": "A friction-free call to action (e.g. open to comparing notes on X next week?)",
  "things_to_avoid": ["Pitfalls or generic clichés to avoid in messaging"]
}`;

  return generateStructured<OutreachStrategyResult>({
    task: "strategy",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });
}
