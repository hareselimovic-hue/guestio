import { Prisma } from "@prisma/client";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { buildInvoicePdf, buildPaymentInstructionsPdf, fmtDate, fmtKM, ISSUER, type BillingParty } from "@/lib/billing-pdf";

/** Accounting copy of every issued invoice */
export const ACCOUNTING_EMAIL = "nedim.247.neso@gmail.com";
/** Internal notice when someone asks for bank-transfer instructions */
export const ADMIN_NOTIFY_EMAIL = "info@smartstay.ba";
export const RENEWAL_DAYS = 30;
export const BANK_TRANSFER_GRACE_DAYS = 7;

const METHOD_LABEL: Record<string, string> = { CARD: "kartično", BANK_TRANSFER: "virmanom" };

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function resend() {
  return new Resend(process.env.RESEND_API_KEY);
}
const FROM = () => process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba";

// ─── Invoice issuing ──────────────────────────────────────────────────────────

/**
 * Creates the invoice for a successful payment (idempotent per payment).
 * Numbers are sequential per year: SS-2026-0001.
 */
export async function issueInvoice(paymentId: string, period: { from: Date; to: Date }) {
  const existing = await prisma.invoice.findUnique({ where: { paymentId } });
  if (existing) return existing;

  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { user: { select: { subscription: true } } },
  });
  const sub = payment.user.subscription;
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await prisma.invoice.count({ where: { number: { startsWith: `SS-${year}-` } } });
    const number = `SS-${year}-${String(count + 1 + attempt).padStart(4, "0")}`;
    try {
      return await prisma.invoice.create({
        data: {
          number,
          userId: payment.userId,
          paymentId,
          method: payment.method,
          amount: payment.amount,
          currency: payment.currency,
          propertyCount: payment.propertyCount,
          billingName: sub?.billingName ?? null,
          billingAddress: sub?.billingAddress ?? null,
          billingCity: sub?.billingCity ?? null,
          billingPostcode: sub?.billingPostcode ?? null,
          billingIdBroj: sub?.billingIdBroj ?? null,
          periodFrom: period.from,
          periodTo: period.to,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const again = await prisma.invoice.findUnique({ where: { paymentId } });
        if (again) return again; // concurrent issue for the same payment
        continue; // number collision — try the next number
      }
      throw err;
    }
  }
  throw new Error("Could not allocate an invoice number");
}

export async function renderInvoicePdf(invoiceId: string) {
  const inv = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { user: { select: { email: true } } },
  });
  const price = calculateMonthlyPrice(inv.propertyCount);
  const pdf = await buildInvoicePdf({
    number: inv.number,
    issuedAt: inv.issuedAt,
    method: inv.method,
    amount: inv.amount,
    propertyCount: inv.propertyCount,
    pricePerProperty: inv.propertyCount > 0 ? inv.amount / inv.propertyCount : price.pricePerProperty,
    tierName: price.tierName,
    periodFrom: inv.periodFrom,
    periodTo: inv.periodTo,
    buyer: {
      name: inv.billingName, address: inv.billingAddress, city: inv.billingCity,
      postcode: inv.billingPostcode, idBroj: inv.billingIdBroj, email: inv.user.email,
    },
  });
  return { inv, pdf: Buffer.from(pdf) };
}

