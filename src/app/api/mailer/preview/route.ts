import { NextResponse } from "next/server";
import { renderColdOutreachEmail } from "@/lib/coldOutreachTemplateSource";
import { generateUnsubscribeToken } from "@/lib/unsubscribeToken";

export async function POST(request: Request) {
  try {
    const { companyName, firstName, draftText, leadId } = await request.json();

    if (!draftText || typeof draftText !== "string") {
      return NextResponse.json({ error: "draftText is required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const unsubscribeUrl = leadId
      ? `${appUrl}/api/unsubscribe?id=${leadId}&token=${generateUnsubscribeToken(leadId)}`
      : "#";

    const html = renderColdOutreachEmail({
      companyName: companyName || "",
      firstName: firstName || "",
      draftText,
      unsubscribeUrl,
    });

    return NextResponse.json({ html });
  } catch (error) {
    console.error("Mailer preview route error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
