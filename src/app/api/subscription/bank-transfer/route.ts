import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { ISSUER } from "@/lib/billing-pdf";
import {
  addDays, BANK_TRANSFER_GRACE_DAYS, bankTransferPeriod, nextBankTransferReference, notifyAdminOfBankTransferRequest, shortPeriod,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

function toView(p: { id: string; merchantTransactionId: string; amount: number; propertyCount: number; createdAt: Date; previousValidUntil: Date | null }) {
  const price = calculateMonthlyPrice(p.propertyCount);
  const period = bankTransferPeriod(p);
  return {
    period: shortPeriod(period.from, period.to),
    id: p.id,
    reference: p.merchantTransactionId,
    amount: p.amount,
    propertyCount: p.propertyCount,
    tierName: price.tierName,
    createdAt: p.createdAt,
    dueDate: addDays(p.createdAt, BANK_TRANSFER_GRACE_DAYS),
    recipient: ISSUER.name,
    account: ISSUER.racun,
    bank: ISSUER.banka,
  };
}

// Current pending bank-transfer request, if any
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pending = await prisma.payment.findFirst({
    // Payments with a pre-issued invoice (billed in arrears) aren't renewal requests
    where: { userId: session.user.id, method: "BANK_TRANSFER", status: "PENDING", invoice: { is: null } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ pending: pending ? toView(pending) : null });
}

/**
 * Request payment instructions (virman). Reuses an open request instead of creating duplicates.
 * Gives a 7-day grace period so access isn't lost while the transfer clears; the full month is
 * added when the admin marks the transfer as paid.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub?.billingName || !sub.billingAddress || !sub.billingCity || !sub.billingPostcode) {
    return NextResponse.json({ error: "Prvo popunite podatke za naplatu." }, { status: 400 });
  }

  const existing = await prisma.payment.findFirst({
    where: { userId: session.user.id, method: "BANK_TRANSFER", status: "PENDING", invoice: { is: null } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return NextResponse.json({ pending: toView(existing), created: false });

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);
  const propertyCount = await prisma.property.count({ where: propertyAccessWhere(session.user.id, wsIds, memberUserIds) });
  const price = calculateMonthlyPrice(propertyCount);

  const reference = await nextBankTransferReference();
  let payment = null;
  for (let attempt = 0; attempt < 5 && !payment; attempt++) {
    try {
      payment = await prisma.payment.create({
        data: {
          userId: session.user.id,
          merchantTransactionId: reference(attempt),
          method: "BANK_TRANSFER",
          propertyCount: price.propertyCount,
          amount: price.total,
          currency: "BAM",
          status: "PENDING",
          previousValidUntil: sub.validUntil,
        },
      });
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    }
  }
  if (!payment) return NextResponse.json({ error: "Greška pri kreiranju uputstva. Pokušajte ponovo." }, { status: 500 });

  // Grace period: keep access for 7 days while the transfer clears
  const graceUntil = addDays(new Date(), BANK_TRANSFER_GRACE_DAYS);
  if (sub.validUntil < graceUntil) {
    await prisma.subscription.update({ where: { userId: session.user.id }, data: { validUntil: graceUntil } });
  }

  try {
    await notifyAdminOfBankTransferRequest(payment.id);
  } catch (err) {
    console.error("[bank-transfer] admin notice failed:", err);
  }

  return NextResponse.json({ pending: toView(payment), created: true });
}
