import { prisma } from "@/lib/prisma";
import { translateSections } from "@/lib/translate";
import { TODO } from "@/lib/prospect-create";

/** Admin edits of a ready-made (prospect) guide before it reaches the owner — site requests and outreach. */

export const EDIT_FIELDS = ["welcome", "wifiNetwork", "wifiPassword", "checkIn", "checkOut", "instructions", "phone"] as const;
export type ProspectFields = Record<(typeof EDIT_FIELDS)[number], string>;

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export async function prospectFields(propertyId: string): Promise<ProspectFields> {
  const sections = await prisma.section.findMany({
    where: { propertyId, type: { in: ["WELCOME", "WIFI", "CHECKIN", "CONTACT"] } },
    select: { type: true, content: true },
  });
  const val = (type: string, key: string) => {
    const v = (sections.find((s) => s.type === type)?.content as Record<string, unknown> | undefined)?.[key];
    return typeof v === "string" && v !== TODO ? v : "";
  };
  return {
    welcome: val("WELCOME", "message"), wifiNetwork: val("WIFI", "network"), wifiPassword: val("WIFI", "password"),
    checkIn: val("CHECKIN", "checkIn"), checkOut: val("CHECKIN", "checkOut"), instructions: val("CHECKIN", "instructions"),
    phone: val("CONTACT", "phone"),
  };
}

/** Only sent fields change; changed text sections are re-translated. Fails once the guide was claimed. */
export async function updateProspectFields(propertyId: string, b: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, prospectToken: true, sections: { select: { id: true, type: true, content: true } } },
  });
  if (!prop?.prospectToken) return { ok: false, error: "Vodič je već preuzet ili istekao" };

  const pick = (key: string, field: string, max?: number) => (str(b[field], max) !== undefined ? { [key]: str(b[field], max)! } : {});
  const patches: Record<string, Record<string, string>> = {
    WELCOME: pick("message", "welcome"),
    WIFI: { ...pick("network", "wifiNetwork", 120), ...pick("password", "wifiPassword", 120) },
    CHECKIN: { ...pick("checkIn", "checkIn", 10), ...pick("checkOut", "checkOut", 10), ...pick("instructions", "instructions") },
    CONTACT: pick("phone", "phone", 40),
  };

  const changed: string[] = [];
  for (const [type, patch] of Object.entries(patches)) {
    if (!Object.keys(patch).length) continue;
    const s = prop.sections.find((x) => x.type === type);
    if (!s) continue;
    // An emptied WiFi/check-in field shows the "— dopunite —" hint again instead of a blank
    const clean = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v || (type === "WIFI" || k === "instructions" ? TODO : v)]));
    await prisma.section.update({ where: { id: s.id }, data: { content: { ...(s.content as object), ...clean } } });
    if (type !== "WIFI" && type !== "CONTACT") changed.push(s.id); // codes/numbers need no translation
  }
  if (changed.length) {
    try { await translateSections(prop.id, changed); } catch (e) { console.error("[prospect-edit] re-translate failed:", e); }
  }
  return { ok: true };
}
