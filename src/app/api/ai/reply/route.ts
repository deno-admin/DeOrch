import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { runReplyIntelligence } from "@/lib/ai/modules/replyIntelligence";

export async function POST(request: Request) {
  try {
    const { leadId, name, role, company, replyText, originalSubject, originalBody } = await request.json();

    if (!replyText || replyText.trim() === "") {
      return NextResponse.json({ error: "replyText is required" }, { status: 400 });
    }

    const aiResponse = await runReplyIntelligence({
      leadId,
      name: name || "Prospect",
      role: role || "Lead",
      company: company || "Company",
      originalSubject,
      originalBody,
      replyText,
    });

    if (!aiResponse.success || !aiResponse.data) {
      return NextResponse.json(
        { error: aiResponse.error || "Reply intelligence execution failed" },
        { status: 500 }
      );
    }

    const analysis = aiResponse.data;
    const leadsAdmin = getLeadsAdminClient();

    // 1. Persist to deorch_reply_analysis
    if (leadId) {
      try {
        await leadsAdmin.from("deorch_reply_analysis").insert([
          {
            lead_id: leadId,
            reply_text: replyText,
            category: analysis.category,
            sentiment_context: analysis.sentiment_context,
            recommended_next_action: analysis.recommended_next_action,
            suggested_response: analysis.suggested_response,
            confidence: analysis.confidence || 0.9,
          },
        ]);
      } catch (dbErr) {
        console.warn("Could not insert into deorch_reply_analysis:", dbErr);
      }

      // 2. If category is unsubscribe, update status to Unsubscribed
      if (analysis.category === "unsubscribe") {
        await leadsAdmin
          .from("deorch_leads")
          .update({ status: "Unsubscribed" })
          .eq("id", leadId);
      } else if (analysis.category === "interested" || analysis.category === "meeting_request") {
        await leadsAdmin
          .from("deorch_leads")
          .update({ status: "Replied" })
          .eq("id", leadId);
      }
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      provider: aiResponse.provider,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs,
    });
  } catch (error: any) {
    console.error("AI Reply API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
