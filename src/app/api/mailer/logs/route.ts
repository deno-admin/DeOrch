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
    const { data: logs, error } = await adminClient
      .from("email_logs")
      .select("*")
      .eq("lead_id", leadId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching email logs:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error("Error in mailer/logs API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
