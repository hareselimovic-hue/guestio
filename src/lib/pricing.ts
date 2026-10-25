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
