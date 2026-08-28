import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/provider";
import fs from "fs";
import path from "path";

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

    // Resolve path to the UI/UX job application drafting memory file
    const memoryFilePath = path.join(
      process.cwd(),
      "src",
      "app",
      "api",
      "drafter",
      "generate",
      "uiux_job_application_drafting_memory (1).md"
    );

    let draftingMemory = "";
    try {
      if (fs.existsSync(memoryFilePath)) {
        draftingMemory = fs.readFileSync(memoryFilePath, "utf8");
      } else {
        console.warn(`Drafting memory file not found at: ${memoryFilePath}`);
      }
    } catch (error) {
      console.error("Failed to read drafting memory file:", error);
    }

    const systemPrompt = `You are an elite B2B Outreach Strategist writing concise, human, non-AI-sounding job application & outreach drafts for **Kumaragurubaran Karthikeyan**.

Use the UI/UX Job Application Drafting Memory below as the absolute source of truth for candidate details, experience, skills, style, and constraints:

=== START DRAFTING MEMORY ===
${draftingMemory || `
CANDIDATE MASTER PROFILE:
- Full Name: Kumaragurubaran Karthikeyan
- Current Role: User Experience Designer at Denovation (Sep 2025 - Present) — digital products & brand experiences (Denovation, Shifa & Smiles, Kalappai, Chameo, FaireLux).
- Previous Role: UI/UX Design Intern at Vorreix (Jun 2025 - Sep 2025) — founding UI/UX designer for vorrei.io multi-organization SaaS platform.
- Education: B.E. Computer Science and Engineering.
- Portfolio: https://kumaraguru-dk.framer.website/
- Contact Phone: +91 8925161453
- Key Rule: NEVER mention Kovan Labs under any circumstances!
`}
=== END DRAFTING MEMORY ===

ADDITIONAL CUSTOM CONTEXT & CONSTRAINTS:
1. Tone: ${tone} (Ensure the generated output matches this tone while strictly respecting the style guidelines in the Drafting Memory).
2. Outreach Focus / Specialization: ${specialization}
3. Primary Target Context: "${rawTargetContext}"
4. Custom Note / Hook: ${customHook || "None provided"}
5. Portfolio: ${portfolioUrl}
6. Primary Output Focus: ${draftType} (make sure ${draftType} draft is top priority and pitch-perfect).

CRITICAL CONSTRAINTS:
- NEVER mention "Kovan Labs".
- NEVER invent or exaggerate experience, salary, metrics, responsibilities, technologies, project outcomes, or company details.
- Avoid all AI-sounding filler/buzzwords listed under Section 20 ("No AI Touch" Rules) of the Drafting Memory, e.g. "I am thrilled to express my interest...", "I am deeply passionate about...", "Your esteemed organization...", etc. Use straightforward, human-like sentences.
- Ensure that the "directMessage" uses the style, structure, and tone matching the email examples in Section 17 of the Drafting Memory.
- Ensure that the "connectionRequest" is a short LinkedIn connection note that is STRICTLY under 220 characters (including the portfolio link).
- The output MUST be valid JSON with the requested keys.

OUTPUT REQUIREMENTS (STRICT JSON ONLY):
Return a JSON object with the following keys:
- "subjectLine": Short, crisp subject line (4-7 words, e.g. "UI/UX Designer Application - Kumaragurubaran" or job/target specific example from Section 6).
- "directMessage": Complete initial application email or InMail DM (approx 80-120 words). It must personalize around 2-3 genuine matches between the job requirements (from the target context) and candidate's experience. It should include the portfolio link (${portfolioUrl}) and phone number (+91 8925161453) naturally if appropriate, following the examples in Section 17.
- "connectionRequest": Short LinkedIn connection note (STRICTLY under 220 characters including portfolio link!).
- "followUpMessage": Polished 2-3 sentence follow-up message (40-70 words) following the examples in Section 18.
- "valueHighlights": Array of 3 concise bullet points highlighting key matching qualifications of the candidate for this specific target.
- "tipsForSuccess": Array of 2 quick actionable sending tips tailored to this outreach.`;

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
