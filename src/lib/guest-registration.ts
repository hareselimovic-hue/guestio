import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { COUNTRY_CODES } from "@/lib/countries";

export interface RegisteredGuest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;    // YYYY-MM-DD
  sex: "M" | "F";
  citizenship: string;    // ISO 3166-1 alpha-2
  placeOfBirth: string;
  documentType: "PASSPORT" | "ID_CARD";
  documentNumber: string;
  documentExpiry: string; // YYYY-MM-DD
}

// ─── Encryption ───────────────────────────────────────────────────────────────
// Key is derived from BETTER_AUTH_SECRET so no extra env var is needed.
// Rotating that secret makes existing registrations unreadable.

function getKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return Buffer.from(hkdfSync("sha256", secret, "smartstay", "guest-registration-v1", 32));
}

export function encryptGuests(guests: RegisteredGuest[]): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(guests), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decryptGuests(payload: string): RegisteredGuest[] {
  const [, iv, tag, data] = payload.split(".");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const json = Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(json);
}

// ─── Notification recipients ──────────────────────────────────────────────────
// Workspace setting (Settings → Guest registrations) → workspace owner → property account.
// Properties without workspaceId fall back to the workspace their owner belongs to.

export async function getRegistrationRecipients(property: { workspaceId: string | null; userId: string }) {
  const ws = await prisma.workspace.findFirst({
    where: property.workspaceId
      ? { id: property.workspaceId }
      : { OR: [{ ownerId: property.userId }, { members: { some: { userId: property.userId } } }] },
    select: { registrationEmails: true, owner: { select: { email: true } } },
  });
  if (ws) return ws.registrationEmails.length > 0 ? ws.registrationEmails : [ws.owner.email];
  const user = await prisma.user.findUnique({ where: { id: property.userId }, select: { email: true } });
  return user ? [user.email] : [];
}

const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

/** Parses a comma/whitespace separated list; returns null if any entry is invalid. */
export function parseEmailList(input: string): string[] | null {
  const emails = [...new Set(input.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  return emails.every((e) => EMAIL_RE.test(e)) && emails.length <= 10 ? emails : null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(new Date(s + "T00:00:00Z").getTime());
}

function str(v: unknown, max = 100): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= max ? t : null;
}

export function parseGuest(raw: unknown): RegisteredGuest | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const firstName = str(g.firstName);
  const lastName = str(g.lastName);
  const placeOfBirth = str(g.placeOfBirth);
  const documentNumber = str(g.documentNumber, 50);
  const citizenship = str(g.citizenship, 2)?.toUpperCase() ?? null;
  if (!firstName || !lastName || !placeOfBirth || !documentNumber || !citizenship) return null;
  if (!COUNTRY_CODES.includes(citizenship)) return null;
  if (g.sex !== "M" && g.sex !== "F") return null;
  if (g.documentType !== "PASSPORT" && g.documentType !== "ID_CARD") return null;
  if (!isValidDate(g.dateOfBirth) || !isValidDate(g.documentExpiry)) return null;
  if (g.dateOfBirth > new Date().toISOString().slice(0, 10)) return null;
  return {
    firstName, lastName, placeOfBirth, documentNumber, citizenship,
    sex: g.sex, documentType: g.documentType,
    dateOfBirth: g.dateOfBirth, documentExpiry: g.documentExpiry,
  };
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function countryName(code: string, locale = "bs"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** YYYY-MM-DD → DD.MM.YYYY */
export function formatDateBs(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
