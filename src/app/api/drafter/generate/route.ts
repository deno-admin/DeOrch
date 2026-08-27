import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/provider";

export interface DrafterRequest {
  targetInput?: string; // Single combined input field e.g. "Sarah Jenkins, Head of Product Design at Figma"
  personName?: string;
  companyName?: string;
  position?: string;
  userPortfolio?: string;
  tone?: string;
  specialization?: string;
  customHook?: string;
}

export interface DraftedMessagesResponse {
  subjectLine: string;
  directMessage: string;
  connectionRequest: string;
  followUpMessage: string;
  valueHighlights: string[];
  tipsForSuccess: string[];
}

export async function POST(req: Request) {
  try {
    const body: DrafterRequest = await req.json();

    const {
      targetInput = "",
      personName = "",
      companyName = "",
      position = "",
      userPortfolio = "",
      tone = "Value-First & Professional",
      specialization = "UI/UX & Product Design",
      customHook = "",
    } = body;

    const rawTargetContext = targetInput.trim() || `${personName} ${position ? `- ${position}` : ""} ${companyName ? `@ ${companyName}` : ""}`.trim();

    if (!rawTargetContext) {
      return NextResponse.json(
        { error: "Please enter the target person, position, and company details." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an elite Career & Design Outreach Strategist specializing in helping UI/UX Designers land interviews and opportunities at top companies.
Your goal is to craft compelling, personalized LinkedIn outreach messages seeking a UI/UX Designer opportunity at the target company based on the provided prospect input.
You must use a high-converting, non-spammy approach that focuses on value, design craft, product intuition, and mutual benefit.

RULES & GUIDELINES:
1. Tone: ${tone}
2. Target Prospect Details: ${rawTargetContext}
3. Applicant Specialization: ${specialization}
4. Applicant Portfolio: ${userPortfolio || "Not specified (use placeholder like [Portfolio Link] if relevant)"}
5. Custom Note/Hook: ${customHook || "None provided"}

OUTPUT REQUIREMENTS (STRICT JSON):
Respond ONLY with a JSON object containing the following exact keys:
- "subjectLine": Catchy, short InMail subject line (5-8 words max, non-gimmicky).
- "directMessage": Complete LinkedIn DM / InMail (approx. 100-150 words). Address the person naturally based on the input details, mention their role/company context, articulate why the UI/UX designer admires their work or product UX, highlight key skills in ${specialization}, provide a soft call-to-action (e.g., quick 10-min portfolio review or casual design chat), and include proper portfolio link placeholders.
- "connectionRequest": Short, impact-driven LinkedIn connection request note (STRICTLY under 300 characters including spaces!).
- "followUpMessage": Polished follow-up message to send 3-5 days later if they haven't replied (50-80 words).
- "valueHighlights": Array of 3 bullet points summarizing the core value propositions emphasized in these drafts.
- "tipsForSuccess": Array of 2 actionable tips for how to send this specific message on LinkedIn to maximize reply rates.`;

    const userPrompt = `Draft LinkedIn outreach messages seeking a UI/UX Designer opportunity for the following prospect:
Target Details: "${rawTargetContext}"
Specialization: ${specialization}
Portfolio: ${userPortfolio || "Not provided"}
Tone: ${tone}
${customHook ? `Custom Hook: ${customHook}` : ""}

Ensure the message sounds human, professional, and tailored specifically for a UI/UX Designer seeking an opportunity.`;

    const result = await generateStructured<DraftedMessagesResponse>({
      task: "draft_linkedin_uiux_outreach",
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      temperature: 0.7,
      maxTokens: 1500,
    });

    if (!result.success || !result.data) {
      console.error("Drafter API generation failed:", result.error);
      return NextResponse.json(
        {
          error: result.error || "Failed to generate message using NVIDIA AI API.",
          provider: result.provider,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      provider: result.provider,
      model: result.model,
    });
  } catch (error: any) {
    console.error("Error in drafter API endpoint:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
