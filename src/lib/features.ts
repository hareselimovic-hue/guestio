// Feature flags (client-safe — no server imports here)

export const ADMIN_EMAIL = "hareselimovic@gmail.com";

/**
 * Hotel mode for everyone. While false, only the admin and users with hotel access
 * (signed up via smartstay.ba/hoteli/, or switched on in Admin) get it — see userCanUseHotels().
 */
export const HOTELS_PUBLIC = false;
