import { z } from "zod";

// 1. Evidence Primitives
export const EvidenceTypeSchema = z.enum(["fact", "observation", "inference"]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const EvidenceSourceTypeSchema = z.enum([
  "company_website",
  "external_web",
  "news",
  "social",
  "existing_deorch_data",
  "user_provided",
  "ai_inference",
]);
export type EvidenceSourceType = z.infer<typeof EvidenceSourceTypeSchema>;

export const EvidenceConfidenceSchema = z.enum([
  "verified",
  "observed",
  "ai_inference",
  "unverified",
]);
export type EvidenceConfidence = z.infer<typeof EvidenceConfidenceSchema>;

export const EvidenceItemSchema = z.object({
  id: z.string(),
  lead_id: z.number().optional(),
  type: EvidenceTypeSchema,
  claim: z.string().min(1),
  content: z.string().optional(),
  source_url: z.string().optional(),
  source_title: z.string().optional(),
  source_type: EvidenceSourceTypeSchema,
  source_date: z.string().optional(),
  confidence: EvidenceConfidenceSchema,
  supporting_evidence_ids: z.array(z.string()).optional(),
  collected_at: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

// 2. Verified Facts Schema
export const FactSchema = z.object({
  claim: z.string().min(1),
  source_url: z.string().optional(),
  source_title: z.string().optional(),
  source_type: z.string().optional(),
  confidence: z.string().optional(),
  evidence_id: z.string().optional(),
});
export type VerifiedFact = z.infer<typeof FactSchema>;

// 3. Website Observations Schema
export const ObservationSchema = z.object({
  claim: z.string().min(1),
  page_url: z.string().optional(),
  source_type: z.string().optional(),
  confidence: z.string().optional(),
  evidence_id: z.string().optional(),
});
export type WebsiteObservation = z.infer<typeof ObservationSchema>;

// 4. Reasoning Inferences Schema
export const InferenceSchema = z.object({
  claim: z.string().min(1),
  supporting_evidence_ids: z.array(z.string()).optional(),
  confidence: z.string().optional(),
  evidence_id: z.string().optional(),
});
export type ReasoningInference = z.infer<typeof InferenceSchema>;

// 5. Commercial Opportunity Schema
export const CommercialOpportunitySchema = z.object({
  opportunity: z.string().min(1),
  why_it_matters: z.string().min(1),
  supporting_evidence_ids: z.array(z.string()).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});
export type CommercialOpportunity = z.infer<typeof CommercialOpportunitySchema>;

// 6. Complete Evidence-Based Research Output Schema
export const StructuredResearchOutputSchema = z.object({
  company_research: z.object({
    summary: z.string().optional(),
    industry: z.string().optional(),
    business_model: z.string().optional(),
    target_audience: z.string().optional(),
    key_offerings: z.array(z.string()).optional(),
  }).optional(),

  facts: z.array(FactSchema).optional(),
  observations: z.array(ObservationSchema).optional(),
  inferences: z.array(InferenceSchema).optional(),
  research_points: z.array(z.string()).optional(),

  commercial_opportunities: z.array(CommercialOpportunitySchema).optional(),

  confidence: z.enum(["high", "medium", "low"]).optional(),
});
export type StructuredResearchOutput = z.infer<typeof StructuredResearchOutputSchema>;

// 7. Website Audit Output Schema
export const AuditIssueSchema = z.object({
  category: z.string().optional(),
  description: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]).optional(),
});

export const WebsiteAuditOutputSchema = z.object({
  overall_score: z.number().min(0).max(100).optional(),
  category_scores: z.record(z.string(), z.number()).optional(),
  strengths: z.array(z.string()).optional(),
  issues: z.array(AuditIssueSchema).optional(),
  opportunities: z.array(z.string()).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  recommendations: z.array(z.string()).optional(),
  evidence: z.array(z.string()).optional(),
  pages_scraped: z.array(z.string()).optional(),
});
export type WebsiteAuditOutput = z.infer<typeof WebsiteAuditOutputSchema>;

// 8. Email Generation Output Schema
export const EmailOutputSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  angle_used: z.string().optional(),
  word_count: z.number().optional(),
});
export type EmailOutput = z.infer<typeof EmailOutputSchema>;
