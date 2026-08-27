import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/provider";

export interface DrafterRequest {
  personName: string;
  companyName: string;
  position: string;
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
      personName,
      companyName,
      position,
      userPortfolio = "",
      tone = "Value-First & Professional",
      specialization = "UI/UX & Product Design",
      customHook = "",
    } = body;

    if (!personName || !companyName || !position) {
      return NextResponse.json(
        { error: "Person Name, Company Name, and Position are required fields." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an elite Career & Design Outreach Strategist specializing in helping UI/UX Designers land interviews and opportunities at top companies.
Your goal is to craft compelling, personalized LinkedIn outreach messages that seek UI/UX Designer opportunities at a target company.
You must use a high-converting, non-spammy approach that focuses on value, design craft, product intuition, and mutual benefit.

RULES & GUIDELINES:
1. Tone: ${tone}
2. Target Person: ${personName} (${position} at ${companyName})
3. Target Company: ${companyName}
4. Applicant Specialization: ${specialization}
5. Applicant Portfolio: ${userPortfolio || "Not specified (use placeholder like [Portfolio Link] if relevant)"}
6. Custom Hook/Note: ${customHook || "None provided"}

OUTPUT REQUIREMENTS (STRICT JSON):
Respond ONLY with a JSON object containing the following exact keys:
- "subjectLine": Catchy, short InMail subject line (5-8 words max, non-gimmicky).
- "directMessage": Complete LinkedIn DM / InMail (approx. 100-150 words). Must address ${personName}, mention their role as ${position} at ${companyName}, articulate why the UI/UX designer admire their work or ${companyName}'s product UX, highlight key skills in ${specialization}, provide a soft call-to-action (e.g., quick 10-min portfolio review or casual design chat), and include proper placeholders if needed.
- "connectionRequest": Short, impact-driven LinkedIn connection request note (STRICTLY under 300 characters including spaces!).
- "followUpMessage": Polished follow-up message to send 3-5 days later if they haven't replied (50-80 words).
- "valueHighlights": Array of 3 bullet points summarizing the core value propositions emphasized in these drafts.
- "tipsForSuccess": Array of 2 actionable tips for how to send this specific message on LinkedIn to maximize reply rates.`;

    const userPrompt = `Draft LinkedIn outreach messages seeking a UI/UX Designer opportunity for:
- Contact Name: ${personName}
- Role/Position: ${position}
- Company: ${companyName}
- Specialization: ${specialization}
- Portfolio: ${userPortfolio}
- Tone: ${tone}
${customHook ? `- Custom context/hook: ${customHook}` : ""}

Ensure the message is tailored specifically to a UI/UX designer reaching out to ${personName} at ${companyName}.`;

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
