import { NextResponse } from "next/server";
import { getDeOrchAdminClient } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const admin = getDeOrchAdminClient();
    const { data, error } = await admin
      .from("smtp_settings")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json([]);
    }

    const mapped = data.map((item) => {
      const { password, username, ...rest } = item;
      const isActive = username.endsWith("::active");
      const cleanUsername = username.replace(/::active$/, "");
      return {
        ...rest,
        username: cleanUsername,
        isActive,
        hasPassword: !!password,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/settings/smtp error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, host, port, username, password, from_name, from_email, secure } = body;

    if (!host || !port || !username || !from_email) {
      return NextResponse.json(
        { error: "host, port, username, and from_email are required" },
        { status: 400 }
      );
    }

    const admin = getDeOrchAdminClient();

    // Check existing SMTP configurations to determine active state rules
    const { data: existingConfigs, error: fetchErr } = await admin
      .from("smtp_settings")
      .select("id, username, password");

    if (fetchErr) throw fetchErr;

    const hasAnyActive = existingConfigs?.some(cfg => cfg.username.endsWith("::active"));
    
    // We make it active if there are no existing active configs, or if this is the first config
    let finalUsername = username;

    if (id) {
      // Editing existing
      const existing = existingConfigs?.find(c => c.id === id);
      if (!existing) {
        return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
      }

      // Preserve active status if it was active
      const wasActive = existing.username.endsWith("::active");
      if (wasActive || (!hasAnyActive && existingConfigs?.length === 1)) {
        if (!finalUsername.endsWith("::active")) {
          finalUsername += "::active";
        }
      }

      const payload: Record<string, any> = {
        host,
        port: Number(port),
        username: finalUsername,
        from_name: from_name || null,
        from_email,
        secure: !!secure,
        updated_at: new Date().toISOString(),
      };

      if (password && password.trim() !== "") {
        payload.password = password;
      } else if (!existing.password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      const { error: updateErr } = await admin
        .from("smtp_settings")
        .update(payload)
        .eq("id", id);

      if (updateErr) throw updateErr;
    } else {
      // Creating new
      const shouldBeActive = !hasAnyActive || !existingConfigs || existingConfigs.length === 0;
      if (shouldBeActive && !finalUsername.endsWith("::active")) {
        finalUsername += "::active";
      }

      if (!password || password.trim() === "") {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      const payload = {
        host,
        port: Number(port),
        username: finalUsername,
        password,
        from_name: from_name || null,
        from_email,
        secure: !!secure,
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await admin
        .from("smtp_settings")
        .insert(payload);

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/settings/smtp error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "Configuration ID is required" }, { status: 400 });
    }

    const id = Number(idStr);
    const admin = getDeOrchAdminClient();

    // Get existing config to check if we are deleting the active one
    const { data: configs, error: fetchErr } = await admin
      .from("smtp_settings")
      .select("id, username")
      .order("id", { ascending: true });

    if (fetchErr) throw fetchErr;

    const targetConfig = configs?.find(c => c.id === id);
    if (!targetConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    const isDeletingActive = targetConfig.username.endsWith("::active");

    // Delete
    const { error: deleteErr } = await admin
      .from("smtp_settings")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    // If we deleted the active config, find another one to activate
    if (isDeletingActive && configs && configs.length > 1) {
      const nextActive = configs.find(c => c.id !== id);
      if (nextActive) {
        let newUsername = nextActive.username;
        if (!newUsername.endsWith("::active")) {
          newUsername += "::active";
        }
        await admin
          .from("smtp_settings")
          .update({ username: newUsername })
          .eq("id", nextActive.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settings/smtp error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
