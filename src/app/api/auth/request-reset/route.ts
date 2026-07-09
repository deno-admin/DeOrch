import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getDeOrchAdminClient } from "@/lib/supabaseAdmin";
import { generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from "@/lib/resetToken";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const deOrchAdmin = getDeOrchAdminClient();

  const { data: user } = await deOrchAdmin
    .from("app_users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  // Always return the same generic response whether or not the account exists,
  // to avoid leaking which emails are registered.
  const genericResponse = NextResponse.json({
    message: "If that email has an account, a password-set link has been sent.",
  });

  if (!user) {
    return genericResponse;
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await deOrchAdmin
    .from("app_users")
    .update({ reset_token_hash: hashResetToken(token), reset_token_expires_at: expiresAt })
    .eq("id", user.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const setPasswordUrl = `${appUrl}/set-password?email=${encodeURIComponent(normalizedEmail)}&token=${token}`;

  const { data: smtpConfig } = await deOrchAdmin.from("smtp_settings").select("*").limit(1).maybeSingle();

  if (smtpConfig) {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: { user: smtpConfig.username, pass: smtpConfig.password },
    });

    try {
      const info = await transporter.sendMail({
        from: `${smtpConfig.from_name || ""} <${smtpConfig.from_email}>`.trim(),
        to: normalizedEmail,
        subject: "Set your DeOrch password",
        text: `Set your DeOrch password here (expires in 1 hour):\n\n${setPasswordUrl}\n\nIf you didn't request this, ignore this email.`,
      });
      console.log("request-reset: sendMail accepted", {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      });
    } catch (err) {
      console.error("request-reset: sendMail failed", err);
    }
  } else {
    console.error("request-reset: no smtp_settings row found — email not sent");
  }

  return genericResponse;
}
