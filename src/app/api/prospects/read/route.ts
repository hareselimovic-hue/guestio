import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProspectApiAuthorized } from "@/lib/prospect";
import { detectPlatform, normaliseUrl } from "@/lib/listing-import";
import { processGuideRequest } from "@/lib/guide-request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sales agent (Bearer PROSPECT_API_TOKEN): read a listing so the agent can build a good prospect guide.
 * The cloud agent has no real browser, so Booking.com (bot challenge) is read by the GitHub browser worker.
 *
 * POST /api/prospects/read { url }   → { id, platform }
 * GET  /api/prospects/read/<id>      → { status: "READING" | "READY" | "FAILED", raw?, error? }
 *   raw (RawListing): name, description, address, lat/lng, photos, checkIn/checkOut, amenities, text (house rules +
 *   all facilities) and for Booking `rooms: [{ name, beds }]` (room types from the availability table).
 * Booking usually takes 1–3 minutes; poll every ~15 s.
 */
export async function POST(req: NextRequest) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { url?: string } | null;
  const rawUrl = (body?.url ?? "").trim();
  const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const platform = rawUrl.length > 3 && rawUrl.length < 1000 ? detectPlatform(withProto) : null;
  if (!platform) return NextResponse.json({ error: "Not a listing or website URL" }, { status: 400 });
  const url = normaliseUrl(withProto);

  // Same link read in the last 6 hours → reuse (the agent may retry)
  const recent = await prisma.guideRequest.findFirst({
    where: { purpose: "AGENT_READ", url, status: { not: "FAILED" }, createdAt: { gt: new Date(Date.now() - 6 * 3_600_000) } },
    select: { id: true },
  });
  if (recent) return NextResponse.json({ id: recent.id, platform });

  const since = new Date(Date.now() - 86_400_000);
  if (await prisma.guideRequest.count({ where: { purpose: "AGENT_READ", createdAt: { gt: since } } }) >= 60) {
    return NextResponse.json({ error: "Daily read limit reached" }, { status: 429 });
  }
  const gr = await prisma.guideRequest.create({ data: { purpose: "AGENT_READ", email: "", url, platform } });
  after(async () => {
    try {
      await processGuideRequest(gr.id);
    } catch (e) {
      console.error("[prospects/read] failed:", e);
    }
  });
  return NextResponse.json({ id: gr.id, platform });
}
