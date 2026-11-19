import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { translateSections } from "@/lib/translate";
import { SERVICE_KINDS } from "@/lib/hotel";
import {
  PROSPECT_DAYS, PROSPECT_OWNER_EMAIL, APP_URL, newProspectToken, prospectGuideUrl, prospectClaimPath, isProspectApiAuthorized,
} from "@/lib/prospect";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // translation into 4 languages

// Shown in place of what public pages don't tell us — the owner fills it in after claiming
const TODO = "— dopunite —";

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function toSlug(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    .trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

/**
 * Sales agent API — ready-made guides for outreach (Authorization: Bearer PROSPECT_API_TOKEN).
 *
 * POST /api/prospects
 *   { email, kind: "APARTMENT"|"HOTEL", name, address?, source?, coverImage?,
 *     sections?: { WELCOME?: {message, hostName}, CHECKIN?: {checkIn, checkOut, instructions},
 *                  HOUSE_RULES?: {rules: string[]}, LOCATION?: {address, mapUrl, directions},
 *                  LOCAL_RECS?: {places: [{name, category, description}]}, CONTACT?: {phone, label},
 *                  PARKING?: {available, parkingType, paid, notes}, AI_CONTEXT?: {body} },
 *     services?: [{kind, name, description}]   (hotels; no prices — we don't guess them) }
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
  const body = obj(await req.json().catch(() => null));
  const email = str(body.email, 200).toLowerCase();
  const name = str(body.name, 120);
  const kind = body.kind === "HOTEL" ? "HOTEL" : "APARTMENT";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "email is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const existing = await prisma.property.findFirst({
    where: { prospectEmail: email, prospectToken: { not: null }, prospectExpiresAt: { gt: new Date() } },
    select: { slug: true, prospectToken: true },
  });
  if (existing) {
    return NextResponse.json({ error: "An open guide already exists for this email", url: prospectGuideUrl(existing.slug, existing.prospectToken!) }, { status: 409 });
  }

  const owner = await prisma.user.findUnique({
    where: { email: PROSPECT_OWNER_EMAIL },
    select: { id: true },
  });
  if (!owner) return NextResponse.json({ error: "Prospect owner account not found" }, { status: 500 });

  const s = obj(body.sections);
  const welcome = obj(s.WELCOME), checkin = obj(s.CHECKIN), rules = obj(s.HOUSE_RULES), location = obj(s.LOCATION);
  const recs = obj(s.LOCAL_RECS), contact = obj(s.CONTACT), parking = obj(s.PARKING), ai = obj(s.AI_CONTEXT);
  const address = str(body.address, 300) || str(location.address, 300);
  const isHotel = kind === "HOTEL";

  const places = (Array.isArray(recs.places) ? recs.places : []).slice(0, 15).map((p) => {
    const o = obj(p);
    return { name: str(o.name, 120), category: str(o.category, 60), description: str(o.description, 500) };
  }).filter((p) => p.name);
  const ruleList = (Array.isArray(rules.rules) ? rules.rules : []).map((r) => str(r, 300)).filter(Boolean).slice(0, 20);

  const sections = [
    { type: "CHECKIN" as const, title: "Check-in & Check-out", order: 0, content: {
      ...(isHotel ? { checkInType: "PERSONAL" } : {}),
      checkIn: str(checkin.checkIn, 10) || (isHotel ? "14:00" : "15:00"),
      checkOut: str(checkin.checkOut, 10) || (isHotel ? "12:00" : "11:00"),
      instructions: str(checkin.instructions) || TODO,
    } },
    { type: "WELCOME" as const, title: "Welcome", order: 1, content: {
      message: str(welcome.message), ...(str(welcome.hostName, 120) ? { hostName: str(welcome.hostName, 120) } : {}),
      ...(str(body.coverImage, 500).startsWith("https://") ? { heroImage: str(body.coverImage, 500) } : {}),
    } },
    { type: "WIFI" as const, title: "WiFi", order: 2, content: { network: TODO, password: TODO } },
    { type: "HOUSE_RULES" as const, title: "House Rules", order: 3, content: { rules: ruleList } },
    { type: "LOCATION" as const, title: "Location", order: 4, content: {
      address, mapUrl: str(location.mapUrl, 500).startsWith("https://") ? str(location.mapUrl, 500) : "", directions: str(location.directions),
    } },
    { type: "LOCAL_RECS" as const, title: "Local Recommendations", order: 5, content: { places } },
    { type: "CONTACT" as const, title: "Contact", order: 6, content: { phone: str(contact.phone, 40), label: str(contact.label, 80) } },
    { type: "PARKING" as const, title: "Parking", order: 7, content: {
      available: parking.available === true, parkingType: str(parking.parkingType, 30), paid: parking.paid === true, notes: str(parking.notes),
    } },
    ...(str(ai.body, 5000) ? [{ type: "AI_CONTEXT" as const, title: "AI context", order: 8, content: { body: str(ai.body, 5000) } }] : []),
  ];

  const validKinds = new Set<string>(SERVICE_KINDS);
  const services = isHotel ? (Array.isArray(body.services) ? body.services : []).slice(0, 30).map((x, i) => {
    const o = obj(x);
    return { kind: validKinds.has(str(o.kind, 20)) ? str(o.kind, 20) : "OTHER", name: str(o.name, 120), description: str(o.description, 500) || null, order: i };
  }).filter((x) => x.name) : [];

  const token = newProspectToken();
  const expiresAt = new Date(Date.now() + PROSPECT_DAYS * 86_400_000);
  const slug = `${toSlug(name) || "vodic"}-${Math.random().toString(36).slice(2, 7)}`;

  const property = await prisma.property.create({
    data: {
      userId: owner.id,
      workspaceId: null,
      kind,
      name,
      internalName: `Outreach: ${email}`,
      slug,
      address: address || null,
      coverImage: str(body.coverImage, 500).startsWith("https://") ? str(body.coverImage, 500) : null,
      prospectToken: token,
      prospectEmail: email,
      prospectSource: str(body.source, 500) || null,
      prospectExpiresAt: expiresAt,
      sections: { create: sections },
      ...(services.length ? { hotelServices: { create: services } } : {}),
    },
    include: { sections: { select: { id: true } } },
  });

  try {
    await translateSections(property.id, property.sections.map((x) => x.id));
  } catch (e) {
    // The guide still works in English; the owner can re-translate from the editor
    console.error("[prospects] translation failed:", e);
  }

  return NextResponse.json({
    id: property.id,
    url: prospectGuideUrl(slug, token),
    claimUrl: `${APP_URL}${prospectClaimPath(token)}`,
    expiresAt: expiresAt.toISOString(),
  }, { status: 201 });
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
