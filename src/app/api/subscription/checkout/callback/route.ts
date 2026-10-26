import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCallbackSignature } from "@/lib/bankart";
import { addDays, issueInvoice, RENEWAL_DAYS, sendInvoiceEmails } from "@/lib/billing";

export const dynamic = "force-dynamic";

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
  const period = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "SUCCESS", paidAt, bankartUuid },
    });
    if (claimed.count === 0) return null;

    const current = await tx.subscription.findUnique({ where: { userId: payment.userId } });
    const base = current && current.validUntil > paidAt ? current.validUntil : paidAt;
    const validUntil = addDays(base, RENEWAL_DAYS);

    await tx.subscription.update({ where: { userId: payment.userId }, data: { validUntil } });
    return { from: base, to: validUntil };
  });

  if (!period) {
    return ack();
  }

  // Invoice PDF to the customer + accounting copy marked "PLAĆENO KARTIČNO"
  try {
    const invoice = await issueInvoice(payment.id, period);
    await sendInvoiceEmails(invoice.id);
  } catch (err) {
    console.error("[bankart callback] invoice failed:", err);
  }

  return ack();
}

// Bankart requires HTTP 200 with body "OK"; anything else makes it retry the notification.
function ack() {
  return new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
