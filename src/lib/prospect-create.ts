import { prisma } from "@/lib/prisma";
import { translateSections } from "@/lib/translate";
import { SERVICE_KINDS } from "@/lib/hotel";
import { PROSPECT_DAYS, PROSPECT_OWNER_EMAIL, APP_URL, newProspectToken, prospectGuideUrl, prospectClaimPath } from "@/lib/prospect";

// Shown in place of what public pages don't tell us — the owner fills it in after claiming
export const TODO = "— dopunite —";

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function toSlug(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    .trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

export type ProspectResult =
  | { ok: true; id: string; slug: string; token: string; url: string; claimUrl: string; expiresAt: Date }
  | { ok: false; status: 400 | 409 | 500; error: string; url?: string; id?: string };

/**
 * Creates a ready-made guide ("prospect") held by the system user, visible only on its secret link.
 * Input format: see the comment on POST /api/prospects. Content is English; BS/DE/TR/IT are generated.
 */
export async function createProspectGuide(input: unknown, opts: { internalLabel?: string } = {}): Promise<ProspectResult> {
  const body = obj(input);
  const email = str(body.email, 200).toLowerCase();
  const name = str(body.name, 120);
  const kind = body.kind === "HOTEL" ? "HOTEL" : "APARTMENT";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, status: 400, error: "email is required" };
  if (!name) return { ok: false, status: 400, error: "name is required" };

  const existing = await prisma.property.findFirst({
    where: { prospectEmail: email, prospectToken: { not: null }, prospectExpiresAt: { gt: new Date() } },
    select: { id: true, slug: true, prospectToken: true },
  });
  if (existing) {
    return { ok: false, status: 409, error: "An open guide already exists for this email", id: existing.id, url: prospectGuideUrl(existing.slug, existing.prospectToken!) };
  }

  const owner = await prisma.user.findUnique({ where: { email: PROSPECT_OWNER_EMAIL }, select: { id: true } });
  if (!owner) return { ok: false, status: 500, error: "Prospect owner account not found" };

  const s = obj(body.sections);
  const welcome = obj(s.WELCOME), checkin = obj(s.CHECKIN), rules = obj(s.HOUSE_RULES), location = obj(s.LOCATION);
  const recs = obj(s.LOCAL_RECS), contact = obj(s.CONTACT), parking = obj(s.PARKING), ai = obj(s.AI_CONTEXT);
  const address = str(body.address, 300) || str(location.address, 300);
  const isHotel = kind === "HOTEL";
  const cover = str(body.coverImage, 500).startsWith("https://") ? str(body.coverImage, 500) : "";

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
      ...(cover ? { heroImage: cover } : {}),
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
      internalName: `${opts.internalLabel ?? "Outreach"}: ${email}`,
      slug,
      address: address || null,
      coverImage: cover || null,
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

  return {
    ok: true, id: property.id, slug, token,
    url: prospectGuideUrl(slug, token),
    claimUrl: `${APP_URL}${prospectClaimPath(token)}`,
    expiresAt,
  };
}
