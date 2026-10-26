import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { DEJAVU_SANS, DEJAVU_SANS_BOLD } from "@/lib/fonts/dejavu";

export const ISSUER = {
  name: "TB d.o.o.",
  address: "Derviša Numića br. 4, 71000 Sarajevo, BiH",
  idBroj: "4203112820003",
  racun: "1322602026473391",
  banka: "NLB Banka d.d. Sarajevo",
  email: "info@smartstay.ba",
};

const NAVY = rgb(15 / 255, 47 / 255, 97 / 255);
const ORANGE = rgb(1, 103 / 255, 0);
const TEXT = rgb(38 / 255, 38 / 255, 38 / 255);
const MUTED = rgb(107 / 255, 107 / 255, 107 / 255);
const LINE = rgb(237 / 255, 237 / 255, 233 / 255);
const GREEN = rgb(22 / 255, 128 / 255, 61 / 255);

export interface BillingParty {
  name: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  idBroj: string | null;
  email: string;
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Sarajevo" });
}

export function fmtKM(n: number): string {
  return `${n.toFixed(2).replace(".", ",")} KM`;
}

async function setup() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(Buffer.from(DEJAVU_SANS, "base64"), { subset: true });
  const bold = await doc.embedFont(Buffer.from(DEJAVU_SANS_BOLD, "base64"), { subset: true });
  const page = doc.addPage([595.28, 841.89]); // A4
  return { doc, page, regular, bold };
}

function header(page: PDFPage, bold: PDFFont, regular: PDFFont, title: string, subtitle: string) {
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: NAVY });
  page.drawText("Smart", { x: 48, y: height - 55, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Stay", { x: 48 + bold.widthOfTextAtSize("Smart", 22), y: height - 55, size: 22, font: bold, color: ORANGE });
  const tw = bold.widthOfTextAtSize(title, 18);
  page.drawText(title, { x: width - 48 - tw, y: height - 50, size: 18, font: bold, color: rgb(1, 1, 1) });
  const sw = regular.widthOfTextAtSize(subtitle, 10);
  page.drawText(subtitle, { x: width - 48 - sw, y: height - 68, size: 10, font: regular, color: rgb(0.8, 0.85, 0.95) });
}

function block(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, x: number, y: number, label: string, lines: (string | null | undefined)[]) {
  page.drawText(label.toUpperCase(), { x, y, size: 8, font: fonts.bold, color: MUTED });
  let cy = y - 16;
  lines.filter(Boolean).forEach((l, i) => {
    page.drawText(l as string, { x, y: cy, size: 10, font: i === 0 ? fonts.bold : fonts.regular, color: TEXT });
    cy -= 14;
  });
  return cy;
}

function footer(page: PDFPage, regular: PDFFont, lines: string[]) {
  let y = 70;
  for (const l of lines) {
    page.drawText(l, { x: 48, y, size: 8.5, font: regular, color: MUTED });
    y -= 12;
  }
}

function buyerLines(b: BillingParty) {
  return [
    b.name,
    b.address,
    [b.postcode, b.city].filter(Boolean).join(" ") || null,
    b.idBroj ? `ID broj: ${b.idBroj}` : null,
    b.email,
  ];
}

function issuerLines() {
  return [ISSUER.name, ISSUER.address, `ID broj: ${ISSUER.idBroj}`, `Račun: ${ISSUER.racun}`, ISSUER.banka];
}

/** Invoice PDF — always issued after payment (card or bank transfer). */
export async function buildInvoicePdf(inv: {
  number: string;
  issuedAt: Date;
  method: string;
  amount: number;
  propertyCount: number;
  pricePerProperty: number;
  tierName: string;
  periodFrom: Date;
  periodTo: Date;
  buyer: BillingParty;
}): Promise<Uint8Array> {
  const { doc, page, regular, bold } = await setup();
  const fonts = { regular, bold };
  const { width, height } = page.getSize();

  header(page, bold, regular, "FAKTURA", `Broj: ${inv.number}`);

  let y = height - 130;
  page.drawText(`Datum izdavanja: ${fmtDate(inv.issuedAt)}`, { x: 48, y, size: 10, font: regular, color: TEXT });
  page.drawText(`Mjesto izdavanja: Sarajevo`, { x: 300, y, size: 10, font: regular, color: TEXT });

  y -= 40;
  const y1 = block(page, fonts, 48, y, "Izdavalac", issuerLines());
  const y2 = block(page, fonts, 300, y, "Kupac", buyerLines(inv.buyer));
  y = Math.min(y1, y2) - 24;

  // Items table
  const cols = [48, 330, 400, 470];
  page.drawRectangle({ x: 40, y: y - 6, width: width - 80, height: 22, color: rgb(247 / 255, 247 / 255, 245 / 255) });
  ["Opis", "Količina", "Cijena", "Iznos"].forEach((h, i) =>
    page.drawText(h, { x: cols[i], y, size: 9, font: bold, color: MUTED }),
  );
  y -= 28;
  page.drawText(`SmartStay pretplata — ${inv.tierName} plan`, { x: cols[0], y, size: 10, font: bold, color: TEXT });
  page.drawText(`${inv.propertyCount} obj.`, { x: cols[1], y, size: 10, font: regular, color: TEXT });
  page.drawText(fmtKM(inv.pricePerProperty), { x: cols[2], y, size: 10, font: regular, color: TEXT });
  page.drawText(fmtKM(inv.amount), { x: cols[3], y, size: 10, font: regular, color: TEXT });
  y -= 14;
  page.drawText(`Period: ${fmtDate(inv.periodFrom)} – ${fmtDate(inv.periodTo)}`, { x: cols[0], y, size: 9, font: regular, color: MUTED });
  y -= 16;
  page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y }, thickness: 1, color: LINE });

  y -= 28;
  page.drawText("UKUPNO", { x: 330, y, size: 10, font: bold, color: TEXT });
  const total = fmtKM(inv.amount);
  page.drawText(total, { x: width - 48 - bold.widthOfTextAtSize(total, 14), y: y - 2, size: 14, font: bold, color: NAVY });

  // Paid stamp
  y -= 50;
  const stamp = inv.method === "CARD" ? "PLAĆENO KARTIČNO" : "PLAĆENO VIRMANOM";
  const sw = bold.widthOfTextAtSize(stamp, 12);
  page.drawRectangle({ x: 48, y: y - 8, width: sw + 24, height: 26, borderColor: GREEN, borderWidth: 1.5, color: rgb(240 / 255, 253 / 255, 244 / 255) });
  page.drawText(stamp, { x: 60, y: y, size: 12, font: bold, color: GREEN });

  footer(page, regular, [
    "Izdavalac nije registrovan kao obveznik PDV-a; iznos ne sadrži PDV.",
    "Dokument je izdat elektronski i važi bez pečata i potpisa.",
    `${ISSUER.name} · ${ISSUER.email} · app.smartstay.ba`,
  ]);

  return doc.save();
}

