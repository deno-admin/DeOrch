import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai/provider";
import { parseCandidatesFromText, ParsedCandidate } from "@/lib/scraper/candidateScraper";

export interface ScraperParseRequest {
  rawText: string;
}

export interface ScraperParseResponse {
  candidates: ParsedCandidate[];
}

export async function POST(req: Request) {
  try {
    const body: ScraperParseRequest = await req.json();
    const { rawText = "" } = body;

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Please provide raw text to parse." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert LinkedIn search & candidate profile scraper data parser.
Your task is to parse raw text copied from LinkedIn search result pages, screen reader dumps, or profile listings, and extract up to 10 individual candidate profiles.

For each candidate, extract:
- "name": Full name of the candidate (clean string, remove connection badges like "· 1st", "· 2nd", "3rd+").
- "role": Job title / position (e.g. "UI/UX Designer", "Product Designer", "Founder & Lead").
- "company": Organization / Company name (e.g. "Xtech Code", "Denovation", "Figma").
- "headline": Brief headline or current summary.
- "formattedTarget": Full clean string formatted as "Name, Role at Company" (e.g. "Karan Mukkarji, UI/UX Designer at Xtech Code").

CRITICAL RULES:
- Limit to a maximum of 10 candidates.
- If role or company is ambiguous, infer the most accurate role and company from the candidate's headline or context.
- Output ONLY valid JSON containing a key "candidates" with an array of objects.`;

    const userPrompt = `Extract up to 10 candidates from this raw text into structured JSON:

"""
${rawText.slice(0, 4000)}
"""`;

    const result = await generateStructured<ScraperParseResponse>({
      task: "parse_linkedin_candidates_json",
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      temperature: 0.1, // High precision, low temperature
      maxTokens: 1000,
    });

    if (result.success && result.data && Array.isArray(result.data.candidates) && result.data.candidates.length > 0) {
      const candidates = result.data.candidates.map((c, idx) => ({
        id: c.id || `ai_cand_${Date.now()}_${idx}`,
        name: c.name || "Candidate",
        role: c.role || "Designer",
        company: c.company || "Company",
        headline: c.headline || `${c.role || "Designer"} at ${c.company || "Company"}`,
        formattedTarget: c.formattedTarget || `${c.name || "Candidate"}, ${c.role || "Designer"} at ${c.company || "Company"}`,
      }));

      return NextResponse.json({
        success: true,
        candidates,
        provider: result.provider,
      });
    }

    // Fallback to local regex scraper if AI output is empty or failed
    console.warn("AI parsing yielded no candidates or failed. Utilizing fallback regex parser...");
    const fallbackCandidates = parseCandidatesFromText(rawText);

    return NextResponse.json({
      success: true,
      candidates: fallbackCandidates,
      provider: "regex_fallback",
    });
  } catch (error: any) {
    console.error("Error in scraper parse API route:", error);

    // Fallback to regex parser on exception
    try {
      const body = await req.clone().json();
      const fallbackCandidates = parseCandidatesFromText(body.rawText || "");
      return NextResponse.json({
        success: true,
        candidates: fallbackCandidates,
        provider: "regex_fallback_error",
      });
    } catch {
      return NextResponse.json(
        { error: error.message || "Failed to parse candidates." },
        { status: 500 }
      );
    }
  }
}
