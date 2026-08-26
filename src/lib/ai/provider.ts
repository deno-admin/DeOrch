import { AIOptions, AIResponse, AIStructuredOptions } from "./types";
import { callNVIDIAProvider } from "./nvidiaProvider";
import { callGeminiProvider } from "./geminiProvider";
import { logAIActivity } from "./observability";

export async function generateText(options: AIOptions): Promise<AIResponse<string>> {
  const configuredProvider = (process.env.AI_PROVIDER || "nvidia").toLowerCase();

  let response: AIResponse<string>;

  if (configuredProvider === "nvidia") {
    response = await callNVIDIAProvider(options);
    // If NVIDIA fails, fallback to Gemini if API key is present
    if (!response.success && (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)) {
      console.warn("NVIDIA provider failed. Falling back to Gemini provider...", response.error);
      const fallbackResponse = await callGeminiProvider(options);
      if (fallbackResponse.success) {
        response = fallbackResponse;
      }
    }
  } else {
    response = await callGeminiProvider(options);
    // If Gemini fails, fallback to NVIDIA if key present
    if (!response.success && process.env.NVIDIA_API_KEY) {
      console.warn("Gemini provider failed. Falling back to NVIDIA provider...", response.error);
      const fallbackResponse = await callNVIDIAProvider(options);
      if (fallbackResponse.success) {
        response = fallbackResponse;
      }
    }
  }

  // Log activity
  if (options.task) {
    await logAIActivity(options.task, response, options.leadId);
  }

  return response;
}

export async function generateStructured<T = any>(
  options: AIStructuredOptions<T>
): Promise<AIResponse<T>> {
  const jsonSystemPrompt = `${options.systemPrompt || "You are an expert AI assistant."}
IMPORTANT REQUIREMENT: You MUST respond ONLY with a single valid, well-formed JSON object matching the requested schema. 
Do NOT include markdown formatting, code block backticks (like \`\`\`json), or conversational filler before or after the JSON.
Strictly ensure all strings are properly escaped and property key names match the requested JSON keys.`;

  const textOptions: AIOptions = {
    ...options,
    systemPrompt: jsonSystemPrompt,
  };

  const textResponse = await generateText(textOptions);

  if (!textResponse.success) {
    return {
      ...textResponse,
      data: null as any,
    };
  }

  try {
    let cleanJsonStr = textResponse.rawText.trim();
    // Strip markdown code fences if model output wrapped it in ```json ... ```
    if (cleanJsonStr.startsWith("```")) {
      cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    const parsedData = JSON.parse(cleanJsonStr) as T;
    return {
      ...textResponse,
      data: parsedData,
    };
  } catch (parseError: any) {
    console.error("Failed to parse JSON response from AI provider:", parseError, textResponse.rawText);
    return {
      ...textResponse,
      data: null as any,
      success: false,
      error: `JSON parse error: ${parseError.message}`,
    };
  }
}

export async function analyze<T = any>(
  task: string,
  inputData: any,
  systemInstruction?: string,
  leadId?: number
): Promise<AIResponse<T>> {
  const prompt = typeof inputData === "string" ? inputData : JSON.stringify(inputData, null, 2);
  return generateStructured<T>({
    task,
    leadId,
    prompt,
    systemPrompt: systemInstruction,
  });
}

export async function classify(
  input: string,
  categories: string[],
  leadId?: number
): Promise<AIResponse<{ category: string; confidence: number; reasoning: string }>> {
  const prompt = `Classify the following text into exactly ONE of these categories: ${JSON.stringify(categories)}.
Text to classify:
"""
${input}
"""

Return JSON with keys:
- "category": exact string matching one of the categories
- "confidence": float between 0.0 and 1.0
- "reasoning": short 1-sentence explanation of why`;

  return generateStructured<{ category: string; confidence: number; reasoning: string }>({
    task: "classify",
    leadId,
    prompt,
    systemPrompt: "You are a high-precision categorization assistant.",
  });
}
