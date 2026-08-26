import { generateStructured } from "../provider";
import { FollowUpSequenceResult, LeadResearchResult, WebsiteAuditResult, OutreachStrategyResult } from "../types";

export interface FollowUpGeneratorInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  initialSubject: string;
  initialBody: string;
  research?: Partial<LeadResearchResult>;
  audit?: Partial<WebsiteAuditResult>;
  strategy?: Partial<OutreachStrategyResult>;
}

export async function runFollowUpGenerator(input: FollowUpGeneratorInput) {
  const firstName = input.name ? input.name.split(" ")[0] : "there";

  const systemPrompt = `You are a B2B Sequence Copywriting Expert.
Your task is to generate 4 context-aware, non-pushy follow-up emails for a sales sequence.

RULES FOR FOLLOW-UPS:
- Each follow-up must add NEW value or a NEW angle rather than just saying "just bumping this".
- Follow-up #1 (3 days delay): Quick value-add snippet or specific example.
- Follow-up #2 (7 days delay): Brief case study or relevant insight.
- Follow-up #3 (12 days delay): Different perspective or short video/audit offer.
- Follow-up #4 (20 days delay - Breakup email): Polite permission to close the file.
- Keep each follow-up under 80 words.
- Natural human tone, no AI clichés.`;

  const userPrompt = `Prospect: ${input.name} (${input.role} at ${input.company})

Initial Email Sent:
Subject: ${input.initialSubject}
Body:
"""
${input.initialBody}
"""

Outreach Strategy Context:
${JSON.stringify(input.strategy || {}, null, 2)}

Generate 4 follow-up emails in JSON format:
{
  "follow_up_1": {
    "stage": "follow_up_1",
    "subject": "Re: ${input.initialSubject}",
    "body": "Follow-up body for step 1...",
    "delay_days": 3,
    "angle_focus": "Specific metric or observation highlight"
  },
  "follow_up_2": {
    "stage": "follow_up_2",
    "subject": "Re: ${input.initialSubject}",
    "body": "Follow-up body for step 2...",
    "delay_days": 7,
    "angle_focus": "Relevant industry benchmark"
  },
  "follow_up_3": {
    "stage": "follow_up_3",
    "subject": "Re: ${input.initialSubject}",
    "body": "Follow-up body for step 3...",
    "delay_days": 12,
    "angle_focus": "Low-friction offer"
  },
  "follow_up_4": {
    "stage": "follow_up_4",
    "subject": "Re: ${input.initialSubject}",
    "body": "Follow-up body for step 4 (breakup)...",
    "delay_days": 20,
    "angle_focus": "Closing the thread gracefully"
  }
}`;

  return generateStructured<FollowUpSequenceResult>({
    task: "followup",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });
}
