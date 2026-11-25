import { NextRequest, NextResponse } from "next/server";

// Middleware only handles the subscription redirect guard.
// Auth redirect (no session → /login) stays in layout.tsx.
// This runs before layout so we can safely read the pathname.

const SUBSCRIPTION_PAGE = "/dashboard/subscription";
const ADMIN_EMAIL = "hareselimovic@gmail.com";

const MOBILE_ORIGINS = new Set([
  "http://localhost:8081",
  "http://192.168.0.28:8081",
]);

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const origin = req.headers.get("origin") ?? "";

  // Handle CORS for all /api/* routes from mobile dev origins
  if (pathname.startsWith("/api/") && MOBILE_ORIGINS.has(origin)) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Cookie, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }
    const res = NextResponse.next();
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    return res;
  }

  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  // Read session cookie — Better Auth uses "better-auth.session_token"
  const sessionToken =
    req.cookies.get("better-auth.session_token")?.value ??
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  // Not logged in: send to login and come back to the same page afterwards
  // (e.g. "Obnovi pretplatu" links in emails). Invalid/expired sessions are still handled by layout.tsx.
  if (!sessionToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Subscription guard (the subscription page itself stays reachable)
  if (pathname.startsWith(SUBSCRIPTION_PAGE)) return NextResponse.next();

  // Recently confirmed active subscription → skip the extra round trip to /api/subscription/status.
  // The cookie is signed and tied to this session token; it never outlives validUntil or 1 hour.
  const passUntil = await readSubPass(req.cookies.get(SUB_PASS_COOKIE)?.value, sessionToken);
  if (passUntil && passUntil > Date.now()) return NextResponse.next();

  // Check subscription via internal API call
  const baseUrl = req.nextUrl.origin;
  try {
    const res = await fetch(`${baseUrl}/api/subscription/status`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    if (res.ok) {
      const { expired, isAdmin, validUntil } = await res.json();
      if (expired && !isAdmin) {
        return NextResponse.redirect(new URL(SUBSCRIPTION_PAGE, req.url));
      }
      const until = Math.min(Date.now() + SUB_PASS_MAX_MS, isAdmin ? Infinity : new Date(validUntil).getTime());
      const pass = await signSubPass(sessionToken, until);
      const next = NextResponse.next();
      if (pass && Number.isFinite(until)) {
        next.cookies.set(SUB_PASS_COOKIE, pass, {
          httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", path: "/dashboard",
          expires: new Date(until),
        });
      }
      return next;
    }
  } catch {
    // If check fails, allow through (don't block on error)
  }

  return NextResponse.next();
}

// ─── Short-lived "subscription OK" pass ──────────────────────────────────────
const SUB_PASS_COOKIE = "ss_sub_pass";
const SUB_PASS_MAX_MS = 60 * 60 * 1000;

async function hmacHex(data: string): Promise<string | null> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function signSubPass(sessionToken: string, until: number): Promise<string | null> {
  const sig = await hmacHex(`sub-pass:${sessionToken}:${until}`);
  return sig ? `${until}.${sig}` : null;
}

async function readSubPass(value: string | undefined, sessionToken: string): Promise<number | null> {
  if (!value) return null;
  const [untilStr, sig] = value.split(".");
  const until = Number(untilStr);
  if (!Number.isFinite(until) || !sig) return null;
  const expected = await hmacHex(`sub-pass:${sessionToken}:${until}`);
  return expected && expected === sig ? until : null;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
