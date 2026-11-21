export const PRICING_TIERS = [
  { name: "Starter", min: 1, max: 3, pricePerProperty: 9.99 },
  { name: "Standard", min: 4, max: 10, pricePerProperty: 7.99 },
  { name: "Pro", min: 11, max: Infinity, pricePerProperty: 5.99 },
] as const;

export interface MonthlyPrice {
  tierName: string;
  pricePerProperty: number;
  propertyCount: number;
  total: number;
}

/**
 * Monthly subscription price, recalculated fresh from the current property count.
 * No annual billing on purpose: locking in a discounted yearly rate would undercharge
 * a user who grows from e.g. 1 to 50 properties mid-year.
 */
export function calculateMonthlyPrice(propertyCount: number): MonthlyPrice {
  const count = Math.max(propertyCount, 1);
  const tier = PRICING_TIERS.find((t) => count >= t.min && count <= t.max) ?? PRICING_TIERS[PRICING_TIERS.length - 1];
  const total = Math.round(tier.pricePerProperty * count * 100) / 100;
  return { tierName: tier.name, pricePerProperty: tier.pricePerProperty, propertyCount: count, total };
}

// ─── Hotels (2026-11-21) ───────────────────────────────────────────────────────
// Same packages as smartstay.ba/hoteli/: price by number of rooms, all features included.
// Above 80 rooms (decided 2026-11-21): Veliki 169 KM + 1,50 KM for every room over 80.
export const HOTEL_PACKAGES = [
  { name: "Mini", maxRooms: 7, price: 59 },
  { name: "Mali", maxRooms: 15, price: 79 },
  { name: "Srednji", maxRooms: 40, price: 119 },
  { name: "Veliki", maxRooms: 80, price: 169 },
] as const;
export const HOTEL_EXTRA_ROOM_PRICE = 1.5;

export function hotelPackage(rooms: number): { name: string; price: number } {
  const r = Math.max(Math.round(rooms), 0);
  const pkg = HOTEL_PACKAGES.find((p) => r <= p.maxRooms);
  if (pkg) return { name: pkg.name, price: pkg.price };
  const big = HOTEL_PACKAGES[HOTEL_PACKAGES.length - 1];
  return { name: big.name, price: Math.round((big.price + (r - big.maxRooms) * HOTEL_EXTRA_ROOM_PRICE) * 100) / 100 };
}

/** 1 soba, 2–4 sobe, 5+ soba (21 soba, 22 sobe…) */
function roomsWord(n: number) {
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && !(h >= 12 && h <= 14) ? "sobe" : "soba";
}

export interface AccountPrice {
  total: number;
  /** Plan description stored on the payment/invoice, e.g. "Standard (5 apt.) + Hotel Srednji (20 soba)" */
  label: string;
  /** Apartments + hotels (what the invoice line counts as "obj.") */
  propertyCount: number;
  apartments: MonthlyPrice | null;
  hotels: { rooms: number; name: string; price: number }[];
}

/** Monthly price of a whole account: apartments by the per-property tiers, every hotel by its room package. */
export function calculateAccountPrice(apartmentCount: number, hotelRooms: number[]): AccountPrice {
  const apartments = apartmentCount > 0 || hotelRooms.length === 0 ? calculateMonthlyPrice(apartmentCount) : null;
  const hotels = hotelRooms.map((rooms) => ({ rooms, ...hotelPackage(rooms) })).map(({ rooms, name, price }) => ({ rooms, name, price }));
  const total = Math.round(((apartments?.total ?? 0) + hotels.reduce((s, h) => s + h.price, 0)) * 100) / 100;
  const parts = [
    ...(apartments ? [`${apartments.tierName} (${apartments.propertyCount} apt.)`] : []),
    ...hotels.map((h) => `Hotel ${h.name} (${h.rooms} ${roomsWord(h.rooms)})`),
  ];
  return { total, label: parts.join(" + "), propertyCount: (apartments?.propertyCount ?? 0) + hotels.length, apartments, hotels };
}
