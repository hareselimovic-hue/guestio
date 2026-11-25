import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { translateSections } from "@/lib/translate";
import { getUserWorkspaceIds } from "@/lib/workspace";
import { composeGuide, firstWorkingPhoto, type RawListing } from "@/lib/listing-import";
import { geocode, nearbyPlaces, toGuidePlace } from "@/lib/nearby-places";

/**
 * Self-serve onboarding (/start wizard and "New property → From listing link").
 * The listing is read into GuideRequest.draft (purpose ONBOARDING); the signed-in owner reviews it and
 * createOnboardingGuide() turns it into a normal Property on their own account — no admin approval.
 */

export interface OnboardingDraft {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  coverImage: string;
  photoCount: number;
  checkIn: string;
  checkOut: string;
  rules: string[];
  welcome: string;
  hostName: string;
  directions: string;
  mapUrl: string;
  parking: { available: boolean; parkingType: string; paid: boolean; notes: string };
  aiContext: string;
}

export interface GuidePlace { name: string; category: string; description: string; link?: string }

export interface OnboardingInput {
  requestId?: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  rules: string[];
  wifiNetwork: string;
  wifiPassword: string;
  checkInType: "SELF" | "PERSONAL";
  entry: string;
  phone: string;
  places: GuidePlace[];
}

const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const o = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const hhmm = (v: unknown) => (/^\d{1,2}:\d{2}$/.test(s(v, 10)) ? s(v, 10).padStart(5, "0") : "");

/** Listing data → draft (AI composes the texts; WiFi/door codes are never invented). */
export async function draftFromRaw(raw: RawListing): Promise<OnboardingDraft> {
  const [composed, coverImage] = await Promise.all([composeGuide(raw, "APARTMENT"), firstWorkingPhoto(raw.photos)]);
  const sec = o(composed.sections);
  const ci = o(sec.CHECKIN), hr = o(sec.HOUSE_RULES), w = o(sec.WELCOME), loc = o(sec.LOCATION), pk = o(sec.PARKING), ai = o(sec.AI_CONTEXT);
  const address = s(composed.address, 300) || s(raw.address, 300) || s(loc.address, 300);
  let lat = raw.lat, lng = raw.lng;
  if ((lat == null || lng == null) && address) {
    const g = await geocode(address);
    if (g) ({ lat, lng } = g);
  }
  return {
    name: s(composed.name, 120) || s(raw.name, 120),
    address,
    lat, lng,
    coverImage,
    photoCount: raw.photos?.length ?? 0,
    checkIn: hhmm(ci.checkIn) || hhmm(raw.checkIn),
    checkOut: hhmm(ci.checkOut) || hhmm(raw.checkOut),
    rules: (Array.isArray(hr.rules) ? hr.rules : []).map((r) => s(r, 300)).filter(Boolean).slice(0, 20),
    welcome: s(w.message, 1000),
    hostName: s(w.hostName, 120),
    directions: s(loc.directions, 1000),
    mapUrl: lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : s(loc.mapUrl, 500),
    parking: { available: pk.available === true, parkingType: s(pk.parkingType, 30), paid: pk.paid === true, notes: s(pk.notes, 500) },
    aiContext: s(ai.body, 5000),
  };
}

