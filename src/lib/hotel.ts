import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { getRegistrationRecipients } from "@/lib/guest-registration";

export const SERVICE_KINDS = ["SERVICE", "MENU", "FACILITY"] as const;
export const REQUEST_TYPES = ["HOUSEKEEPING", "TOWELS", "ISSUE", "WAKEUP", "OTHER", "ORDER", "BOOKING"] as const;
export const REQUEST_STATUSES = ["NEW", "IN_PROGRESS", "DONE", "DECLINED"] as const;
export const GUEST_LANGS = ["EN", "DE", "TR", "IT"] as const;

/** Bosnian labels for staff (dashboard + emails) */
export const REQUEST_LABEL: Record<string, string> = {
  HOUSEKEEPING: "Čišćenje sobe",
  TOWELS: "Peškiri / posteljina",
  ISSUE: "Kvar / problem",
  WAKEUP: "Buđenje",
  OTHER: "Ostalo",
  ORDER: "Narudžba",
  BOOKING: "Rezervacija",
};

/** A property the signed-in user may manage (same rule as the property editor) */
export async function getManagedProperty(userId: string, propertyId: string) {
  const [wsIds, memberUserIds] = await Promise.all([getUserWorkspaceIds(userId), getWorkspaceMemberUserIds(userId)]);
  return prisma.property.findFirst({ where: { id: propertyId, ...propertyAccessWhere(userId, wsIds, memberUserIds) } });
}

export async function getManagedHotelIds(userId: string) {
  const [wsIds, memberUserIds] = await Promise.all([getUserWorkspaceIds(userId), getWorkspaceMemberUserIds(userId)]);
  const rows = await prisma.property.findMany({
    where: { kind: "HOTEL", ...propertyAccessWhere(userId, wsIds, memberUserIds) },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/**
 * Resolves the guest-facing context from slug + guide token.
 * Room links carry the room number; "preview" (the shared link) has none.
 */
export async function resolveHotelGuest(slug: unknown, token: unknown) {
  if (typeof slug !== "string" || typeof token !== "string") return null;
  const property = await prisma.property.findUnique({ where: { slug } });
  if (!property || property.kind !== "HOTEL") return null;
  if (token === "preview") return { property, guestLink: null };
  const guestLink = await prisma.guestLink.findUnique({ where: { token } });
  if (!guestLink || guestLink.propertyId !== property.id) return null;
  return { property, guestLink };
}

export function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Where a hotel's guest requests are emailed: its reception email, else the account / registration recipients */
export async function hotelRequestRecipients(property: { receptionEmail: string | null; workspaceId: string | null; userId: string }) {
  return property.receptionEmail ? [property.receptionEmail] : getRegistrationRecipients(property);
}

/** Emails the hotel reception. Best-effort. */
export async function notifyHotelStaff(
  property: { id: string; name: string; receptionEmail: string | null; workspaceId: string | null; userId: string },
  subject: string,
  rows: [string, string][],
  linkPath: string,
) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const to = await hotelRequestRecipients(property);
    if (to.length === 0) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";
    const table = rows
      .map(([k, v]) => `<tr><td style="padding:8px 12px;font-size:13px;color:#6B6B6B;border-bottom:1px solid #EDEDE9;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:8px 12px;font-size:14px;color:#262626;border-bottom:1px solid #EDEDE9;white-space:pre-wrap;">${escapeHtml(v)}</td></tr>`)
      .join("");
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba",
      to,
      subject,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:24px;">
<p style="margin:0 0 4px;font-size:13px;color:#FF6700;font-weight:700;text-transform:uppercase;">${escapeHtml(property.name)}</p>
<p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#262626;">${escapeHtml(subject)}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;border:1px solid #EDEDE9;border-radius:10px;margin:0 0 20px;">${table}</table>
<a href="${appUrl}${linkPath}" style="display:inline-block;background:#0F2F61;color:#fff;font-size:14px;font-weight:600;padding:11px 22px;border-radius:10px;text-decoration:none;">Otvori u SmartStay →</a>
</div>`,
    });
  } catch (err) {
    console.error("[hotel] staff notification failed:", err);
  }
}

// ─── Guest status emails ──────────────────────────────────────────────────────

export const EMAIL_RE = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;

const LANG_NAMES: Record<string, string> = { EN: "English", DE: "German", TR: "Turkish", IT: "Italian" };

/** Reception's short reply, translated into the guest's language (written in any language) */
export async function translateText(text: string, lang: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) return text;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Translate this short message from a hotel reception to a guest into ${LANG_NAMES[lang] ?? "English"}. Keep times, numbers and names unchanged. If it is already in that language, return it unchanged. Return ONLY the translated message.\n\n${text}`,
      }],
    });
    const out = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    return out || text;
  } catch (err) {
    console.error("[hotel] reply translation failed:", err);
    return text;
  }
}

