// Feature flags

const ADMIN_EMAIL = "hareselimovic@gmail.com";

/** Hotel mode (hotel properties, rooms, reception requests…). Admin-only until it's opened to everyone. */
export const HOTELS_PUBLIC = false;

export function canUseHotels(email: string | null | undefined) {
  return HOTELS_PUBLIC || email === ADMIN_EMAIL;
}
