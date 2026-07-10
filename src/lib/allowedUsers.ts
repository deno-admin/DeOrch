export const ALLOWED_EMAILS = ["kumaragurubaran1710@gmail.com"];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}
