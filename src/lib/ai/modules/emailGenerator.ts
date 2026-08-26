import { generateStructured } from "../provider";
import { EmailGenerationResult, LeadResearchResult, WebsiteAuditResult, OutreachStrategyResult } from "../types";

export interface EmailGeneratorInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  research?: Partial<LeadResearchResult>;
  audit?: Partial<WebsiteAuditResult>;
  strategy?: Partial<OutreachStrategyResult>;
}

export async function runEmailGenerator(input: EmailGeneratorInput) {
  const firstName = input.name ? input.name.split(" ")[0] : "there";
  
  const systemPrompt = `You are a top 1% B2B Copywriter.
Your goal is to write a highly personalized, human cold email to ${input.name} (${input.role} at ${input.company}).

STRICT COPYWRITING RULES:
1. Be CONCISE (Under 120 words total).
2. Sound like a real human writing a 1-on-1 email, NOT a generic marketing bot.
3. NEVER use AI buzzwords: "I hope this email finds you well", "In today's fast-paced digital landscape", "game-changer", "synergy", "delve".
4. Avoid excessive or fake compliments.
5. Do NOT dump the entire audit or research list. Pick ONLY the single strongest relevant observation.
6. Make the reason for contacting clear within the first 2 sentences.
7. End with a low-friction, interest-based CTA (e.g., "Worth a brief chat next Tuesday?", "Open to seeing how we handled this for X?").`;

  const userPrompt = `Prospect: ${input.name} (${input.role} at ${input.company})

Outreach Strategy:
${JSON.stringify(input.strategy || {}, null, 2)}

Research Highlights:
${JSON.stringify(input.research?.research_points || [], null, 2)}

Audit Highlights:
${JSON.stringify(input.audit?.opportunities || [], null, 2)}

Generate the initial cold email and return JSON:
{
  "subject": "Concise, relevant subject line (under 6 words)",
  "body": "Email body starting with Hi ${firstName}, ...",
  "angle_used": "Short explanation of the outreach angle used",
  "word_count": 95
}`;

  return generateStructured<EmailGenerationResult>({
    task: "email",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });
}