const GUEST_MAIL: Record<string, {
  type: Record<string, string>;
  subject: Record<string, string>;
  body: Record<string, string>;
  room: string; reply: string; footer: string;
}> = {
  EN: {
    type: { HOUSEKEEPING: "Room cleaning", TOWELS: "Fresh towels", ISSUE: "Something's not working", WAKEUP: "Wake-up call", OTHER: "Your request", ORDER: "Room service order", BOOKING: "Your booking" },
    subject: { IN_PROGRESS: "We're on it", DONE: "Done", DECLINED: "About your request" },
    body: { IN_PROGRESS: "The reception has received your request and is taking care of it.", DONE: "Your request has been completed. Enjoy your stay!", DECLINED: "Unfortunately we can't fulfil this request. Please contact the reception if you have any questions." },
    room: "Room", reply: "Message from the reception", footer: "You're receiving this because you asked for updates on this request.",
  },
  DE: {
    type: { HOUSEKEEPING: "Zimmerreinigung", TOWELS: "Frische Handtücher", ISSUE: "Etwas funktioniert nicht", WAKEUP: "Weckruf", OTHER: "Ihr Wunsch", ORDER: "Zimmerservice-Bestellung", BOOKING: "Ihre Buchung" },
    subject: { IN_PROGRESS: "Wir kümmern uns darum", DONE: "Erledigt", DECLINED: "Zu Ihrem Wunsch" },
    body: { IN_PROGRESS: "Die Rezeption hat Ihren Wunsch erhalten und kümmert sich darum.", DONE: "Ihr Wunsch wurde erledigt. Genießen Sie Ihren Aufenthalt!", DECLINED: "Leider können wir diesen Wunsch nicht erfüllen. Bei Fragen wenden Sie sich bitte an die Rezeption." },
    room: "Zimmer", reply: "Nachricht der Rezeption", footer: "Sie erhalten diese E-Mail, weil Sie Updates zu diesem Wunsch angefordert haben.",
  },
  TR: {
    type: { HOUSEKEEPING: "Oda temizliği", TOWELS: "Temiz havlu", ISSUE: "Bir şey çalışmıyor", WAKEUP: "Uyandırma", OTHER: "İsteğiniz", ORDER: "Oda servisi siparişi", BOOKING: "Rezervasyonunuz" },
    subject: { IN_PROGRESS: "İlgileniyoruz", DONE: "Tamamlandı", DECLINED: "İsteğiniz hakkında" },
    body: { IN_PROGRESS: "Resepsiyon isteğinizi aldı ve ilgileniyor.", DONE: "İsteğiniz tamamlandı. İyi konaklamalar!", DECLINED: "Maalesef bu isteği yerine getiremiyoruz. Sorularınız için lütfen resepsiyonla iletişime geçin." },
    room: "Oda", reply: "Resepsiyondan mesaj", footer: "Bu isteğe ilişkin güncellemeler istediğiniz için bu e-postayı alıyorsunuz.",
  },
  IT: {
    type: { HOUSEKEEPING: "Pulizia camera", TOWELS: "Asciugamani puliti", ISSUE: "Qualcosa non funziona", WAKEUP: "Sveglia", OTHER: "La tua richiesta", ORDER: "Ordine servizio in camera", BOOKING: "La tua prenotazione" },
    subject: { IN_PROGRESS: "Ce ne stiamo occupando", DONE: "Fatto", DECLINED: "Riguardo alla tua richiesta" },
    body: { IN_PROGRESS: "La reception ha ricevuto la tua richiesta e se ne sta occupando.", DONE: "La tua richiesta è stata completata. Buon soggiorno!", DECLINED: "Purtroppo non possiamo soddisfare questa richiesta. Per domande contatta la reception." },
    room: "Camera", reply: "Messaggio dalla reception", footer: "Ricevi questa email perché hai chiesto aggiornamenti su questa richiesta.",
  },
};

