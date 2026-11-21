// Feature flags (client-safe — no server imports here)

export const ADMIN_EMAIL = "hareselimovic@gmail.com";

/**
 * Hotel mode for everyone (public since 2026-11-21: anyone can register as a hotel; billing uses the room
 * packages in lib/pricing.ts). Set to false to go back to admin + hotel-page leads only (userCanUseHotels()).
 */
export const HOTELS_PUBLIC = true;
