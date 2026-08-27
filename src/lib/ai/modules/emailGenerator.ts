import { generateStructured } from "../provider";
import { EmailOutputSchema, EmailOutput } from "../schemas";

export interface EmailGeneratorInput {
  leadId?: number;
  name: string;
  role: string;
  company: string;
  facts?: string[];
  observations?: string[];
  commercialOpportunities?: any[];
  researchPoints?: string[];
}

export async function runEmailGenerator(input: EmailGeneratorInput) {
  const firstName = input.name ? input.name.split(" ")[0] : "there";
  
  const systemPrompt = `You are an elite B2B Cold Outreach Copywriter.
Your goal is to write a highly personalized, human cold email to ${input.name} (${input.role} at ${input.company}).

STRICT COPYWRITING RULES:
1. Be VERY CONCISE (Under 120 words total).
2. Sound like a real human writing a 1-on-1 email to a colleague.
3. NEVER use AI buzzwords or filler ("I hope this email finds you well", "In today's fast-paced landscape", "delve", "game-changer").
4. Never expose internal confidence tags or evidence IDs (do NOT write "[Verified]" or "EVD-1" in the email).
5. Pick ONLY the single strongest verified observation or commercial opportunity.
6. Make the reason for contacting clear within the first 2 sentences.
7. End with a low-friction, interest-based CTA (e.g., "Worth a brief 5-min chat next week?", "Open to taking a quick look?").`;

  const userPrompt = `Prospect Details:
- Name: ${input.name}
- Role: ${input.role || "Executive"}
- Company: ${input.company}

Verified Facts & Evidence:
${JSON.stringify(input.facts || [], null, 2)}

Website Observations:
${JSON.stringify(input.observations || [], null, 2)}

Primary Commercial Opportunities:
${JSON.stringify(input.commercialOpportunities || [], null, 2)}

Research Connection Points:
${JSON.stringify(input.researchPoints || [], null, 2)}

Generate the initial cold email and return JSON:
{
  "subject": "Short, low-friction subject line (under 6 words)",
  "body": "Hi ${firstName},\\n\\n...",
  "angle_used": "Short explanation of the commercial hook used",
  "word_count": 85
}`;

  const aiResponse = await generateStructured<EmailOutput>({
    task: "email_generation",
    leadId: input.leadId,
    systemPrompt,
    prompt: userPrompt,
  });

  if (!aiResponse.success || !aiResponse.data) {
    return aiResponse;
  }

  const validation = EmailOutputSchema.safeParse(aiResponse.data);
  if (validation.success) {
    return {
      ...aiResponse,
      data: validation.data,
    };
  }

  console.warn("Email output failed Zod validation, attempting 1 retry...", validation.error);

  const retryPrompt = `${userPrompt}\n\nEnsure valid JSON output matching subject, body, angle_used, and word_count keys.`;
  const retryResponse = await generateStructured<EmailOutput>({
    task: "email_generation_retry",
    leadId: input.leadId,
    systemPrompt,
    prompt: retryPrompt,
  });

  if (retryResponse.success && retryResponse.data) {
    const retryValidation = EmailOutputSchema.safeParse(retryResponse.data);
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
    error: `Email Zod validation failed: ${validation.error.message}`,
  };
}
