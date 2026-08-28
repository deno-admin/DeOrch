import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/provider";

export interface DrafterRequest {
  targetInput?: string; // e.g. "Nikunj, Founder & Product Lead at Asymmetric Labs" or "Careers Team at Predigle"
  personName?: string;
  companyName?: string;
  position?: string;
  userPortfolio?: string;
  tone?: string;
  specialization?: string;
  customHook?: string;
  draftType?: "initial" | "connection" | "followup";
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
      userPortfolio = "https://kumaraguru-dk.framer.website/",
      tone = "Direct & Punchy",
      specialization = "UI/UX Designer",
      customHook = "",
      draftType = "initial",
    } = body;

    const rawTargetContext = targetInput.trim() || `${personName} ${position ? `- ${position}` : ""} ${companyName ? `@ ${companyName}` : ""}`.trim();

    if (!rawTargetContext) {
      return NextResponse.json(
        { error: "Please enter the target person, position, and company details." },
        { status: 400 }
      );
    }

    const portfolioUrl = userPortfolio.trim() || "https://kumaraguru-dk.framer.website/";

    const systemPrompt = `You are an elite B2B Outreach Strategist writing concise, human, non-AI-sounding job application & outreach drafts for **Kumaragurubaran Karthikeyan**.

CANDIDATE MASTER PROFILE:
- Full Name: Kumaragurubaran Karthikeyan
- Current Role: User Experience Designer at Denovation (Sep 2025 - Present) — digital products & brand experiences (Denovation, Shifa & Smiles, Kalappai, Chameo, FaireLux).
- Previous Role: UI/UX Design Intern at Vorreix (Jun 2025 - Sep 2025) — founding UI/UX designer for vorrei.io multi-organization SaaS platform.
- Education: B.E. Computer Science and Engineering.
- Portfolio: ${portfolioUrl}
- Contact Phone: +91 8925161453
- Key Rule: NEVER mention Kovan Labs under any circumstances!

COPYWRITING RULES:
1. Tone: ${tone} (Be direct, concise, natural, sound like 1-on-1 human communication).
2. Avoid AI filler/buzzwords ("hope this email finds you well", "delve", "game-changer", "thrilled to express my interest", "esteemed organization").
3. Outreach Focus: ${specialization}
4. Primary Target Context: "${rawTargetContext}"
5. Custom Note / Hook: ${customHook || "None provided"}
6. Primary Output Focus: ${draftType} (make sure ${draftType} draft is top priority and pitch-perfect).

OUTPUT REQUIREMENTS (STRICT JSON ONLY, KEEP CONCISE FOR SPEED):
Return JSON object with keys:
- "subjectLine": Short, crisp subject line (4-7 words, e.g., "UI/UX Designer Application - Kumaragurubaran").
- "directMessage": Complete initial application email or InMail DM (approx 80-120 words). Mentions role/company context, current Denovation & Vorreix SaaS experience, portfolio link (${portfolioUrl}), and phone number +91 8925161453.
- "connectionRequest": Short LinkedIn connection note (STRICTLY under 220 characters including portfolio link!).
- "followUpMessage": Polished 2-3 sentence follow-up message (40-70 words).
- "valueHighlights": Array of 3 concise bullet points highlighting key matching qualifications.
- "tipsForSuccess": Array of 2 quick actionable sending tips.`;

    const userPrompt = `Draft outreach messages for Kumaragurubaran Karthikeyan:
- Target Prospect/Role: "${rawTargetContext}"
- Focus: ${specialization}
- Primary Draft Type: ${draftType}
- Tone: ${tone}
- Portfolio: ${portfolioUrl}
${customHook ? `- Custom Hook: ${customHook}` : ""}

Keep the response direct, natural, and fast.`;

    const result = await generateStructured<DraftedMessagesResponse>({
      task: "draft_linkedin_uiux_outreach",
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      temperature: 0.3, // Lower temperature for faster, deterministic execution
      maxTokens: 900,  // Reduced maxTokens for much faster NVIDIA API response times
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
