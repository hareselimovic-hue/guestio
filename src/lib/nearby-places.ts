/**
 * Places near a property for the onboarding "Recommendations" step.
 * Google Places (ratings, better coverage) when GOOGLE_PLACES_API_KEY is set, otherwise OpenStreetMap (Overpass, free).
 */

export type PlaceCategory = "FOOD" | "CAFE" | "SIGHT" | "SHOP";

export interface NearbyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  kind: string;        // e.g. "Restaurant", "Bakery" (English, shown in the picker)
  distance: number;    // metres, straight line
  rating?: number;
  ratingCount?: number;
  lat: number;
  lng: number;
  link: string;        // Google Maps link for the guest
}

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  FOOD: "Restaurant", CAFE: "Café", SIGHT: "Sight", SHOP: "Shopping",
};

const UA = "SmartStay guest guide (https://smartstay.ba)";
const PER_CATEGORY = 10;

function distance(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const mapsLink = (name: string, lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}%20${lat.toFixed(6)}%2C${lng.toFixed(6)}`;

/** "5 min walk" / "1.2 km" — English; the guide is translated afterwards */
export function walkText(m: number) {
  if (m <= 1500) return `${Math.max(1, Math.round(m / 80))} min walk`;
  return `${(m / 1000).toFixed(1)} km`;
}

// ── OpenStreetMap ───────────────────────────────────────────────────────────────────────────────

const OSM_KIND: [RegExp, PlaceCategory, string][] = [
  [/^amenity=restaurant$/, "FOOD", "Restaurant"],
  [/^amenity=fast_food$/, "FOOD", "Fast food"],
  [/^amenity=cafe$/, "CAFE", "Café"],
  [/^amenity=(bar|pub)$/, "CAFE", "Bar"],
  [/^amenity=ice_cream$/, "CAFE", "Ice cream"],
  [/^tourism=museum$/, "SIGHT", "Museum"],
  [/^tourism=gallery$/, "SIGHT", "Gallery"],
  [/^tourism=viewpoint$/, "SIGHT", "Viewpoint"],
  [/^tourism=attraction$/, "SIGHT", "Attraction"],
  [/^historic=.+$/, "SIGHT", "Historic site"],
  [/^amenity=place_of_worship$/, "SIGHT", "Place of worship"],
  [/^shop=supermarket$/, "SHOP", "Supermarket"],
  [/^shop=convenience$/, "SHOP", "Grocery"],
  [/^shop=bakery$/, "SHOP", "Bakery"],
  [/^amenity=pharmacy$/, "SHOP", "Pharmacy"],
];

// Photon (komoot) — OpenStreetMap places around a point, answers in < 1 s. One request per category.
const PHOTON_TAGS: Record<PlaceCategory, { tags: string[]; radiusKm: number }> = {
  FOOD: { tags: ["amenity:restaurant", "amenity:fast_food"], radiusKm: 1.2 },
  CAFE: { tags: ["amenity:cafe", "amenity:bar", "amenity:pub", "amenity:ice_cream"], radiusKm: 1.2 },
  SIGHT: { tags: ["tourism:attraction", "tourism:museum", "tourism:viewpoint", "tourism:gallery", "historic:castle", "historic:fort", "historic:monument", "historic:archaeological_site"], radiusKm: 2 },
  SHOP: { tags: ["shop:supermarket", "shop:bakery", "shop:convenience", "amenity:pharmacy"], radiusKm: 1 },
};

async function photon(lat: number, lng: number): Promise<NearbyPlace[]> {
  const lists = await Promise.all((Object.keys(PHOTON_TAGS) as PlaceCategory[]).map(async (cat) => {
    const { tags, radiusKm } = PHOTON_TAGS[cat];
    const qs = `lat=${lat}&lon=${lng}&radius=${radiusKm}&limit=40&lang=en&` + tags.map((t) => `osm_tag=${encodeURIComponent(t)}`).join("&");
    const r = await fetch(`https://photon.komoot.io/reverse?${qs}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12_000) });
    if (!r.ok) throw new Error(`Photon ${r.status}`);
    const j = await r.json() as { features?: Array<{ properties: Record<string, unknown>; geometry: { coordinates: [number, number] } }> };
    return (j.features ?? []).map((f): NearbyPlace | null => {
      const p = f.properties;
      const name = typeof p.name === "string" ? p.name.trim() : "";
      const [pLng, pLat] = f.geometry.coordinates;
      if (!name) return null;
      const hit = OSM_KIND.find(([re]) => re.test(`${p.osm_key}=${p.osm_value}`));
      return {
        id: `osm-${p.osm_type}-${p.osm_id}`,
        name,
        category: cat,
        kind: hit?.[2] ?? CATEGORY_LABEL[cat],
        distance: distance(lat, lng, pLat, pLng),
        lat: pLat, lng: pLng,
        link: mapsLink(name, pLat, pLng),
      };
    }).filter((x): x is NearbyPlace => !!x);
  }));
  // Same name twice in a category (e.g. a node and a building) → keep the closer one
  const seen = new Set<string>();
  return lists.flat().sort((a, b) => a.distance - b.distance).filter((p) => {
    const k = `${p.category}:${p.name.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function overpass(lat: number, lng: number): Promise<NearbyPlace[]> {
  const q = `[out:json][timeout:20];(
nwr(around:1200,${lat},${lng})["name"]["amenity"~"^(restaurant|fast_food|cafe|bar|pub|ice_cream|pharmacy)$"];
nwr(around:1500,${lat},${lng})["name"]["tourism"~"^(attraction|museum|viewpoint|gallery)$"];
nwr(around:1500,${lat},${lng})["name"]["historic"~"^(monument|memorial|castle|fort|bridge|mosque|church|archaeological_site)$"];
nwr(around:1000,${lat},${lng})["name"]["shop"~"^(supermarket|convenience|bakery)$"];
);out center 500;`;
  type OsmResult = { elements?: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
  // Public Overpass servers are often busy or slow — ask all mirrors at once and take the first good answer
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let data: OsmResult;
  try {
    data = await Promise.any(OVERPASS_MIRRORS.map(async (host) => {
      const r = await fetch(host, {
        method: "POST",
        headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`${host} ${r.status}`);
      const j = await r.json() as OsmResult;
      if (!Array.isArray(j.elements)) throw new Error(`${host} no elements`);
      return j;
    }));
  } catch {
    throw new Error("OpenStreetMap did not answer");
  } finally {
    clearTimeout(timer);
    ctrl.abort(); // stop the slower mirrors
  }

  const out: NearbyPlace[] = [];
  const seen = new Set<string>();
  for (const el of data.elements ?? []) {
    const t = el.tags ?? {};
    const pLat = el.lat ?? el.center?.lat, pLng = el.lon ?? el.center?.lon;
    const name = (t["name:en"] && /[a-z]/i.test(t.name ?? "") === false ? t["name:en"] : t.name)?.trim();
    if (!name || pLat == null || pLng == null) continue;
    const keys = ["amenity", "tourism", "historic", "shop"].filter((k) => t[k]).map((k) => `${k}=${t[k]}`);
    const hit = keys.map((k) => OSM_KIND.find(([re]) => re.test(k))).find(Boolean);
    if (!hit) continue;
    const dedupe = `${hit[1]}:${name.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const cuisine = t.cuisine ? t.cuisine.split(";")[0].replace(/_/g, " ") : "";
    out.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      category: hit[1],
      kind: cuisine && hit[1] === "FOOD" ? `${hit[2]} · ${cuisine[0].toUpperCase()}${cuisine.slice(1)}` : hit[2],
      distance: distance(lat, lng, pLat, pLng),
      lat: pLat, lng: pLng,
      link: mapsLink(name, pLat, pLng),
    });
  }
  return out;
}

