import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/provider";

export interface DrafterRequest {
  targetInput?: string; // e.g. "Nikunj, Founder at Asymmetric Labs" or "Sarah Jenkins, Head of Product Design at Figma"
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
      userPortfolio = "https://kumaraguru-dk.framer.website/",
      tone = "Value-First & Professional",
      specialization = "UX Engineer & Product Design (UI/UX + Frontend Bridge)",
      customHook = "",
    } = body;

    const rawTargetContext = targetInput.trim() || `${personName} ${position ? `- ${position}` : ""} ${companyName ? `@ ${companyName}` : ""}`.trim();

    if (!rawTargetContext) {
      return NextResponse.json(
        { error: "Please enter the target person, position, and company details." },
        { status: 400 }
      );
    }

    const portfolioUrl = userPortfolio.trim() || "https://kumaraguru-dk.framer.website/";

    const systemPrompt = `You are an elite Career & Design Outreach Strategist drafting tailored LinkedIn outreach messages for **Kumaragurubaran K**, a User Experience Designer and UX Engineer seeking UI/UX, Product Designer, or UX Engineer opportunities at target companies.

APPLICANT MASTER PROFILE (KUMARAGURUBARAN K):
- Full Name: Kumaragurubaran K
- Core Positioning: UX Engineer & Product Designer who bridges UI/UX design and frontend development (Figma, Framer, React, Next.js, Tailwind CSS, HTML/CSS/JS).
- Current Role: User Experience Designer at Denovation (Sep 2025 - Present) leading UX/UI design for digital products & brands (Denovation, Shifa & Smiles, Kalappai, Chameo, FaireLux).
- Previous Experience: UI/UX Designer Intern at VorreiX (Jun 2025 - Sep 2025) working on Vorrei.io SaaS product — simplifying complex operational workflows, information hierarchy, dashboards, user flows, and reusable component systems.
- Education: B.E. Computer Science and Engineering (2021-2025).
- Portfolio URL: ${portfolioUrl}
- Contact Phone: +91 8925161453
- Key Strength: "Turning complex workflows into simple, development-ready digital experiences. Bridges the gap between design craft and developer handoff."

STRICT RULES & CONSTRAINTS:
1. NEVER mention "Kovan Labs" under any circumstances.
2. Ensure the messages sound authentic, human, concise, and non-spammy.
3. Automatically reference or seamlessly integrate Kumaragurubaran's real experience (Denovation / VorreiX SaaS / design-development bridge) when relevant to the prospect's company.
4. Always include his real portfolio link (${portfolioUrl}) naturally in the message.
5. Adhere to the selected tone: ${tone}
6. Selected Specialization Focus: ${specialization}
7. Custom Hook/Note: ${customHook || "None provided"}

OUTPUT REQUIREMENTS (STRICT JSON):
Respond ONLY with a JSON object containing the following exact keys:
- "subjectLine": Catchy, non-gimmicky InMail subject line (5-8 words max, e.g. "UI/UX Designer & UX Engineer - Application & Portfolio").
- "directMessage": Complete, polished LinkedIn DM / InMail (approx. 100-140 words). Written from Kumaragurubaran K's perspective to the target prospect ("${rawTargetContext}"). Naturally references his current UX work at Denovation, SaaS workflow experience at VorreiX, development-ready UI/UX background, includes his portfolio link (${portfolioUrl}), and ends with a friendly low-friction CTA (e.g. quick 10-min portfolio review or casual chat).
- "connectionRequest": Short, high-impact LinkedIn connection request note (STRICTLY under 280 characters including spaces and link!).
- "followUpMessage": Polished follow-up message to send 3-5 days later if they haven't replied (50-80 words).
- "valueHighlights": Array of 3 bullet points summarizing the core value hooks used in these drafts for Kumaragurubaran.
- "tipsForSuccess": Array of 2 actionable tips for sending this specific message on LinkedIn to maximize reply rates.`;

    const userPrompt = `Draft personalized LinkedIn outreach messages for Kumaragurubaran K seeking a UI/UX / Product Design / UX Engineer opportunity:
Target Prospect & Role: "${rawTargetContext}"
Specialization Focus: ${specialization}
Portfolio: ${portfolioUrl}
Tone: ${tone}
${customHook ? `Custom Hook / Observation: ${customHook}` : ""}

Ensure the draft reflects Kumaragurubaran K's master summary background, SaaS workflow experience, and development-ready design skills.`;

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