/** Sends the invoice PDF to the customer and an accounting copy to Nedim. */
export async function sendInvoiceEmails(invoiceId: string) {
  const { inv, pdf } = await renderInvoicePdf(invoiceId);
  const attachment = { filename: `Faktura-${inv.number}.pdf`, content: pdf };
  const method = METHOD_LABEL[inv.method] ?? inv.method;
  const paidLabel = `PLAĆENO ${method.toUpperCase()}`;
  const period = `${fmtDate(inv.periodFrom)} – ${fmtDate(inv.periodTo)}`;

  const results = await Promise.allSettled([
    resend().emails.send({
      from: FROM(),
      to: inv.user.email,
      replyTo: ADMIN_NOTIFY_EMAIL,
      subject: `SmartStay faktura ${inv.number}`,
      attachments: [attachment],
      html: emailLayout(`
        <p style="${H1}">Hvala na uplati!</p>
        <p style="${P}">Vaša SmartStay pretplata je produžena. U prilogu je faktura <strong>${inv.number}</strong>.</p>
        ${summaryTable([
          ["Iznos", fmtKM(inv.amount)],
          ["Način plaćanja", method === "kartično" ? "Kartica" : "Virman"],
          ["Period pretplate", period],
        ])}
        <p style="${SMALL}">Pitanja oko računa? Odgovorite na ovaj email.</p>`),
    }),
    resend().emails.send({
      from: FROM(),
      to: ACCOUNTING_EMAIL,
      subject: `Faktura ${inv.number} — ${paidLabel} — ${inv.billingName ?? inv.user.email}`,
      attachments: [attachment],
      html: emailLayout(`
        <p style="${LABEL}">${paidLabel}</p>
        <p style="${H1}">Faktura ${inv.number}</p>
        ${summaryTable([
          ["Kupac", inv.billingName ?? "—"],
          ["ID broj kupca", inv.billingIdBroj ?? "—"],
          ["Email", inv.user.email],
          ["Iznos", fmtKM(inv.amount)],
          ["Način plaćanja", method === "kartično" ? "Kartica (Bankart)" : "Virman"],
          ["Datum", fmtDate(inv.issuedAt)],
          ["Period", period],
        ])}
        <p style="${SMALL}">PDF fakture je u prilogu.</p>`),
    }),
  ]);
  for (const r of results) {
    if (r.status === "rejected") console.error("[billing] invoice email failed:", r.reason);
    else if (r.value.error) console.error("[billing] invoice email failed:", r.value.error);
  }
}

// ─── Bank transfer (virman) ───────────────────────────────────────────────────

/**
 * Subscription period a bank transfer pays for: starts where the subscription stood before the
 * 7-day grace (or at the request, if it had already expired) and lasts RENEWAL_DAYS.
 * Shown on the payment instructions and used when the admin marks the transfer as paid.
 */
export function bankTransferPeriod(p: { previousValidUntil: Date | null; createdAt: Date }) {
  const before = p.previousValidUntil ?? p.createdAt;
  const from = before > p.createdAt ? before : p.createdAt;
  return { from, to: addDays(from, RENEWAL_DAYS) };
}

/** "05.11.–05.12.2026." (or full dates when the period crosses a year) */
export function shortPeriod(from: Date, to: Date) {
  const [fd, fm, fy] = fmtDate(from).replace(/\s/g, "").split(".");
  const toStr = fmtDate(to).replace(/\s/g, "");
  return fy === toStr.split(".")[2] ? `${fd}.${fm}.–${toStr}` : `${fmtDate(from).replace(/\s/g, "")}–${toStr}`;
}

export function billingPartyFromSub(
  sub: { billingName: string | null; billingAddress: string | null; billingCity: string | null; billingPostcode: string | null; billingIdBroj: string | null },
  email: string,
): BillingParty {
  return { name: sub.billingName, address: sub.billingAddress, city: sub.billingCity, postcode: sub.billingPostcode, idBroj: sub.billingIdBroj, email };
}

/** Poziv na broj: 10 digits, year + 6-digit sequence (e.g. 2026000012) */
export async function nextBankTransferReference() {
  const year = new Date().getFullYear();
  const count = await prisma.payment.count({ where: { method: "BANK_TRANSFER", merchantTransactionId: { startsWith: String(year) } } });
  return (n: number) => `${year}${String(count + 1 + n).padStart(6, "0")}`;
}

export async function renderInstructionsPdf(paymentId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { user: { select: { email: true, subscription: true } } },
  });
  const price = calculateMonthlyPrice(payment.propertyCount);
  const sub = payment.user.subscription!;
  const period = bankTransferPeriod(payment);
  const pdf = await buildPaymentInstructionsPdf({
    reference: payment.merchantTransactionId,
    createdAt: payment.createdAt,
    dueDate: addDays(payment.createdAt, BANK_TRANSFER_GRACE_DAYS),
    amount: payment.amount,
    propertyCount: payment.propertyCount,
    tierName: price.tierName,
    periodFrom: period.from,
    periodTo: period.to,
    periodShort: shortPeriod(period.from, period.to),
    payer: billingPartyFromSub(sub, payment.user.email),
  });
  return { payment, pdf: Buffer.from(pdf), tierName: price.tierName, period };
}

