import Anthropic from "@anthropic-ai/sdk";

/**
 * "Vodič iz linka": reads a public listing (Airbnb / Booking / the property's own website) and turns it into
 * the prospect-guide input of createProspectGuide(). Airbnb and plain websites are read here with a normal
 * HTTP request; Booking.com answers plain requests with a bot challenge, so those (and anything that fails
 * here) are read by the headless-browser worker (smartstay-outreach repo, GitHub Actions) which posts the
 * same RawListing back to /api/guide-request/[id]/raw.
 */

export type Platform = "AIRBNB" | "BOOKING" | "WEBSITE";

export interface RawListing {
  platform: Platform;
  url: string;
  name: string;
  subtitle?: string;
  description?: string;
  amenities?: string[];
  rules?: string[];
  checkIn?: string;
  checkOut?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  host?: string;
  photos?: string[];
  text?: string; // free page text (websites / Booking policies)
  rooms?: { name: string; beds?: string }[]; // Booking room types (browser worker)
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

export function detectPlatform(url: string): Platform | null {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    host = u.hostname.toLowerCase();
  } catch {
    return null;
  }
  if (/(^|\.)airbnb\.[a-z.]+$/.test(host) || host === "abnb.me") return "AIRBNB";
  if (/(^|\.)booking\.com$/.test(host)) return "BOOKING";
  // Our own domains / localhost / IPs are not listings
  if (/smartstay\.ba$|^localhost$|^\d+\.\d+\.\d+\.\d+$|^\[/.test(host)) return null;
  return "WEBSITE";
}

/** Normalises the pasted link (drops tracking params; Airbnb → canonical /rooms/<id>). */
export function normaliseUrl(url: string): string {
  const u = new URL(url.trim());
  const room = u.pathname.match(/\/rooms\/(?:plus\/)?(\d+)/);
  if (/airbnb\./.test(u.hostname) && room) return `https://www.airbnb.com/rooms/${room[1]}`;
  if (/booking\.com$/.test(u.hostname)) return `https://www.booking.com${u.pathname.replace(/\.[a-z]{2}(-[a-z]{2})?\.html$/, ".html")}`;
  u.hash = "";
  return u.toString();
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return html.slice(0, 3_000_000);
}

type J = Record<string, unknown>;
const isObj = (v: unknown): v is J => !!v && typeof v === "object" && !Array.isArray(v);

function* walk(o: unknown): Generator<J> {
  if (Array.isArray(o)) for (const v of o) yield* walk(v);
  else if (isObj(o)) {
    yield o;
    for (const v of Object.values(o)) yield* walk(v);
  }
}

const stripTags = (s: string) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

export async function readAirbnb(url: string): Promise<RawListing> {
  const html = await fetchHtml(url);
  const m = html.match(/<script id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("Airbnb page without listing data (blocked or not a listing)");
  const data = JSON.parse(m[1]);

  let pp: J | null = null;
  for (const o of walk(data)) if (isObj(o.pdpPresentation)) { pp = o.pdpPresentation as J; break; }

  const ugc = (v: unknown) => {
    for (const o of walk(v)) if (typeof o.localizedString === "string") return o.localizedString;
    return "";
  };
  const name = (pp && ugc(pp.title)) || (html.match(/<title>([^<]*?) - [^<]*Airbnb<\/title>/)?.[1] ?? "").trim();
  if (!name) throw new Error("Airbnb listing name not found");

  let description = "";
  for (const o of walk(data)) {
    if (typeof o.htmlText === "string" && o.htmlText.length > description.length && !/Service animals/i.test(o.htmlText)) description = o.htmlText;
  }

  const amenities = new Set<string>();
  const amen = pp && isObj(pp.amenities) ? pp.amenities : null;
  for (const o of walk(amen ? (amen as J).seeAllAmenitiesGroups ?? amen : [])) {
    if (o.__typename === "AmenityItem" && o.available === true && typeof o.title === "string") amenities.add(o.title);
  }

  const rules: string[] = [];
  for (const o of walk(pp ? pp.rules : [])) {
    if (o.__typename === "StaysPdpDetailItem" && typeof o.title === "string") {
      const d = isObj(o.description) && typeof o.description.text === "string" ? `: ${o.description.text}` : "";
      rules.push(o.title + d);
    }
  }

  let lat: number | undefined, lng: number | undefined, city = "";
  const loc = pp && isObj(pp.location) ? (pp.location as J) : null;
  if (loc) {
    if (typeof loc.latitude === "number") lat = loc.latitude;
    if (typeof loc.longitude === "number") lng = loc.longitude;
    if (typeof loc.subtitle === "string") city = loc.subtitle;
  }

  const highlights: string[] = [];
  for (const o of walk(pp ? pp.highlights : [])) {
    if (isObj(o.headline) && typeof o.headline.localizedContent === "string") highlights.push(o.headline.localizedContent);
  }

  let host = "";
  for (const o of walk(pp ? pp.hostInfo : [])) if (typeof o.name === "string" && o.name.length < 80) { host = o.name; break; }

  // Photos in page order (the first one is the listing's cover)
  const photos = [...new Set(html.match(/https:\/\/a0\.muscache\.com\/im\/pictures\/[^"?\\\s]+\.(?:jpe?g|webp)/g) ?? [])]
    .filter((p) => !/\/user\/|profile|avatar/i.test(p)).slice(0, 12);

  const subtitle = html.match(/<meta property="og:title" content="([^"]*)/)?.[1];
  return {
    platform: "AIRBNB", url, name, subtitle, description: stripTags(description).slice(0, 4000),
    amenities: [...amenities].slice(0, 60), rules, city, lat, lng, host,
    photos: photos.map((p) => `${p}?im_w=1200`),
    text: highlights.join("\n"),
  };
}

/** The property's own website: page text + og:image. */
export async function readWebsite(url: string): Promise<RawListing> {
  const html = await fetchHtml(url);
  const title = (html.match(/<meta property="og:site_name" content="([^"]*)/)?.[1]
    ?? html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "").trim();
  const og = html.match(/<meta property="og:image" content="(https:[^"]+)/)?.[1];
  const imgs = [...html.matchAll(/<img[^>]+src="(https:[^"]+\.(?:jpe?g|webp|png))"/gi)].map((x) => x[1]).filter((s) => !/logo|icon|sprite/i.test(s));
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (text.length < 200) throw new Error("Website has too little readable text");
  return { platform: "WEBSITE", url, name: title.split(/[|–-]/)[0].trim() || new URL(url).hostname, photos: [og, ...imgs].filter(Boolean).slice(0, 8) as string[], text: text.slice(0, 12000) };
}

