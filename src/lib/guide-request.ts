import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { APP_URL, prospectGuideUrl, prospectClaimPath } from "@/lib/prospect";
import { createProspectGuide, TODO } from "@/lib/prospect-create";
import { readAirbnb, readWebsite, composeGuide, firstWorkingPhoto, type RawListing } from "@/lib/listing-import";

/** "Vodič iz linka" flow — see the GuideRequest model. */

export const MAX_ATTEMPTS = 3;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export const reviewUrl = (id: string) => `${APP_URL}/dashboard/guide-requests/${id}`;

/** Asks the headless-browser worker to run now (optional; without the token it runs on its schedule). */
async function wakeWorker() {
  const token = process.env.GITHUB_WORKER_TOKEN, repo = process.env.GITHUB_WORKER_REPO;
  if (!token || !repo) return;
  try {
    await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "guide-request" }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error("[guide-request] worker dispatch failed:", e);
  }
}

/** Right after the visitor submits: Airbnb/websites are read here, Booking (or a failed read) goes to the worker. */
export async function processGuideRequest(id: string): Promise<void> {
  const req = await prisma.guideRequest.findUnique({ where: { id } });
  if (!req || req.status !== "NEW") return;
  if (req.platform === "BOOKING") {
    await prisma.guideRequest.update({ where: { id }, data: { status: "NEEDS_BROWSER" } });
    await wakeWorker();
    return;
  }
  try {
    const raw = req.platform === "AIRBNB" ? await readAirbnb(req.url) : await readWebsite(req.url);
    await buildFromRaw(id, raw);
  } catch (e) {
    // Blocked from the server or unreadable → let the browser worker try
    console.error("[guide-request] direct read failed, handing to worker:", e);
    await prisma.guideRequest.update({ where: { id }, data: { status: "NEEDS_BROWSER", error: String(e).slice(0, 300) } });
    await wakeWorker();
  }
}

/** Listing data → guide → admin review email. Used directly and by the worker callback. */
export async function buildFromRaw(id: string, raw: RawListing): Promise<{ ok: boolean; error?: string }> {
  const req = await prisma.guideRequest.findUnique({ where: { id } });
  if (!req) return { ok: false, error: "not found" };
  if (req.status === "READY" || req.status === "SENT") return { ok: true };
  const kind = req.kind === "HOTEL" ? "HOTEL" : "APARTMENT";
  try {
    const composed = await composeGuide(raw, kind);
    const coverImage = await firstWorkingPhoto(raw.photos);
    const r = await createProspectGuide(
      { ...composed, email: req.email, kind, source: req.url, coverImage },
      { internalLabel: "Sa sajta" },
    );
    // An open guide for this email already exists (e.g. outreach made one) → review that one
    const propertyId = r.ok ? r.id : r.status === 409 ? r.id : undefined;
    if (!propertyId) throw new Error(r.ok ? "no id" : r.error);
    await prisma.guideRequest.update({
      where: { id },
      data: { status: "READY", propertyId, raw: raw as object, error: r.ok ? null : "Postojeći vodič za ovaj email" },
    });
    await notifyAdmin(id);
    return { ok: true };
  } catch (e) {
    await failRequest(id, String(e).slice(0, 300), raw);
    return { ok: false, error: String(e) };
  }
}

export async function failRequest(id: string, error: string, raw?: RawListing) {
  const req = await prisma.guideRequest.update({
    where: { id },
    data: { status: "FAILED", error, attempts: { increment: 1 }, ...(raw ? { raw: raw as object } : {}) },
  });
  await sendMail(ADMIN_EMAIL, `Vodič iz linka: nisam uspio (${req.email})`, adminShell(`
    <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#262626;">Nisam uspio napraviti vodič</p>
    <p style="margin:0 0 6px;font-size:14px;color:#6B6B6B;"><b>Email:</b> ${esc(req.email)}<br>
    <b>Link:</b> <a href="${esc(req.url)}">${esc(req.url)}</a><br><b>Razlog:</b> ${esc(error)}</p>
    <p style="margin:12px 0 0;font-size:14px;color:#6B6B6B;">Posjetilac čeka vodič na mail. Napravi ga ručno (agent ili create_guide.py), ili mu se javi.</p>
    ${button(reviewUrl(id), "Otvori zahtjev")}`));
}

