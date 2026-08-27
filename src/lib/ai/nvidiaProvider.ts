import { AIOptions, AIResponse } from "./types";

export async function callNVIDIAProvider(options: AIOptions): Promise<AIResponse<string>> {
  const startTime = Date.now();
  const apiKey = process.env.NVIDIA_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const model = options.model || process.env.NVIDIA_MODEL || process.env.AI_MODEL || "meta/llama-3.1-70b-instruct";

  if (!apiKey) {
    return {
      data: "",
      rawText: "",
      provider: "nvidia",
      model,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      error: "NVIDIA_API_KEY is not configured",
    };
  }

  try {
    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: options.prompt });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4096,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return {
        data: "",
        rawText: "",
        provider: "nvidia",
        model,
        promptTokens: 0,
        completionTokens: 0,
        latencyMs,
        success: false,
        error: `NVIDIA API error status ${response.status}: ${errText}`,
      };
    }

    const resJson = await response.json();
    let content = resJson.choices?.[0]?.message?.content || "";

    // If deepseek-r1 contains reasoning <think> tags, strip them or clean up output
    if (content.includes("</think>")) {
      content = content.split("</think>").pop()?.trim() || content;
    }

    const promptTokens = resJson.usage?.prompt_tokens || 0;
    const completionTokens = resJson.usage?.completion_tokens || 0;

    return {
      data: content.trim(),
      rawText: content.trim(),
      provider: "nvidia",
      model,
      promptTokens,
      completionTokens,
      latencyMs,
      success: true,
    };
  } catch (err: any) {
    return {
      data: "",
      rawText: "",
      provider: "nvidia",
      model,
      promptTokens: 0,
      completionTokens: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      error: err.message || "Failed to communicate with NVIDIA API",
    };
  }
}
