import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bankTransferPeriod, issueInvoice, sendInvoiceEmails } from "@/lib/billing";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

/**
 * POST /api/admin/payments/:id  { action: "mark-paid" | "cancel" }
 * mark-paid: bank transfer arrived → extend subscription by a full month (from where it stood before
 * the 7-day grace), issue the invoice and email it to the customer and accounting ("PLAĆENO VIRMANOM").
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await req.json();
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.method !== "BANK_TRANSFER") {
    return NextResponse.json({ error: "Uplata ne postoji." }, { status: 404 });
  }

  if (action === "cancel") {
    const res = await prisma.payment.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELED" } });
    return NextResponse.json({ ok: res.count > 0 });
  }

  if (action !== "mark-paid") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const paidAt = new Date();
  const period = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({ where: { id, status: "PENDING" }, data: { status: "SUCCESS", paidAt } });
    if (claimed.count === 0) return null;

    const sub = await tx.subscription.findUnique({ where: { userId: payment.userId } });
    // Same period as printed on the payment instructions
    const { from, to: periodTo } = bankTransferPeriod(payment);
    let to = periodTo;
    if (sub && sub.validUntil > to) to = sub.validUntil; // never shorten (e.g. paid by card meanwhile)

    await tx.subscription.update({ where: { userId: payment.userId }, data: { validUntil: to } });
    return { from, to };
  });

  if (!period) return NextResponse.json({ error: "Uplata je već obrađena." }, { status: 409 });

  try {
    const invoice = await issueInvoice(id, period);
    await sendInvoiceEmails(invoice.id);
    return NextResponse.json({ ok: true, invoiceNumber: invoice.number, validUntil: period.to });
  } catch (err) {
    console.error("[admin mark-paid] invoice failed:", err);
    return NextResponse.json({ ok: true, warning: "Pretplata produžena, ali faktura nije poslana — provjerite log." });
  }
}