function button(href: string, label: string, color = "#FF6700") {
  return `<p style="margin:18px 0 0;"><a href="${esc(href)}" style="display:inline-block;background:${color};color:#fff;font-size:15px;font-weight:700;padding:12px 22px;border-radius:10px;text-decoration:none;">${esc(label)}</a></p>`;
}

function adminShell(inner: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #EDEDE9;border-radius:16px;"><tr><td style="padding:28px;">
${inner}
</td></tr></table></td></tr></table></body></html>`;
}

async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] mail to ${to}: ${subject}`);
    return;
  }
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba", to, subject, html, replyTo: "info@smartstay.ba",
  });
}

/** What the guide has / still misses — for the admin email and the review page. */
export async function guideChecklist(propertyId: string) {
  const p = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { name: true, slug: true, coverImage: true, address: true, prospectToken: true, sections: { select: { type: true, content: true } }, hotelServices: { select: { id: true } } },
  });
  if (!p) return null;
  const sec = (t: string) => (p.sections.find((s) => s.type === t)?.content ?? {}) as Record<string, unknown>;
  const filled = (v: unknown) => typeof v === "string" && v.trim() !== "" && v !== TODO;
  const rules = sec("HOUSE_RULES").rules, places = sec("LOCAL_RECS").places;
  const have: [string, boolean][] = [
    ["Naslovna slika", !!p.coverImage],
    ["Poruka dobrodošlice", filled(sec("WELCOME").message)],
    ["Adresa / lokacija", filled(p.address) || filled(sec("LOCATION").address)],
    ["Kućni red", Array.isArray(rules) && rules.length > 0],
    ["Lokalne preporuke", Array.isArray(places) && places.length > 0],
    ["Znanje za AI asistenta", filled(sec("AI_CONTEXT").body)],
    ["WiFi", filled(sec("WIFI").network) && filled(sec("WIFI").password)],
    ["Upute za ulaz (check-in)", filled(sec("CHECKIN").instructions)],
    ["Kontakt telefon", filled(sec("CONTACT").phone)],
  ];
  return { name: p.name, url: p.prospectToken ? prospectGuideUrl(p.slug, p.prospectToken) : null, token: p.prospectToken, have, services: p.hotelServices.length };
}

export async function notifyAdmin(id: string) {
  const req = await prisma.guideRequest.findUnique({ where: { id } });
  if (!req?.propertyId) return;
  const c = await guideChecklist(req.propertyId);
  if (!c) return;
  const rows = c.have.map(([label, ok]) =>
    `<tr><td style="padding:3px 0;font-size:14px;color:${ok ? "#262626" : "#B45309"};">${ok ? "✅" : "⚠️"} ${esc(label)}${ok ? "" : " — dopuni"}</td></tr>`).join("");
  await sendMail(ADMIN_EMAIL, `Novi vodič čeka odobrenje: ${c.name}`, adminShell(`
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#FF6700;text-transform:uppercase;letter-spacing:.5px;">Vodič iz linka · ${req.platform === "AIRBNB" ? "Airbnb" : req.platform === "BOOKING" ? "Booking" : "sajt"}${req.kind === "HOTEL" ? " · hotel" : ""}</p>
    <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#262626;">${esc(c.name)}</p>
    <p style="margin:0 0 14px;font-size:14px;color:#6B6B6B;"><b>Email:</b> ${esc(req.email)}<br>
    <b>Link:</b> <a href="${esc(req.url)}">${esc(req.url)}</a>${req.error ? `<br><b>Napomena:</b> ${esc(req.error)}` : ""}</p>
    <table cellpadding="0" cellspacing="0">${rows}</table>
    ${c.url ? button(c.url, "Pogledaj vodič", "#0F2F61") : ""}
    ${button(reviewUrl(id), "Dopuni i odobri →")}
    <p style="margin:14px 0 0;font-size:12px;color:#9A9A95;">Posjetilac ništa ne dobija dok ne klikneš „Odobri i pošalji“ na stranici zahtjeva.</p>`));
  await prisma.guideRequest.update({ where: { id }, data: { notifiedAt: new Date() } });
}