/** Emails the guest about a status change of their request (only if they left an email). Best-effort. */
export async function sendGuestStatusEmail(
  request: { guestEmail: string | null; status: string; type: string; roomNumber: string | null; lang: string | null; items: unknown; staffReplyTranslated: string | null; staffReply: string | null },
  hotelName: string,
  replyTo: string | null,
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !request.guestEmail || !GUEST_MAIL.EN.subject[request.status]) return false;
  const m = GUEST_MAIL[request.lang ?? "EN"] ?? GUEST_MAIL.EN;
  const items = (request.items as { name: string; qty: number }[] | null) ?? [];
  const what = items.length ? items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.name}` : i.name)).join(", ") : m.type[request.type] ?? m.type.OTHER;
  const reply = request.staffReplyTranslated ?? request.staffReply;
  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: `${hotelName} via SmartStay <${process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba"}>`,
      to: request.guestEmail,
      ...(replyTo ? { replyTo } : {}),
      subject: `${m.subject[request.status]} — ${what}`,
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#262626;">
<p style="margin:0 0 4px;font-size:13px;color:#FF6700;font-weight:700;text-transform:uppercase;">${escapeHtml(hotelName)}${request.roomNumber ? ` · ${m.room} ${escapeHtml(request.roomNumber)}` : ""}</p>
<p style="margin:0 0 12px;font-size:22px;font-weight:700;">${escapeHtml(m.subject[request.status])}</p>
<p style="margin:0 0 16px;font-size:15px;color:#4A4A4A;line-height:1.6;"><strong>${escapeHtml(what)}</strong><br>${escapeHtml(m.body[request.status])}</p>
${reply ? `<div style="background:#F7F7F5;border-left:3px solid #0F2F61;border-radius:8px;padding:12px 14px;margin:0 0 16px;"><p style="margin:0 0 4px;font-size:12px;color:#6B6B6B;">${escapeHtml(m.reply)}</p><p style="margin:0;font-size:15px;line-height:1.5;">${escapeHtml(reply)}</p></div>` : ""}
<p style="margin:24px 0 0;font-size:12px;color:#BABAB5;">${escapeHtml(m.footer)}</p>
</div>`,
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("[hotel] guest status email failed:", err);
    return false;
  }
}

// Same rules as the section translator: never translate codes, times, links, media
const SKIP_FIELDS = new Set(["checkIn", "checkOut", "network", "password", "mapUrl", "phone", "url", "photoUrl", "videoUrl", "photos", "available", "paid", "parkingType", "checkInType", "links", "heroImage", "images"]);

/** Translates a room's own version of a section into DE/TR/IT (EN is the content itself). */
export async function translateSectionContent(content: Record<string, unknown>): Promise<Record<string, Record<string, unknown>> | null> {
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(content)) {
    if (SKIP_FIELDS.has(k)) continue;
    if (typeof v === "string" && v.trim()) fields[k] = v;
    if ((k === "rules" || k === "places") && Array.isArray(v)) fields[k] = JSON.stringify(v);
  }
  if (Object.keys(fields).length === 0 || !process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `Translate these hotel guest-guide fields from English to German, Turkish and Italian. Fields "rules" and "places" are JSON arrays as strings: translate the text inside and return them as JSON array strings. Keep names, codes and numbers unchanged.
Return ONLY JSON: {"DE": {...}, "TR": {...}, "IT": {...}}

${JSON.stringify(fields, null, 2)}`,
      }],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "";
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as Record<string, Record<string, string>>;
    const out: Record<string, Record<string, unknown>> = {};
    for (const lang of ["DE", "TR", "IT"]) {
      const merged: Record<string, unknown> = { ...content };
      for (const [k, v] of Object.entries(json[lang] ?? {})) {
        if (k === "rules" || k === "places") { try { merged[k] = JSON.parse(v); } catch {} }
        else if (typeof v === "string") merged[k] = v;
      }
      out[lang] = merged;
    }
    return out;
  } catch (err) {
    console.error("[hotel] room section translation failed:", err);
    return null;
  }
}

/**
 * Translates an announcement (written in any language, usually Bosnian or English)
 * into the guest guide languages. Falls back to the original text everywhere.
 */
export async function translateAnnouncement(message: string): Promise<Record<string, string>> {
  const fallback = Object.fromEntries(GUEST_LANGS.map((l) => [l, message]));
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Translate this short hotel announcement for guests into English, German, Turkish and Italian. Keep it short, friendly and natural; keep times, dates, names and numbers unchanged.
Return ONLY JSON: {"EN": "...", "DE": "...", "TR": "...", "IT": "..."}

Announcement:
${message}`,
      }],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "";
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(GUEST_LANGS.map((l) => [l, typeof json[l] === "string" && json[l] ? (json[l] as string) : message]));
  } catch (err) {
    console.error("[hotel] announcement translation failed:", err);
    return fallback;
  }
}