/** Payment instructions for bank transfer (virman) — not an invoice. */
export async function buildPaymentInstructionsPdf(p: {
  reference: string;
  createdAt: Date;
  dueDate: Date;
  amount: number;
  propertyCount: number;
  tierName: string;
  payer: BillingParty;
}): Promise<Uint8Array> {
  const { doc, page, regular, bold } = await setup();
  const fonts = { regular, bold };
  const { height } = page.getSize();

  header(page, bold, regular, "UPUTSTVO ZA UPLATU", `Datum: ${fmtDate(p.createdAt)}`);

  let y = height - 135;
  page.drawText("Molimo izvršite uplatu za SmartStay pretplatu prema podacima ispod.", { x: 48, y, size: 11, font: regular, color: TEXT });

  y -= 36;
  const rows: [string, string][] = [
    ["Primalac", `${ISSUER.name}, ${ISSUER.address}`],
    ["Račun primaoca", ISSUER.racun],
    ["Banka", ISSUER.banka],
    ["Iznos", fmtKM(p.amount)],
    ["Poziv na broj", p.reference],
    ["Svrha uplate", `SmartStay pretplata — ${p.tierName} (${p.propertyCount} obj.)`],
    ["Uplatilac", [p.payer.name, p.payer.city].filter(Boolean).join(", ")],
    ["Rok za uplatu", fmtDate(p.dueDate)],
  ];
  for (const [label, value] of rows) {
    const highlight = label === "Iznos" || label === "Poziv na broj" || label === "Račun primaoca";
    page.drawText(label, { x: 48, y, size: 10, font: regular, color: MUTED });
    page.drawText(value, { x: 180, y, size: highlight ? 12 : 10.5, font: highlight ? bold : regular, color: highlight ? NAVY : TEXT });
    y -= 12;
    page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 0.6, color: LINE });
    y -= 18;
  }

  y -= 10;
  page.drawText("Važno: obavezno navedite poziv na broj, kako bismo uplatu povezali s vašim nalogom.", { x: 48, y, size: 10, font: bold, color: TEXT });
  y -= 18;
  page.drawText("Nakon što uplata bude evidentirana, fakturu dobijate na email.", { x: 48, y, size: 10, font: regular, color: TEXT });

  footer(page, regular, [
    "Ovo je uputstvo za uplatu i nije faktura niti fiskalni dokument.",
    "Izdavalac nije registrovan kao obveznik PDV-a; iznos ne sadrži PDV.",
    `${ISSUER.name} · ID broj ${ISSUER.idBroj} · ${ISSUER.email}`,
  ]);

  return doc.save();
}
