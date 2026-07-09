import { NextResponse } from "next/server";
import { getDeOrchAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const admin = getDeOrchAdminClient();
    const { data, error } = await admin
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ hasPassword: false });
    }

    const { password, ...rest } = data;
    return NextResponse.json({ ...rest, hasPassword: !!password });
  } catch (error) {
    console.error("GET /api/settings/smtp error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { host, port, username, password, from_name, from_email, secure } = body;

    if (!host || !port || !username || !from_email) {
      return NextResponse.json(
        { error: "host, port, username, and from_email are required" },
        { status: 400 }
      );
    }

    const admin = getDeOrchAdminClient();
    const { data: existing } = await admin
      .from("smtp_settings")
      .select("id, password")
      .limit(1)
      .maybeSingle();

    const payload: {
      host: string;
      port: number;
      username: string;
      from_name: string | null;
      from_email: string;
      secure: boolean;
      updated_at: string;
      password?: string;
    } = {
      host,
      port,
      username,
      from_name: from_name || null,
      from_email,
      secure: !!secure,
      updated_at: new Date().toISOString(),
    };

    // Only overwrite the stored password if a new one was actually provided,
    // so re-saving other fields never blanks it out.
    if (password && password.trim() !== "") {
      payload.password = password;
    }

    if (existing) {
      if (!existing.password && !payload.password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }
      const { error } = await admin.from("smtp_settings").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      if (!payload.password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }
      const { error } = await admin.from("smtp_settings").insert(payload);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/settings/smtp error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
