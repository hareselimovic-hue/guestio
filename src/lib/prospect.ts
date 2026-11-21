import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** Ready-made outreach guides ("prospects"): see Property.prospect* in the schema. */

export const PROSPECT_DAYS = 30;
// Unclaimed guides belong to the admin's own account (since 2026-11-21) so the admin can open them in the
// normal editor / hotel panel from /dashboard/vodici. They are hidden from the admin's lists (prospectToken
// filter); claiming moves them to the new owner. (Before: system user outreach@smartstay.local.)
export const PROSPECT_OWNER_EMAIL = process.env.PROSPECT_OWNER_EMAIL ?? "hareselimovic@gmail.com";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";

export function newProspectToken(): string {
  return randomBytes(24).toString("base64url"); // 192-bit
}

export function prospectGuideUrl(slug: string, token: string): string {
  return `${APP_URL}/g/${slug}/${token}`;
}

export function prospectClaimPath(token: string): string {
  return `/preuzmi/${token}`;
}

/** A guide that can still be viewed/claimed by its token, or null. */
export async function findOpenProspect(token: string) {
  if (!token || token.length < 20) return null;
  const p = await prisma.property.findFirst({
    where: { prospectToken: token },
    select: { id: true, name: true, slug: true, kind: true, prospectEmail: true, prospectExpiresAt: true },
  });
  if (!p || (p.prospectExpiresAt && p.prospectExpiresAt < new Date())) return null;
  return p;
}

/** Deletes unclaimed outreach guides whose 30 days are over (daily cron). */
export async function deleteExpiredProspects(): Promise<number> {
  const { count } = await prisma.property.deleteMany({
    where: { prospectToken: { not: null }, prospectClaimedAt: null, prospectExpiresAt: { lt: new Date() } },
  });
  return count;
}

/** Bearer token check for the sales agent API. */
export function isProspectApiAuthorized(authorization: string | null): boolean {
  const secret = process.env.PROSPECT_API_TOKEN;
  return !!secret && secret.length >= 24 && authorization === `Bearer ${secret}`;
}
