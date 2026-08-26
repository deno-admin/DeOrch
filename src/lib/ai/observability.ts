import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { AIResponse } from "./types";

export async function logAIActivity(
  task: string,
  response: AIResponse<any>,
  leadId?: number,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const supabase = getLeadsAdminClient();
    await supabase.from("deorch_ai_activity").insert([
      {
        lead_id: leadId || null,
        provider: response.provider,
        model: response.model,
        task: task,
        status: response.success ? "success" : "error",
        prompt_tokens: response.promptTokens || 0,
        completion_tokens: response.completionTokens || 0,
        latency_ms: response.latencyMs || 0,
        error_message: response.error || null,
        metadata: metadata || {},
      },
    ]);
  } catch (err) {
    console.error("Failed to write to deorch_ai_activity table:", err);
  }
}