export async function sendInstructionsEmail(paymentId: string) {
  const { payment, pdf, period } = await renderInstructionsPdf(paymentId);
  const { error } = await resend().emails.send({
    from: FROM(),
    to: payment.user.email,
    replyTo: ADMIN_NOTIFY_EMAIL,
    subject: "Uputstvo za uplatu — SmartStay pretplata",
    attachments: [{ filename: `Uputstvo-za-uplatu-${payment.merchantTransactionId}.pdf`, content: pdf }],
    html: emailLayout(`
      <p style="${H1}">Uputstvo za uplatu</p>
      <p style="${P}">Za produženje SmartStay pretplate izvršite uplatu prema podacima ispod (isto je i u PDF-u u prilogu).</p>
      ${summaryTable([
        ["Primalac", ISSUER.name],
        ["Račun primaoca", ISSUER.racun],
        ["Banka", ISSUER.banka],
        ["Iznos", fmtKM(payment.amount)],
        ["Poziv na broj", payment.merchantTransactionId],
        ["Svrha uplate", `SmartStay pretplata ${shortPeriod(period.from, period.to)}`],
        ["Period pretplate", `${fmtDate(period.from)} – ${fmtDate(period.to)}`],
        ["Rok", fmtDate(addDays(payment.createdAt, BANK_TRANSFER_GRACE_DAYS))],
      ])}
      <p style="${P}"><strong>Obavezno navedite poziv na broj.</strong> Kad uplata bude evidentirana, fakturu dobijate na email.</p>`),
  });
  if (error) throw new Error(error.message);
}

export async function notifyAdminOfBankTransferRequest(paymentId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { user: { select: { email: true, subscription: { select: { billingName: true } } } } },
  });
  await resend().emails.send({
    from: FROM(),
    to: ADMIN_NOTIFY_EMAIL,
    subject: `Zatraženo uputstvo za uplatu: ${payment.user.subscription?.billingName ?? payment.user.email} — ${fmtKM(payment.amount)}`,
    html: emailLayout(`
      <p style="${LABEL}">Čeka uplatu (virman)</p>
      <p style="${H1}">${fmtKM(payment.amount)}</p>
      ${summaryTable([
        ["Kupac", payment.user.subscription?.billingName ?? "—"],
        ["Email", payment.user.email],
        ["Poziv na broj", payment.merchantTransactionId],
        ["Period", (({ from, to }) => `${fmtDate(from)} – ${fmtDate(to)}`)(bankTransferPeriod(payment))],
      ])}
      <p style="${P}">Kad uplata legne na račun, označite je u Admin panelu → <em>Uplate virmanom</em> → <strong>Označi plaćeno</strong>. Tada se pretplata produži i faktura automatski ide kupcu i Nedimu.</p>`),
  });
}

// ─── Email layout helpers ─────────────────────────────────────────────────────

const H1 = "margin:0 0 12px;font-size:22px;font-weight:700;color:#262626;line-height:1.25;";
const P = "margin:0 0 18px;font-size:15px;color:#4A4A4A;line-height:1.6;";
const SMALL = "margin:18px 0 0;font-size:13px;color:#6B6B6B;line-height:1.6;";
const LABEL = "margin:0 0 6px;font-size:13px;color:#FF6700;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function summaryTable(rows: [string, string][]) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;border:1px solid #EDEDE9;border-radius:10px;margin:0 0 18px;">
    ${rows.map(([k, v]) => `<tr>
      <td style="padding:9px 14px;font-size:13px;color:#6B6B6B;border-bottom:1px solid #EDEDE9;white-space:nowrap;">${esc(k)}</td>
      <td style="padding:9px 14px;font-size:14px;color:#262626;font-weight:600;border-bottom:1px solid #EDEDE9;">${esc(v)}</td>
    </tr>`).join("")}
  </table>`;
}

function emailLayout(inner: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:22px;font-weight:800;color:#0F2F61;letter-spacing:-0.5px;">SmartStay</span>
        </td></tr>
        <tr><td style="background:#fff;border-radius:16px;border:1px solid #EDEDE9;padding:32px;">${inner}</td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">${ISSUER.name} · SmartStay — Digitalni vodiči za goste</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export { addDays };
