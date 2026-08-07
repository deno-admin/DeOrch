import { NextResponse } from "next/server";
import { getDeOrchAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Configuration ID is required" }, { status: 400 });
    }

    const admin = getDeOrchAdminClient();

    // Fetch all SMTP configurations
    const { data: configs, error: fetchErr } = await admin
      .from("smtp_settings")
      .select("id, username")
      .order("id", { ascending: true });

    if (fetchErr) throw fetchErr;

    if (!configs || configs.length === 0) {
      return NextResponse.json({ error: "No SMTP configurations found" }, { status: 404 });
    }

    const targetConfig = configs.find(c => c.id === id);
    if (!targetConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // Update all configurations' active states
    for (const config of configs) {
      const isTarget = config.id === id;
      const endsWithActive = config.username.endsWith("::active");

      let updatedUsername = config.username;
      let needsUpdate = false;

      if (isTarget && !endsWithActive) {
        updatedUsername += "::active";
        needsUpdate = true;
      } else if (!isTarget && endsWithActive) {
        updatedUsername = config.username.replace(/::active$/, "");
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error: updateErr } = await admin
          .from("smtp_settings")
          .update({ username: updatedUsername })
          .eq("id", config.id);

        if (updateErr) throw updateErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/settings/smtp/select error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
