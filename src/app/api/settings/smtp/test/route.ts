import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDeOrchAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sendTestTo: string | undefined = body?.sendTestTo;
    const id: number | undefined = body?.id;

    const admin = getDeOrchAdminClient();
    let config: any = null;

    if (id) {
      const { data, error } = await admin
        .from("smtp_settings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: "SMTP configuration not found." }, { status: 400 });
      }
      config = data;
    } else {
      const { data, error } = await admin
        .from("smtp_settings")
        .select("*");

      if (error || !data || data.length === 0) {
        return NextResponse.json({ error: "SMTP not configured yet." }, { status: 400 });
      }

      // Find the active one or fallback to the first
      config = data.find((c: any) => c.username.endsWith("::active")) || data[0];
    }

    const cleanUsername = config.username.replace(/::active$/, "");

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: cleanUsername,
        pass: config.password,
      },
    });

    try {
      await transporter.verify();
    } catch (verifyError) {
      const message = verifyError instanceof Error ? verifyError.message : "Connection failed";
      return NextResponse.json({ verified: false, error: message }, { status: 200 });
    }

    if (!sendTestTo) {
      return NextResponse.json({ verified: true });
    }

    try {
      await transporter.sendMail({
        from: `${config.from_name || ""} <${config.from_email}>`.trim(),
        to: sendTestTo,
        subject: "DeOrch SMTP Test",
        text: "This is a test email from your DeOrch Mailer settings. If you're reading this, your SMTP connection works.",
      });
      return NextResponse.json({ verified: true, sent: true });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Send failed";
      return NextResponse.json({ verified: true, sent: false, error: message });
    }
  } catch (error) {
    console.error("SMTP test route error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
