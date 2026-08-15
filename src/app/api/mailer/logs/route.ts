import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId parameter" }, { status: 400 });
    }

    const adminClient = getLeadsAdminClient();

    // 1. Fetch email logs
    const { data: logs, error: logsError } = await adminClient
      .from("email_logs")
      .select("*")
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false });

    if (logsError) {
      console.error("Error fetching email logs:", logsError);
      return NextResponse.json({ error: logsError.message }, { status: 500 });
    }

    // 2. Fetch chronological event history for all returned logs
    let debugHistory = null;
    let debugHistoryError = null;

    if (logs && logs.length > 0) {
      const logIds = logs.map(log => log.id);
      const { data: history, error: historyError } = await adminClient
        .from("email_event_history")
        .select("*")
        .in("email_log_id", logIds)
        .order("event_timestamp", { ascending: true });

      debugHistory = history;
      debugHistoryError = historyError;

      if (historyError) {
        console.error("Error fetching email event history:", historyError);
      } else if (history) {
        // Group history events by email_log_id
        const historyMap: Record<number, any[]> = {};
        history.forEach((event: any) => {
          if (!historyMap[event.email_log_id]) {
            historyMap[event.email_log_id] = [];
          }
          historyMap[event.email_log_id].push(event);
        });

        // Attach event history list to each log
        logs.forEach(log => {
          log.email_event_history = historyMap[log.id] || [];
        });
      }
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("Error in mailer/logs API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
