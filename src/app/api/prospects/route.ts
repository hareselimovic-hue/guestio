import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProspectGuide } from "@/lib/prospect-create";
import { prospectGuideUrl, isProspectApiAuthorized } from "@/lib/prospect";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // translation into 4 languages

/**
 * Sales agent API — ready-made guides for outreach (Authorization: Bearer PROSPECT_API_TOKEN).
 *
 * POST /api/prospects
 *   { email, kind: "APARTMENT"|"HOTEL", name, address?, source?, coverImage?,
 *     sections?: { WELCOME?: {message, hostName}, CHECKIN?: {checkIn, checkOut, instructions},
 *                  HOUSE_RULES?: {rules: string[]}, LOCATION?: {address, mapUrl, directions},
 *                  LOCAL_RECS?: {places: [{name, category, description}]}, CONTACT?: {phone, label},
 *                  PARKING?: {available, parkingType, paid, notes}, AI_CONTEXT?: {body} },
 *     services?: [{kind, name, description}]   (hotels; no prices — we don't guess them),
 *     rooms?: ["Standard Double", "Deluxe Double with Balcony", "101", …]   (hotels: each gets a room link / QR; ≤ 30 chars),
 *     units?: { title?, intro?, items: [{name, description, url?, image?}] }   (apartments: several units at one
 *              address → one guide with an "Our apartments" section) }
 *   Listing data for the agent (Booking via the browser worker): POST /api/prospects/read — see that route.
 *   → 201 { id, url, claimUrl, expiresAt }   ·   409 { error, url } if an open guide exists for that email
 *   Content is written in English; Bosnian/German/Turkish/Italian are generated.
 *   Only facts from the prospect's public pages — unknown WiFi etc. are shown as "— dopunite —".
 *
 * GET /api/prospects?email=…   → open guides for that email (url, views)
 * DELETE /api/prospects?email=… → removes unclaimed guides for that email ("javite i obrisat ćemo")
 */
export async function POST(req: NextRequest) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await createProspectGuide(await req.json().catch(() => null));
  if (!r.ok) return NextResponse.json({ error: r.error, ...(r.url ? { url: r.url } : {}) }, { status: r.status });
  return NextResponse.json({ id: r.id, url: r.url, claimUrl: r.claimUrl, expiresAt: r.expiresAt.toISOString() }, { status: 201 });
}

export async function GET(req: NextRequest) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  const rows = await prisma.property.findMany({
    where: { prospectEmail: email },
    select: { name: true, slug: true, prospectToken: true, prospectExpiresAt: true, prospectViews: true, prospectLastViewAt: true, prospectClaimedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows.map((r) => ({
    name: r.name,
    url: r.prospectToken ? prospectGuideUrl(r.slug, r.prospectToken) : null,
    expiresAt: r.prospectExpiresAt, views: r.prospectViews, lastViewAt: r.prospectLastViewAt,
    claimedAt: r.prospectClaimedAt, createdAt: r.createdAt,
  })));
}

export async function DELETE(req: NextRequest) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  const { count } = await prisma.property.deleteMany({
    where: { prospectEmail: email, prospectToken: { not: null }, prospectClaimedAt: null },
  });
  return NextResponse.json({ ok: true, deleted: count });
}
