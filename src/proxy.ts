import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSessionValid, SESSION_COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/login",
  "/set-password",
  "/api/login",
  "/api/unsubscribe",
  "/api/auth/request-reset",
  "/api/auth/set-password",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = isPublicPath(pathname) || isSessionValid(request.cookies.get(SESSION_COOKIE_NAME)?.value)
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/login", request.url));

  // Internal CRM tool — never let it get crawled/indexed once deployed publicly.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
