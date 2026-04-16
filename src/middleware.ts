import { NextRequest, NextResponse } from "next/server";

// Middleware only handles the subscription redirect guard.
// Auth redirect (no session → /login) stays in layout.tsx.
// This runs before layout so we can safely read the pathname.

const SUBSCRIPTION_PAGE = "/dashboard/subscription";
const ADMIN_EMAIL = "hareselimovic@gmail.com";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Only guard dashboard routes (except the subscription page itself)
  if (
    !pathname.startsWith("/dashboard") ||
    pathname.startsWith(SUBSCRIPTION_PAGE)
  ) {
    return NextResponse.next();
  }

  // Read session cookie — Better Auth uses "better-auth.session_token"
  const sessionToken =
    req.cookies.get("better-auth.session_token")?.value ??
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) return NextResponse.next(); // layout.tsx handles auth redirect

  // Check subscription via internal API call
  const baseUrl = req.nextUrl.origin;
  try {
    const res = await fetch(`${baseUrl}/api/subscription/status`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (res.ok) {
      const { expired, isAdmin } = await res.json();
      if (expired && !isAdmin) {
        return NextResponse.redirect(new URL(SUBSCRIPTION_PAGE, req.url));
      }
    }
  } catch {
    // If check fails, allow through (don't block on error)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
