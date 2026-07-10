import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/allowedUsers";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/api/unsubscribe"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Revalidates the session against Supabase Auth (not just decoding the JWT locally),
  // and refreshes the cookie if it's about to expire.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isPublicPath(pathname)) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (!isAllowedEmail(user.email)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=access_denied", request.url));
    }
  }

  // Internal CRM tool — never let it get crawled/indexed once deployed publicly.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
