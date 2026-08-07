import { NextResponse, after } from "next/server";
import { getLeadsAdminClient } from "@/lib/supabaseAdmin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";

function confirmationPage(message: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center; color: #222;">
<h1 style="font-size: 20px;">${message}</h1>
</body></html>`;
}

async function unsubscribe(request: Request) {
  const { searchParams } = new URL(request.url);
  const idParam = searchParams.get("id");
  const token = searchParams.get("token") || "";
  const leadId = Number(idParam);

  if (!idParam || !Number.isInteger(leadId) || !verifyUnsubscribeToken(leadId, token)) {
    return new NextResponse(confirmationPage("Invalid or expired unsubscribe link."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  // Send the confirmation page immediately and do the DB write after the
  // response is flushed. Analytics showed this route had the worst LCP of
  // any page on the site (P90 17.5s, P99 37s, 36% "poor") because the browser
  // was blocked on the Supabase round-trip before anything could paint.
  after(async () => {
    const leadsAdmin = getLeadsAdminClient();
    const { error } = await leadsAdmin
      .from("deorch_leads")
      .update({ status: "Unsubscribed" })
      .eq("id", leadId);
    if (error) console.error("unsubscribe: failed to update lead status", leadId, error);
  });

  return new NextResponse(confirmationPage("You've been unsubscribed and won't receive further emails from us."), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

// One-click link clicked in a browser
export async function GET(request: Request) {
  return unsubscribe(request);
}

// RFC 8058 one-click: mail providers (Gmail/Yahoo) POST here automatically
// when List-Unsubscribe-Post is present, with no user interaction required.
export async function POST(request: Request) {
  return unsubscribe(request);
}
