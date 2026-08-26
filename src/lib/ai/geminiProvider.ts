import { AIOptions, AIResponse } from "./types";

export async function callGeminiProvider(options: AIOptions): Promise<AIResponse<string>> {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.AI_API_KEY;
  const model = options.model || (process.env.AI_PROVIDER === "gemini" ? process.env.AI_MODEL : null) || "gemini-2.5-flash";

  if (!apiKey) {
    return {
      data: "",
      rawText: "",
      provider: "gemini",
      model,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      error: "GEMINI_API_KEY is not configured",
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    
    let promptText = options.prompt;
    if (options.systemPrompt) {
      promptText = `${options.systemPrompt}\n\n${options.prompt}`;
    }

    const requestBody: any = {
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      // Try fallback to gemini-1.5-flash if 2.5 fails
      if (model !== "gemini-1.5-flash") {
        console.warn(`Gemini model ${model} failed, trying fallback to gemini-1.5-flash...`);
        return callGeminiProvider({ ...options, model: "gemini-1.5-flash" });
      }
      return {
        data: "",
        rawText: "",
        provider: "gemini",
        model,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs,
        success: false,
        error: `Gemini API error status ${response.status}: ${errText}`,
      };
    }

    const resJson = await response.json();
    const content = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    const promptTokens = resJson.usageMetadata?.promptTokenCount || 0;
    const completionTokens = resJson.usageMetadata?.candidatesTokenCount || 0;

    return {
      data: content.trim(),
      rawText: content.trim(),
      provider: "gemini",
      model,
      promptTokens,
      completionTokens,
      latencyMs,
      success: true
    };

  } catch (err: any) {
    return {
      data: "",
      rawText: "",
      provider: "gemini",
      model,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      error: err.message || "Failed to communicate with Gemini API",
    };
  }
}
