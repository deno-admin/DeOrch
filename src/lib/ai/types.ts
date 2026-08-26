export type AIProviderName = "nvidia" | "gemini";

export interface AIOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  leadId?: number;
  task?: string;
}

export interface AIStructuredOptions<T = any> extends AIOptions {
  jsonSchemaName?: string;
}

export interface AIResponse<T = string> {
  data: T;
  rawText: string;
  provider: AIProviderName;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

// 1. Research Output
export interface LeadResearchResult {
  company_summary: string;
  industry: string;
  business_model: string;
  target_audience: string;
  products_services: string[];
  positioning: string;
  company_signals: string[];
  recent_relevant_information: string[];
  relevant_people_context: string;
  research_points: string[];
  sources: string[];
  confidence: "high" | "medium" | "low";
}

// 2. Website Audit Output
export interface AuditIssue {
  category: string;
  description: string;
  impact: "high" | "medium" | "low";
}

export interface WebsiteAuditResult {
  overall_score: number; // 1-100
  category_scores: {
    ux_ui: number;
    navigation: number;
    messaging_clarity: number;
    conversion_cta: number;
    trust_signals: number;
    mobile_responsiveness: number;
    seo_content: number;
    brand_consistency: number;
  };
  strengths: string[];
  issues: AuditIssue[];
  opportunities: string[];
  priority: "high" | "medium" | "low";
  recommendations: string[];
  evidence: string[];
  pages_scraped?: string[];
}

// 3. Outreach Strategy Output
export interface OutreachStrategyResult {
  primary_opportunity: string;
  secondary_opportunity: string;
  recommended_angle: string;
  why_this_matters: string;
  supporting_evidence: string[];
  suggested_cta: string;
  things_to_avoid: string[];
}

// 4. Email Generator Output
export interface EmailGenerationResult {
  subject: string;
  body: string;
  angle_used: string;
  word_count: number;
}

// 5. Follow-Up Sequence Output
export interface FollowUpItem {
  stage: string; // follow_up_1, follow_up_2, etc.
  subject: string;
  body: string;
  delay_days: number;
  angle_focus: string;
}

export interface FollowUpSequenceResult {
  follow_up_1: FollowUpItem;
  follow_up_2: FollowUpItem;
  follow_up_3: FollowUpItem;
  follow_up_4: FollowUpItem;
}

// 6. Reply Intelligence Output
export type ReplyCategory =
  | "interested"
  | "meeting_request"
  | "asking_price"
  | "needs_more_information"
  | "not_now"
  | "not_interested"
  | "wrong_person"
  | "referral"
  | "unsubscribe"
  | "other";

export interface ReplyAnalysisResult {
  category: ReplyCategory;
  sentiment_context: string;
  recommended_next_action: string;
  suggested_response: string;
  confidence: number;
}
