import { generateStructured } from "../provider";
import { StructuredResearchOutputSchema, StructuredResearchOutput } from "../schemas";
import { EvidencePackage } from "../evidenceEngine";

export interface ResearchAgentInput {
  leadId?: number;
  evidencePackage: EvidencePackage;
}

export async function runResearchAgent(input: ResearchAgentInput) {
  const { lead, evidence } = input.evidencePackage;

  const systemPrompt = `You are an Evidence-Based Research Synthesis Engine.

CRITICAL REASONING & ACCURACY RULES:
1. You DO NOT have permission to invent or fabricate company facts, revenue, funding, or clients.
2. FACT: You may ONLY classify a claim as a FACT when supplied evidence directly supports it. Preserve the source_url and source_title.
3. OBSERVATION: You may produce OBSERVATIONS when they are directly observable from supplied website text.
4. INFERENCE: You may produce INFERENCES when they logically follow from facts/observations. EVERY inference MUST reference the supporting evidence IDs (e.g. ["EVD-1", "EVD-3"]) that led to that conclusion. Use guarded language ("may", "appears to", "suggests").
5. COMMERCIAL OPPORTUNITY: You MUST identify 1-2 strong commercial outreach opportunities connecting evidence + business context + potential impact, linking supporting evidence IDs.
6. If evidence is insufficient for any section, state "Unknown" or return an empty array rather than guessing.`;

  const userPrompt = `Prospect Context:
- Target Person: ${lead.name} (${lead.role || "Decision Maker"})
- Company Name: ${lead.company}
- Website URL: ${lead.website}

Supplied Candidates Evidence Package (${evidence.length} Evidence Items):
${JSON.stringify(evidence, null, 2)}

Synthesize research strictly over the supplied evidence package and output valid JSON matching this exact structure:
{
  "company_research": {
    "summary": "Concise 2-3 sentence overview of what the company actually does based on evidence",
    "industry": "Specific industry category",
    "business_model": "B2B / B2C / SaaS / Agency / etc.",
    "target_audience": "Who their primary customers appear to be",
    "key_offerings": ["Offering 1", "Offering 2"]
  },
  "facts": [
    {
      "claim": "Verified factual statement derived from supplied evidence",
      "source_url": "https://...",
      "source_title": "Primary Source Title",
      "source_type": "company_website",
      "confidence": "verified",
      "evidence_id": "EVD-1"
    }
  ],
  "observations": [
    {
      "claim": "Directly observable website pattern or content structure",
      "page_url": "https://...",
      "source_type": "company_website",
      "confidence": "observed",
      "evidence_id": "EVD-2"
    }
  ],
  "inferences": [
    {
      "claim": "Logical conclusion derived from supported facts/observations",
      "supporting_evidence_ids": ["EVD-1", "EVD-2"],
      "confidence": "ai_inference",
      "evidence_id": "INF-1"
    }
  ],
  "research_points": [
    "Core focus or strategic objective of ${lead.company}",
    "Operational/business observation relevant to a ${lead.role}",
    "Commercial opportunity for modernization or service alignment"
  ],
  "commercial_opportunities": [
    {
      "opportunity": "Actionable commercial optimization opportunity",
      "why_it_matters": "Clear explanation of business impact and why it matters to ${lead.name}",
      "supporting_evidence_ids": ["EVD-1", "EVD-2"],
      "priority": "high"
    }
  ],
  "confidence": "high"
}`;

  // Step 1: Initial AI Generation
  const aiResponse = await generateStructured<StructuredResearchOutput>({
    task: "research_synthesis",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });

  if (!aiResponse.success || !aiResponse.data) {
    return aiResponse;
  }

  // Step 2: Zod Schema Validation
  const validationResult = StructuredResearchOutputSchema.safeParse(aiResponse.data);

  if (validationResult.success) {
    return {
      ...aiResponse,
      data: validationResult.data,
    };
  }

  console.warn("Research output failed Zod validation, attempting 1 controlled retry...", validationResult.error);

  // Controlled Retry
  const retryPrompt = `${userPrompt}\n\nFIX PREVIOUS FORMATTING FAILURE:\nYour previous response failed JSON schema validation: ${validationResult.error.message}. Ensure exact property names and valid structure.`;
  const retryResponse = await generateStructured<StructuredResearchOutput>({
    task: "research_synthesis_retry",
    leadId: input.leadId,
    systemPrompt,
    prompt: retryPrompt,
  });

  if (retryResponse.success && retryResponse.data) {
    const retryValidation = StructuredResearchOutputSchema.safeParse(retryResponse.data);
    if (retryValidation.success) {
      return {
        ...retryResponse,
        data: retryValidation.data,
      };
    }
  }

  return {
    ...aiResponse,
    success: false,
    error: `Zod validation failed: ${validationResult.error.message}`,
  };
}
