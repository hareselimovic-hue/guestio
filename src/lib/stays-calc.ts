// Čista logika kalendara/cijena — koristi je i server (izvor istine za cijenu) i klijent (prikaz).

export interface DayInfo {
  date: string; // YYYY-MM-DD
  available: boolean; // noć se može rezervisati
  price: number | null;
  minStay: number;
}

export type Calendar = Record<string, DayInfo>;

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
}

export type QuoteResult =
  | { ok: true; nights: number; nightly: { date: string; price: number }[]; subtotal: number }
  | { ok: false; reason: string };

export function quoteStay(cal: Calendar, checkIn: string, checkOut: string): QuoteResult {
  const nights = nightsBetween(checkIn, checkOut);
  if (!(nights >= 1)) return { ok: false, reason: "Check-out must be after check-in." };
  const nightly: { date: string; price: number }[] = [];
  for (let i = 0; i < nights; i++) {
    const day = cal[addDays(checkIn, i)];
    if (!day || !day.available) return { ok: false, reason: "Some of these nights are not available." };
    if (day.price == null) return { ok: false, reason: "Price is not available for these dates." };
    nightly.push({ date: day.date, price: day.price });
  }
  const minStay = cal[checkIn]?.minStay ?? 1;
  if (nights < minStay) return { ok: false, reason: `Minimum stay for this arrival date is ${minStay} nights.` };
  return { ok: true, nights, nightly, subtotal: nightly.reduce((s, n) => s + n.price, 0) };
}

export function applyDiscount(subtotal: number, percent: number) {
  const discount = Math.round(subtotal * percent) / 100;
  return { discount, total: Math.round((subtotal - discount) * 100) / 100 };
}

export function sarajevoToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Sarajevo" });
}
