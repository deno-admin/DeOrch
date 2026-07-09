import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDeOrchAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sendTestTo: string | undefined = body?.sendTestTo;

    const admin = getDeOrchAdminClient();
    const { data: config, error } = await admin
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error || !config) {
      return NextResponse.json({ error: "SMTP not configured yet." }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
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
