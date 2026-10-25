import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { verifyCallbackSignature } from "@/lib/bankart";
import { calculateMonthlyPrice } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const RENEWAL_DAYS = 30;

const ISSUER = {
  name: "TB d.o.o.",
  address: "Derviša Numića br. 4, 71000 Sarajevo, BiH",
  idBroj: "4203112820003",
  racun: "1322602026473391",
  banka: "NLB Banka d.d. Sarajevo",
};

async function sendInvoiceEmail(params: {
  toEmail: string;
  invoiceNumber: string;
  paidAt: Date;
  propertyCount: number;
  amount: number;
  billingName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingPostcode: string | null;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba";
  const price = calculateMonthlyPrice(params.propertyCount);
  const dateStr = params.paidAt.toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" });

  await resend.emails.send({
    from,
    to: params.toEmail,
    subject: `SmartStay faktura ${params.invoiceNumber}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="background:#0F2F61;border-radius:16px 16px 0 0;padding:24px 32px;">
          <table width="100%"><tr>
            <td><span style="font-size:20px;font-weight:800;color:#fff;">Smart<span style="color:#FF6700;">Stay</span></span></td>
            <td align="right"><span style="font-size:18px;font-weight:700;color:#fff;">FAKTURA</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#fff;border:1px solid #EDEDE9;border-top:none;border-radius:0 0 16px 16px;padding:32px;">
          <table width="100%" style="margin-bottom:24px;"><tr>
            <td style="vertical-align:top;width:50%;">
              <p style="margin:0 0 4px;font-size:11px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.5px;">Izdavalac</p>
              <p style="margin:0;font-size:13px;color:#262626;line-height:1.6;">
                <b>${ISSUER.name}</b><br>${ISSUER.address}<br>
                ID broj: ${ISSUER.idBroj}<br>
                Račun: ${ISSUER.racun}<br>${ISSUER.banka}
              </p>
            </td>
            <td style="vertical-align:top;width:50%;">
              <p style="margin:0 0 4px;font-size:11px;color:#9B9B9B;text-transform:uppercase;letter-spacing:0.5px;">Kupac</p>
              <p style="margin:0;font-size:13px;color:#262626;line-height:1.6;">
                <b>${params.billingName ?? ""}</b><br>${params.billingAddress ?? ""}<br>
                ${params.billingPostcode ?? ""} ${params.billingCity ?? ""}
              </p>
            </td>
          </tr></table>

          <p style="margin:0 0 16px;font-size:12px;color:#6B6B6B;">
            Broj fakture: <b>${params.invoiceNumber}</b> &nbsp;·&nbsp; Datum: <b>${dateStr}</b>
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDEDE9;border-radius:10px;overflow:hidden;">
            <tr style="background:#0F2F61;">
              <td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;">Opis usluge</td>
              <td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;text-align:center;">Kol.</td>
              <td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;text-align:right;">Jed. cijena</td>
              <td style="padding:10px 14px;font-size:12px;color:#fff;font-weight:600;text-align:right;">Ukupno</td>
            </tr>
            <tr>
              <td style="padding:12px 14px;font-size:13px;color:#262626;">SmartStay pretplata — ${price.tierName} plan<br><span style="color:#9B9B9B;font-size:11px;">mjesečna pretplata</span></td>
              <td style="padding:12px 14px;font-size:13px;color:#262626;text-align:center;">${params.propertyCount}</td>
              <td style="padding:12px 14px;font-size:13px;color:#262626;text-align:right;">${price.pricePerProperty.toFixed(2)} KM</td>
              <td style="padding:12px 14px;font-size:13px;color:#262626;text-align:right;">${params.amount.toFixed(2)} KM</td>
            </tr>
          </table>

          <table width="100%" style="margin-top:12px;"><tr>
            <td></td>
            <td align="right" style="font-size:14px;font-weight:700;color:#0F2F61;">UKUPNO PLAĆENO:&nbsp;<span style="color:#FF6700;">${params.amount.toFixed(2)} KM</span></td>
          </tr></table>

          <p style="margin:24px 0 0;font-size:11px;color:#9B9B9B;">Firma nije registrovana kao obveznik PDV-a, iznos ne sadrži PDV.</p>
          <p style="margin:4px 0 0;font-size:11px;color:#9B9B9B;">Ova faktura nije fiskalni dokument.</p>
        </td></tr>
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#BABAB5;">SmartStay — Digital guest guidebooks</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// Server-to-server postback from Bankart with the transaction result.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const verified = verifyCallbackSignature({
    rawBody,
    signatureHeader: req.headers.get("x-signature"),
    contentType: req.headers.get("content-type"),
    dateHeader: req.headers.get("date"),
    path: req.nextUrl.pathname,
  });

  if (!verified) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const merchantTransactionId = payload.merchantTransactionId as string | undefined;
  const transactionType = String(payload.transactionType ?? "");
  // Bankart callback field is `result`: OK (final success) | ERROR (final failure) | PENDING (not final yet).
  const result = String(payload.result ?? "");
  const bankartUuid = (payload.uuid as string | undefined) ?? null;

  // Refunds, chargebacks etc. also arrive here — they must never extend a subscription.
  if (transactionType !== "DEBIT") {
    console.warn("[bankart callback] non-debit notification acknowledged, no action:", transactionType, result, merchantTransactionId);
    return ack();
  }

  if (!merchantTransactionId) {
    return new NextResponse("Missing merchantTransactionId", { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { merchantTransactionId },
    include: { user: { select: { email: true } } },
  });
  if (!payment) {
    console.error("[bankart callback] unknown merchantTransactionId:", merchantTransactionId);
    return new NextResponse("Unknown transaction", { status: 404 });
  }

  if (result === "PENDING") {
    return ack();
  }

  if (result !== "OK") {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED", bankartUuid },
    });
    console.warn("[bankart callback] payment failed:", merchantTransactionId, payload.code, payload.message);
    return ack();
  }

  const paidAmount = Number(payload.amount);
  if (payload.currency !== payment.currency || !(Math.abs(paidAmount - payment.amount) < 0.005)) {
    // Money moved but doesn't match what we charged — never auto-extend; leave PENDING for manual review.
    console.error("[bankart callback] amount/currency mismatch, NOT extending subscription", {
      merchantTransactionId,
      expected: `${payment.amount} ${payment.currency}`,
      received: `${payload.amount} ${payload.currency}`,
    });
    return ack();
  }

  const paidAt = new Date();

  // Claim the PENDING row atomically so duplicate/concurrent callbacks can't extend twice.
  const subscription = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "SUCCESS", paidAt, bankartUuid },
    });
    if (claimed.count === 0) return null;

    const current = await tx.subscription.findUnique({ where: { userId: payment.userId } });
    const base = current && current.validUntil > paidAt ? current.validUntil : paidAt;
    const validUntil = new Date(base);
    validUntil.setDate(validUntil.getDate() + RENEWAL_DAYS);

    return tx.subscription.update({ where: { userId: payment.userId }, data: { validUntil } });
  });

  if (!subscription) {
    return ack();
  }

  try {
    await sendInvoiceEmail({
      toEmail: payment.user.email,
      invoiceNumber: `SS-${payment.id.slice(-8).toUpperCase()}`,
      paidAt,
      propertyCount: payment.propertyCount,
      amount: payment.amount,
      billingName: subscription.billingName,
      billingAddress: subscription.billingAddress,
      billingCity: subscription.billingCity,
      billingPostcode: subscription.billingPostcode,
    });
  } catch (err) {
    console.error("[bankart callback] invoice email failed:", err);
  }

  return ack();
}

// Bankart requires HTTP 200 with body "OK"; anything else makes it retry the notification.
function ack() {
  return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
