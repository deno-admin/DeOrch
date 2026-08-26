import { NextResponse } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    const leadsAdmin = getLeadsAdminClient();
    let query = leadsAdmin
      .from("deorch_ai_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query;

    if (error) {
      // Return empty array gracefully if table doesn't exist yet
      return NextResponse.json({ activity: [] });
    }

    return NextResponse.json({ activity: data || [] });
  } catch (error: any) {
    console.error("AI Activity API Error:", error);
    return NextResponse.json({ activity: [] });
  }
}
