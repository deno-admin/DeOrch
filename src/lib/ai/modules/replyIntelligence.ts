import { generateStructured } from "../provider";
import { ReplyAnalysisResult, ReplyCategory } from "../types";

export interface ReplyIntelligenceInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  originalSubject?: string;
  originalBody?: string;
  replyText: string;
}

export async function runReplyIntelligence(input: ReplyIntelligenceInput) {
  const categories: ReplyCategory[] = [
    "interested",
    "meeting_request",
    "asking_price",
    "needs_more_information",
    "not_now",
    "not_interested",
    "wrong_person",
    "referral",
    "unsubscribe",
    "other",
  ];

  const systemPrompt = `You are an AI Email Reply Classifier and Sales Assistant.
Your job is to analyze incoming prospect email replies, accurately classify their intent, determine the sentiment, recommend the next action for the sales representative, and draft a high-quality human response.

CATEGORIES ALLOWED:
${JSON.stringify(categories)}

DO NOT automatically send responses. The output will be presented to the sales rep for review.`;

  const userPrompt = `Prospect: ${input.name} (${input.role} at ${input.company})

Original Sent Message:
Subject: ${input.originalSubject || "Outreach"}
Body: ${input.originalBody || "Initial outreach email"}

Received Prospect Reply:
"""
${input.replyText}
"""

Analyze this reply and return JSON with keys:
{
  "category": "meeting_request", // Must be one of the specified categories
  "sentiment_context": "Positive interest shown; prospect wants to see demo next week",
  "recommended_next_action": "Send calendar link or offer 2 specific time slots for a 15-min call",
  "suggested_response": "Draft of a polite, professional reply to send to the prospect",
  "confidence": 0.95 // Float between 0.0 and 1.0
}`;

  return generateStructured<ReplyAnalysisResult>({
    task: "reply",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });
}
