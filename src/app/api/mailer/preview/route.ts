import { NextResponse } from "next/server";
import { renderColdOutreachEmail } from "@/lib/coldOutreachTemplateSource";

export async function POST(request: Request) {
  try {
    const { companyName, firstName, draftText, stage } = await request.json();

    if (!draftText || typeof draftText !== "string") {
      return NextResponse.json({ error: "draftText is required" }, { status: 400 });
    }

    // Deliberately not a real token: this is a visual preview, and a live
    // unsubscribe link here would let a stray click silently unsubscribe a
    // real lead without ever sending them an email.
    const unsubscribeUrl = "javascript:void(0)";

    let html = renderColdOutreachEmail({
      companyName: companyName || "",
      firstName: firstName || "",
      draftText,
      unsubscribeUrl,
      stage: typeof stage === "string" ? stage : "initial",
    });

    // Strip open tracker placeholder from CRM preview so it is invisible to the user
    html = html.replaceAll("{{ses:openTracker}}", "");

    return NextResponse.json({ html });
  } catch (error) {
    console.error("Mailer preview route error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
