import type { Calendar } from "./stays-calc";
import { addDays } from "./stays-calc";

const BASE = "https://api.rentl.io/v1";
const CACHE_TTL_MS = 45_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Rentlio ograničava broj poziva (429), pa ponovni pokušaj s razmakom za 429/5xx/timeout.
async function rentlioGet<T>(path: string): Promise<{ data: T[]; total: number }> {
  const key = process.env.RENTLIO_API_KEY;
  if (!key) throw new Error("RENTLIO_API_KEY nije postavljen");
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await sleep(400 * attempt);
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { apikey: key }, cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (res.ok) return res.json();
      lastErr = new Error(`Rentlio ${res.status} na ${path}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// Rentlio straniči po 100 dana (rates/restrictions); availability vraća sve odjednom.
async function allPages<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, total } = await rentlioGet<T>(`${path}&page=${page}`);
    out.push(...data);
    if (!data.length || out.length >= total) break;
  }
  return out;
}

async function loadCalendar(unitTypeId: number, from: string, daysAhead: number): Promise<Calendar> {
  // Dostupnost postoji samo do horizonta koji je otvoren u Rentliu — cijene tražimo samo do tog dana
  // (cijela godina cijena pravila ~10 poziva po upitu i izazivala 429).
  const avail = await allPages<{ date: string; availability: number }>(
    `/unit-types/${unitTypeId}/availability?dateFrom=${from}&dateTo=${addDays(from, daysAhead)}`,
  );
  if (!avail.length) return {};
  const last = avail.reduce((m, a) => (a.date > m ? a.date : m), from);
  const q = `?dateFrom=${from}&dateTo=${addDays(last, 1)}`;
  const rates = await allPages<{ date: string; price: number }>(`/unit-types/${unitTypeId}/rates${q}`);
  const restr = await allPages<{ date: string; minStay: number | null; closed: boolean }>(`/unit-types/${unitTypeId}/restrictions${q}`);

  const price = new Map(rates.map((r) => [r.date, r.price]));
  const rule = new Map(restr.map((r) => [r.date, r]));
  const cal: Calendar = {};
  for (const a of avail) {
    const r = rule.get(a.date);
    cal[a.date] = {
      date: a.date,
      available: a.availability > 0 && !r?.closed && price.has(a.date),
      price: price.get(a.date) ?? null,
      minStay: r?.minStay ?? 1,
    };
  }
  return cal;
}

const cache = new Map<string, { at: number; cal: Promise<Calendar> }>();

// Kalendar jednog apartmana. Noć je dostupna samo ako Rentlio ima dostupnost > 0 i dan nije zatvoren.
// Za prikaz se koristi kratki keš (45 s); `fresh: true` (npr. neposredno prije naplate) uvijek čita Rentlio.
export function fetchCalendar(unitTypeId: number, from: string, opts: { fresh?: boolean; daysAhead?: number } = {}): Promise<Calendar> {
  const daysAhead = opts.daysAhead ?? 365;
  const k = `${unitTypeId}:${from}:${daysAhead}`;
  const hit = cache.get(k);
  if (!opts.fresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.cal;
  const cal = loadCalendar(unitTypeId, from, daysAhead);
  cache.set(k, { at: Date.now(), cal });
  cal.catch(() => cache.delete(k)); // greška se ne kešira
  return cal;
}
