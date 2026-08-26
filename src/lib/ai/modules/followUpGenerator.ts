import { generateStructured } from "../provider";
import { LeadResearchResult, WebsiteAuditResult } from "../types";

export interface SingleFollowUpInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  stage: "follow_up_1" | "follow_up_2" | "follow_up_3" | "follow_up_4" | "follow_up_5";
  initialSubject?: string;
  previousDraft?: string; // Body of the email immediately preceding this follow-up
  researchPoints?: string[];
  auditOpportunities?: string[];
}

export interface SingleFollowUpResult {
  stage: string;
  subject: string;
  body: string;
  angle_used: string;
  word_count: number;
}

export async function runSingleFollowUpGenerator(input: SingleFollowUpInput) {
  const firstName = input.name ? input.name.split(" ")[0] : "there";
  const stageNumber = input.stage.replace("follow_up_", "");

  const stageDescriptions: Record<string, string> = {
    follow_up_1: "Follow-up #1 (3 days after initial email): A gentle, value-add check-in or specific operational observation.",
    follow_up_2: "Follow-up #2 (7 days after initial email): A short industry insight, relevant benchmark, or case snippet.",
    follow_up_3: "Follow-up #3 (12 days after initial email): A different angle or low-friction offer (e.g., offer to compare quick notes).",
    follow_up_4: "Follow-up #4 (16 days after initial email): A practical perspective addressing potential implementation friction.",
    follow_up_5: "Follow-up #5 (21 days after initial email - Breakup email): Polite, professional permission to close the file unless interested.",
  };

  const systemPrompt = `You are an elite B2B Sequence Copywriter.
Your goal is to write Follow-up #${stageNumber} for a cold outreach sequence to ${input.name} (${input.role} at ${input.company}).

CRITICAL COPYWRITING RULES:
1. Base this follow-up directly on the PREVIOUS EMAIL DRAFT and research points provided.
2. Build logically on what was said before without repeating the exact same wording.
3. Keep it VERY CONCISE (Under 80 words).
4. Natural, human tone. Never sound pushy or passive-aggressive ("Checking in again", "Did you see my last email?").
5. ${stageDescriptions[input.stage] || "Contextual follow-up."}`;

  const userPrompt = `Prospect: ${input.name} (${input.role} at ${input.company})
Target Stage: ${input.stage} (Follow-up #${stageNumber})

Previous Email Draft Sent:
"""
${input.previousDraft || "No previous draft provided."}
"""

Research Points & Context:
${JSON.stringify(input.researchPoints || [], null, 2)}

Audit Opportunities:
${JSON.stringify(input.auditOpportunities || [], null, 2)}

Generate Follow-up #${stageNumber} and return JSON:
{
  "stage": "${input.stage}",
  "subject": "Re: ${input.initialSubject || "Quick question"}",
  "body": "Hi ${firstName}, ...",
  "angle_used": "Short description of angle",
  "word_count": 65
}`;

  return generateStructured<SingleFollowUpResult>({
    task: `followup_${stageNumber}`,
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });
}