/** Checks that a photo link really loads as an image (the guide must not show a broken cover). */
export async function firstWorkingPhoto(photos: string[] = []): Promise<string> {
  for (const p of photos.slice(0, 6)) {
    if (!p.startsWith("https://")) continue;
    try {
      const r = await fetch(p, { method: "GET", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
      if (r.ok && (r.headers.get("content-type") ?? "").startsWith("image/")) return p;
    } catch { /* try the next one */ }
  }
  return "";
}

const COMPOSE_PROMPT = `You turn a public accommodation listing into a SmartStay digital guest guide.
Write in English, warm and short, as if the host wrote it. Use ONLY facts from the listing data — never invent
WiFi names/passwords, door codes, phone numbers, prices or rules that are not there. Leave unknown fields empty.
LOCAL_RECS is the exception: add 4–6 real, well-known places near the address/coordinates (restaurants, sights,
a supermarket or bakery) with one-sentence descriptions — only places you are confident exist there.

Return ONLY a JSON object (no markdown) with this shape:
{
  "name": "short property name (no 'Airbnb', no rating)",
  "address": "street address or 'City, Country' if that is all we know",
  "sections": {
    "WELCOME": { "message": "2–3 sentence welcome", "hostName": "host or company name if known" },
    "CHECKIN": { "checkIn": "HH:MM or empty", "checkOut": "HH:MM or empty", "instructions": "" },
    "HOUSE_RULES": { "rules": ["one rule per item, plain sentences"] },
    "LOCATION": { "address": "", "directions": "1–2 sentences about the area/getting there, from the listing" },
    "LOCAL_RECS": { "places": [{ "name": "", "category": "Restaurant|Sight|Café|Shopping|Nature|Transport", "description": "" }] },
    "PARKING": { "available": true|false, "parkingType": "free|paid|street|garage|", "paid": true|false, "notes": "" },
    "AI_CONTEXT": { "body": "Everything a guest assistant should know: size, beds, amenities, highlights, facilities, policies — as compact facts" }
  },
  "services": [{ "kind": "FOOD|STAY|TRANSPORT|WELLNESS|TOURS|OCCASIONS|OTHER", "name": "", "description": "" }]
}
"services" only for hotels (breakfast, airport shuttle, spa, restaurant… mentioned in the data), without prices; [] otherwise.
PARKING.available only true if the data says parking exists.`;

/** Listing data → createProspectGuide() input (without email/kind/source/coverImage). */
export async function composeGuide(raw: RawListing, kind: "APARTMENT" | "HOTEL"): Promise<Record<string, unknown>> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const data = { ...raw, photos: undefined, kind };
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    system: COMPOSE_PROMPT,
    messages: [{ role: "user", content: `Property type: ${kind}\nListing data:\n${JSON.stringify(data).slice(0, 20000)}` }],
  });
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const out = JSON.parse(json) as Record<string, unknown>;
  if (typeof out.name !== "string" || !out.name.trim()) out.name = raw.name;
  if (raw.lat != null && raw.lng != null) {
    const sections = (out.sections ?? {}) as Record<string, Record<string, unknown>>;
    sections.LOCATION = { ...(sections.LOCATION ?? {}), mapUrl: `https://www.google.com/maps?q=${raw.lat},${raw.lng}` };
    out.sections = sections;
  }
  return out;
}