function toSlug(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")
    .trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

/** Creates the guide on the owner's account from what they reviewed (+ texts from the listing draft). */
export async function createOnboardingGuide(userId: string, input: OnboardingInput): Promise<{ id: string; slug: string }> {
  const req = input.requestId
    ? await prisma.guideRequest.findFirst({ where: { id: input.requestId, purpose: "ONBOARDING" } })
    : null;
  if (req?.propertyId) {
    // Double submit → the guide already exists
    const p = await prisma.property.findFirst({ where: { id: req.propertyId, userId }, select: { id: true, slug: true } });
    if (p) return p;
  }
  const d = (req?.status === "READY" ? req.draft : null) as OnboardingDraft | null;

  const name = s(input.name, 120) || d?.name || "My apartment";
  const address = s(input.address, 300) || d?.address || "";
  const wsIds = await getUserWorkspaceIds(userId);
  const slug = `${toSlug(name) || "apartment"}-${Math.random().toString(36).slice(2, 7)}`;
  const cover = d?.coverImage || "";
  const places = (input.places ?? []).slice(0, 40).map((p) => ({
    name: s(p.name, 120), category: s(p.category, 60), description: s(p.description, 500), ...(s(p.link, 500).startsWith("https://") ? { link: s(p.link, 500) } : {}),
  })).filter((p) => p.name);

  const property = await prisma.property.create({
    data: {
      userId,
      workspaceId: wsIds[0] ?? null,
      kind: "APARTMENT",
      name,
      slug,
      address: address || null,
      coverImage: cover || null,
      sections: {
        create: [
          { type: "CHECKIN", title: "Check-in & Check-out", order: 0, content: {
            checkInType: input.checkInType === "PERSONAL" ? "PERSONAL" : "SELF",
            checkIn: hhmm(input.checkIn) || d?.checkIn || "15:00",
            checkOut: hhmm(input.checkOut) || d?.checkOut || "11:00",
            instructions: s(input.entry, 2000),
          } },
          { type: "WELCOME", title: "Welcome", order: 1, content: {
            message: d?.welcome ?? "", ...(d?.hostName ? { hostName: d.hostName } : {}), ...(cover ? { heroImage: cover } : {}),
          } },
          { type: "WIFI", title: "WiFi", order: 2, content: { network: s(input.wifiNetwork, 100), password: s(input.wifiPassword, 100) } },
          { type: "HOUSE_RULES", title: "House Rules", order: 3, content: { rules: (input.rules ?? []).map((r) => s(r, 300)).filter(Boolean).slice(0, 30) } },
          { type: "LOCATION", title: "Location", order: 4, content: { address, mapUrl: d?.mapUrl ?? "", directions: d?.directions ?? "" } },
          { type: "LOCAL_RECS", title: "Local Recommendations", order: 5, content: { places } },
          { type: "CONTACT", title: "Contact", order: 6, content: { phone: s(input.phone, 40), label: "" } },
          { type: "PARKING", title: "Parking", order: 7, content: d?.parking ?? { available: false, parkingType: "", paid: false, notes: "" } },
          ...(d?.aiContext ? [{ type: "AI_CONTEXT" as const, title: "AI context", order: 8, content: { body: d.aiContext } }] : []),
        ],
      },
    },
    include: { sections: { select: { id: true } } },
  });

  if (req) await prisma.guideRequest.update({ where: { id: req.id }, data: { propertyId: property.id, userId } });

  // Guests get it in their language: BS/DE/TR/IT generated in the background (English works meanwhile)
  after(async () => {
    try {
      await translateSections(property.id, property.sections.map((x) => x.id));
    } catch (e) {
      console.error("[onboarding] translation failed:", e);
    }
  });
  return { id: property.id, slug: property.slug };
}

/**
 * The listing arrived after the owner already created the guide (Booking via the browser worker):
 * fill in what is still empty — the owner's own entries are never overwritten.
 */
export async function applyLateDraft(propertyId: string, d: OnboardingDraft) {
  const p = await prisma.property.findUnique({ where: { id: propertyId }, include: { sections: true } });
  if (!p) return;
  const sec = (t: string) => p.sections.find((x) => x.type === t);
  const c = (t: string) => o(sec(t)?.content);
  const changed: string[] = [];
  const set = async (t: string, content: Record<string, unknown>) => {
    const x = sec(t);
    if (x) { await prisma.section.update({ where: { id: x.id }, data: { content: content as object } }); changed.push(x.id); }
  };

  if (!p.coverImage && d.coverImage) await prisma.property.update({ where: { id: p.id }, data: { coverImage: d.coverImage } });
  if (!p.address && d.address) await prisma.property.update({ where: { id: p.id }, data: { address: d.address } });
  const w = c("WELCOME");
  if (!s(w.message) && d.welcome) await set("WELCOME", { ...w, message: d.welcome, ...(d.hostName ? { hostName: d.hostName } : {}), ...(!w.heroImage && d.coverImage ? { heroImage: d.coverImage } : {}) });
  const hr = c("HOUSE_RULES");
  if (!(Array.isArray(hr.rules) && hr.rules.length) && d.rules.length) await set("HOUSE_RULES", { rules: d.rules });
  const loc = c("LOCATION");
  if (!s(loc.mapUrl) || !s(loc.directions)) await set("LOCATION", { ...loc, address: s(loc.address) || d.address, mapUrl: s(loc.mapUrl) || d.mapUrl, directions: s(loc.directions) || d.directions });
  const pk = c("PARKING");
  if (pk.available !== true && d.parking.available) await set("PARKING", d.parking);
  const recs = c("LOCAL_RECS");
  if (!(Array.isArray(recs.places) && recs.places.length) && d.lat != null && d.lng != null) {
    try {
      const near = await nearbyPlaces(d.lat, d.lng);
      const top = Object.values(near).flatMap((list) => list.slice(0, 3)).map(toGuidePlace);
      if (top.length) await set("LOCAL_RECS", { places: top });
    } catch (e) {
      console.error("[onboarding] late places failed:", e);
    }
  }
  if (d.aiContext && !sec("AI_CONTEXT")) {
    const order = p.sections.reduce((m, x) => Math.max(m, x.order), 0) + 1;
    const x = await prisma.section.create({ data: { propertyId: p.id, type: "AI_CONTEXT", title: "AI context", order, content: { body: d.aiContext } } });
    changed.push(x.id);
  }
  if (changed.length) {
    try { await translateSections(p.id, changed); } catch (e) { console.error("[onboarding] late translation failed:", e); }
  }
}