/** Right when a visitor leaves a link: short heads-up to info@smartstay.ba (the review email follows when the guide is ready). */
export async function notifyNewLead(req: { id: string; email: string; url: string; platform: string; kind: string; lang: string; createdAt: Date }) {
  const platform = req.platform === "AIRBNB" ? "Airbnb" : req.platform === "BOOKING" ? "Booking" : "sajt";
  await sendMail("info@smartstay.ba", `Neko je ostavio link: ${req.email}`, adminShell(`
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#FF6700;text-transform:uppercase;letter-spacing:.5px;">Novi lead sa sajta · ${platform}${req.kind === "HOTEL" ? " · hotel" : ""}</p>
    <p style="margin:0 0 12px;font-size:20px;font-weight:700;color:#262626;">Neko je ostavio link za vodič</p>
    <p style="margin:0 0 12px;font-size:14px;color:#6B6B6B;line-height:1.7;"><b>Email:</b> ${esc(req.email)}<br>
    <b>Link:</b> <a href="${esc(req.url)}">${esc(req.url)}</a><br>
    <b>Jezik:</b> ${req.lang === "en" ? "engleski" : "bosanski"}<br>
    <b>Vrijeme:</b> ${req.createdAt.toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo" })}</p>
    <p style="margin:0;font-size:14px;color:#6B6B6B;">Vodič se upravo pravi. Kad bude gotov, na ${esc(ADMIN_EMAIL)} stiže mail „Novi vodič čeka odobrenje“${req.platform === "BOOKING" ? " (Booking: do sat vremena)" : ""}.</p>
    ${button(reviewUrl(req.id), "Otvori zahtjev")}`));
}

/** Admin approved → the visitor gets their guide (view + claim). */
export async function sendToVisitor(id: string): Promise<{ ok: boolean; error?: string }> {
  const req = await prisma.guideRequest.findUnique({ where: { id } });
  if (!req?.propertyId) return { ok: false, error: "Zahtjev nema vodič" };
  if (req.sentAt) return { ok: false, error: "Već poslano" };
  const c = await guideChecklist(req.propertyId);
  if (!c?.url || !c.token) return { ok: false, error: "Vodič više nije dostupan (preuzet ili istekao)" };
  const claim = `${APP_URL}${prospectClaimPath(c.token)}`;
  const en = req.lang === "en";
  const t = en
    ? { subject: `Your guest guide for ${c.name} is ready`, title: `Your guest guide for ${c.name} is ready`,
        intro: "We built it from your listing: welcome, location, house rules, local tips and an AI assistant that answers guests in their language. Add your WiFi and check-in details and it's ready for your next guest.",
        view: "View your guide", claim: "Make it mine — free for 30 days →", note: "No credit card. The guide stays private until you share it, and is deleted after 30 days if you don't claim it." }
    : { subject: `Vaš vodič za goste za ${c.name} je spreman`, title: `Vaš vodič za ${c.name} je spreman`,
        intro: "Napravili smo ga iz vašeg oglasa: dobrodošlica, lokacija, kućni red, lokalne preporuke i AI asistent koji gostima odgovara na njihovom jeziku. Dopunite WiFi i upute za ulaz i spreman je za sljedećeg gosta.",
        view: "Pogledajte vodič", claim: "Preuzmite ga besplatno (30 dana) →", note: "Bez kreditne kartice. Vodič vidite samo vi dok ga ne podijelite, a ako ga ne preuzmete, briše se nakon 30 dana." };
  await sendMail(req.email, t.subject, `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="padding-bottom:24px;text-align:center;"><span style="font-size:22px;font-weight:800;color:#0F2F61;">SmartStay</span></td></tr>
<tr><td style="background:#fff;border:1px solid #EDEDE9;border-radius:16px;padding:32px;">
<p style="margin:0 0 10px;font-size:22px;font-weight:700;color:#262626;line-height:1.3;">${esc(t.title)}</p>
<p style="margin:0 0 6px;font-size:15px;color:#6B6B6B;line-height:1.6;">${esc(t.intro)}</p>
${button(c.url, t.view, "#0F2F61")}
${button(claim, t.claim)}
<p style="margin:20px 0 0;font-size:12px;color:#9A9A95;line-height:1.6;">${esc(t.note)}</p>
</td></tr>
<tr><td style="padding-top:18px;text-align:center;font-size:12px;color:#BABAB5;">SmartStay · info@smartstay.ba</td></tr>
</table></td></tr></table></body></html>`);
  await prisma.guideRequest.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
  return { ok: true };
}
