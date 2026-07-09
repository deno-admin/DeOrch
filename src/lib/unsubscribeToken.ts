import crypto from "crypto";

function timingSafeEqualStrings(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function generateUnsubscribeToken(leadId: number): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return crypto.createHmac("sha256", secret).update(String(leadId)).digest("hex");
}

export function verifyUnsubscribeToken(leadId: number, token: string): boolean {
  if (!token) return false;
  return timingSafeEqualStrings(token, generateUnsubscribeToken(leadId));
}
