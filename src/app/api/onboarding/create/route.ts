import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createOnboardingGuide, type OnboardingInput } from "@/lib/onboarding";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // translation runs in after()

/** Signed in: the reviewed wizard data → a normal apartment guide on the owner's account. → { id, slug } */
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as OnboardingInput | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!body.requestId && !String(body.name ?? "").trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  try {
    const r = await createOnboardingGuide(session.user.id, body);
    return NextResponse.json(r, { status: 201 });
  } catch (e) {
    console.error("[onboarding] create failed:", e);
    return NextResponse.json({ error: "Could not create the guide" }, { status: 500 });
  }
}