// ── Google Places (New) ─────────────────────────────────────────────────────────────────────────

const GOOGLE_TYPES: Record<PlaceCategory, string[]> = {
  FOOD: ["restaurant"],
  CAFE: ["cafe", "bar", "coffee_shop"],
  SIGHT: ["tourist_attraction", "museum", "historical_landmark"],
  SHOP: ["supermarket", "bakery", "pharmacy"],
};

async function google(lat: number, lng: number, key: string): Promise<NearbyPlace[]> {
  const res = await Promise.all((Object.keys(GOOGLE_TYPES) as PlaceCategory[]).map(async (cat) => {
    const r = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({
        includedTypes: GOOGLE_TYPES[cat],
        maxResultCount: PER_CATEGORY,
        rankPreference: "DISTANCE",
        languageCode: "en",
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: cat === "SIGHT" ? 2000 : 1200 } },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) throw new Error(`Google Places ${r.status}`);
    const j = await r.json() as { places?: Array<{ id: string; displayName?: { text: string }; location?: { latitude: number; longitude: number }; rating?: number; userRatingCount?: number; googleMapsUri?: string; primaryTypeDisplayName?: { text: string } }> };
    return (j.places ?? []).filter((p) => p.displayName?.text && p.location).map((p): NearbyPlace => ({
      id: `g-${p.id}`,
      name: p.displayName!.text,
      category: cat,
      kind: p.primaryTypeDisplayName?.text ?? CATEGORY_LABEL[cat],
      distance: distance(lat, lng, p.location!.latitude, p.location!.longitude),
      rating: p.rating, ratingCount: p.userRatingCount,
      lat: p.location!.latitude, lng: p.location!.longitude,
      link: p.googleMapsUri ?? mapsLink(p.displayName!.text, p.location!.latitude, p.location!.longitude),
    }));
  }));
  return res.flat();
}

/** Up to 10 closest places per category, closest first. */
export async function nearbyPlaces(lat: number, lng: number): Promise<Record<PlaceCategory, NearbyPlace[]>> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const osm = async () => {
    try { return await photon(lat, lng); } catch (e) {
      console.error("[nearby] Photon failed, trying Overpass:", e);
      return overpass(lat, lng);
    }
  };
  let all: NearbyPlace[];
  if (key) {
    try { all = await google(lat, lng, key); } catch (e) {
      console.error("[nearby] Google failed, using OpenStreetMap:", e);
      all = await osm();
    }
  } else {
    all = await osm();
  }
  const by: Record<PlaceCategory, NearbyPlace[]> = { FOOD: [], CAFE: [], SIGHT: [], SHOP: [] };
  for (const p of all.sort((a, b) => a.distance - b.distance)) {
    if (by[p.category].length < PER_CATEGORY && !by[p.category].some((x) => x.id === p.id)) by[p.category].push(p);
  }
  return by;
}

/** Nearby place → LOCAL_RECS entry of the guide */
export function toGuidePlace(p: Pick<NearbyPlace, "name" | "category" | "kind" | "distance" | "link" | "rating">) {
  const bits = [p.kind, walkText(p.distance)];
  if (p.rating) bits.push(`★ ${p.rating.toFixed(1)}`);
  return { name: p.name, category: CATEGORY_LABEL[p.category] ?? "", description: bits.join(" · "), link: p.link };
}

/** Address → coordinates (Photon / OpenStreetMap). Needs a town in the address. */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;
  try {
    const r = await fetch(`https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(address)}`, {
      headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const f = (await r.json()).features?.[0];
    return f ? { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] } : null;
  } catch {
    return null;
  }
}
