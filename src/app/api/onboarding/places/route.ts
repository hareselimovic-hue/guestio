import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geocode, nearbyPlaces } from "@/lib/nearby-places";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // public OpenStreetMap servers can take ~40 s

/**
 * Places near the property for the "Recommendations" step.
 * GET ?req=<onboarding request> → around the listing's location (works before the account exists, so the
 *   wizard can fetch them in the background while the owner signs up; cached in the request's draft)
 * GET ?address=… (signed in) → around a typed address
 * → { center: {lat,lng} | null, places: { FOOD, CAFE, SIGHT, SHOP } }
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const reqId = q.get("req") ?? "";
  const empty = { center: null, places: { FOOD: [], CAFE: [], SIGHT: [], SHOP: [] } };

  let lat: number | undefined, lng: number | undefined, cacheFor: string | null = null, draft: Record<string, unknown> | null = null;
  if (reqId) {
    const gr = await prisma.guideRequest.findFirst({
      where: { id: reqId, purpose: "ONBOARDING", createdAt: { gt: new Date(Date.now() - 2 * 86_400_000) } },
      select: { draft: true },
    });
    draft = (gr?.draft ?? null) as Record<string, unknown> | null;
    if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (draft.nearby) return NextResponse.json({ center: { lat: draft.lat, lng: draft.lng }, places: draft.nearby });
    if (typeof draft.lat === "number" && typeof draft.lng === "number") ({ lat, lng } = draft as { lat: number; lng: number });
    cacheFor = reqId;
  } else {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (lat == null || lng == null) {
    const g = await geocode((q.get("address") ?? (typeof draft?.address === "string" ? draft.address : "")).slice(0, 300));
    if (!g) return NextResponse.json(empty);
    ({ lat, lng } = g);
  }
  try {
    const places = await nearbyPlaces(lat, lng);
    if (cacheFor && draft) {
      await prisma.guideRequest.update({ where: { id: cacheFor }, data: { draft: { ...draft, nearby: places } as object } }).catch(() => {});
    }
    return NextResponse.json({ center: { lat, lng }, places });
  } catch (e) {
    console.error("[onboarding] nearby places failed:", e);
    return NextResponse.json({ error: "PLACES_UNAVAILABLE" }, { status: 502 });
  }
}
