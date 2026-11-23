import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** "@lat,lng" · "?q=lat,lng" · "!3dlat!4dlng" in a Google Maps URL */
function coords(url: string): [number, number] | null {
  const m =
    url.match(/!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/) ??
    url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/) ??
    url.match(/[?&](?:q|query|ll|center)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

/** Short links (maps.app.goo.gl, goo.gl/maps) redirect to the full URL that has the coordinates */
async function resolveShortLink(url: string): Promise<string | null> {
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    const r = await fetch(current, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (SmartStay guest guide)" }, signal: AbortSignal.timeout(8000) });
    const next = r.headers.get("location");
    if (!next) return hop ? current : null;
    current = new URL(next, current).toString();
    if (coords(current)) return current;
  }
  return current;
}

/** Address only when it names a place after the street ("…, 71000 Sarajevo") — a bare street exists in many towns */
async function geocode(address: string): Promise<[number, number] | null> {
  if (!address.includes(",")) return null;
  const r = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(address)}`, {
    headers: { "User-Agent": "SmartStay guest guide (https://smartstay.ba)" }, signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const f = (await r.json()).features?.[0];
  return f ? [f.geometry.coordinates[1], f.geometry.coordinates[0]] : null;
}

/**
 * Public: where a guide's property is, for the weather card on the guest Home screen.
 * GET ?slug=… → { lat, lng } or { lat: null }. Cached on the CDN for a day per guide.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const none = NextResponse.json({ lat: null, lng: null }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  if (!slug) return none;
  const property = await prisma.property.findUnique({
    where: { slug },
    select: { address: true, sections: { where: { type: "LOCATION" }, select: { content: true } } },
  });
  if (!property) return none;
  const loc = (property.sections[0]?.content ?? {}) as Record<string, unknown>;
  const mapUrl = typeof loc.mapUrl === "string" ? loc.mapUrl.trim() : "";
  const address = (typeof loc.address === "string" && loc.address.trim()) || property.address || "";

  let c: [number, number] | null = null;
  try {
    if (mapUrl) c = coords(mapUrl) ?? (/goo\.gl|maps\.app/.test(mapUrl) ? coords((await resolveShortLink(mapUrl)) ?? "") : null);
    if (!c && address) c = await geocode(address);
  } catch { /* no location — no weather */ }
  if (!c) return none;
  return NextResponse.json({ lat: c[0], lng: c[1] }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}
