import { NextResponse } from "next/server";
import { getDeOrchAdminClient } from "@/lib/supabaseAdmin";
import { hashResetToken, timingSafeEqualStrings } from "@/lib/resetToken";
import { hashPassword } from "@/lib/passwordHash";

export async function POST(request: Request) {
  const { email, token, password } = await request.json();

  if (
    typeof email !== "string" ||
    typeof token !== "string" ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return NextResponse.json(
      { error: "Email, token, and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  const deOrchAdmin = getDeOrchAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  const { data: user } = await deOrchAdmin
    .from("app_users")
    .select("id, reset_token_hash, reset_token_expires_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  const invalid = NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });

  if (!user || !user.reset_token_hash || !user.reset_token_expires_at) return invalid;
  if (new Date(user.reset_token_expires_at).getTime() < Date.now()) return invalid;
  if (!timingSafeEqualStrings(hashResetToken(token), user.reset_token_hash)) return invalid;

  await deOrchAdmin
    .from("app_users")
    .update({
      password_hash: hashPassword(password),
      reset_token_hash: null,
      reset_token_expires_at: null,
    })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
