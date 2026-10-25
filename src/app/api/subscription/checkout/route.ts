import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { createDebitTransaction } from "@/lib/bankart";

export const dynamic = "force-dynamic";

// Save/update billing address, required once before the first card payment.
export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { billingName, billingAddress, billingCity, billingPostcode } = await req.json();
  if (!billingName?.trim() || !billingAddress?.trim() || !billingCity?.trim() || !billingPostcode?.trim()) {
    return NextResponse.json({ error: "Sva polja su obavezna." }, { status: 400 });
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId: session.user.id },
    update: {
      billingName: billingName.trim(),
      billingAddress: billingAddress.trim(),
      billingCity: billingCity.trim(),
      billingPostcode: billingPostcode.trim(),
    },
    create: {
      userId: session.user.id,
      validUntil: new Date(),
      billingName: billingName.trim(),
      billingAddress: billingAddress.trim(),
      billingCity: billingCity.trim(),
      billingPostcode: billingPostcode.trim(),
    },
  });

  return NextResponse.json({ subscription });
}

// Create a Bankart debit transaction for a monthly subscription renewal.
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!subscription?.billingName || !subscription.billingAddress || !subscription.billingCity || !subscription.billingPostcode) {
    return NextResponse.json({ error: "Prvo popunite podatke za naplatu." }, { status: 400 });
  }

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);
  const propertyCount = await prisma.property.count({
    where: propertyAccessWhere(session.user.id, wsIds, memberUserIds),
  });

  const price = calculateMonthlyPrice(propertyCount);
  const merchantTransactionId = `SUB-${session.user.id}-${Date.now()}`;

  await prisma.payment.create({
    data: {
      userId: session.user.id,
      merchantTransactionId,
      propertyCount: price.propertyCount,
      amount: price.total,
      currency: "BAM",
      status: "PENDING",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.smartstay.ba";

  try {
    const { redirectUrl } = await createDebitTransaction({
      merchantTransactionId,
      amount: price.total.toFixed(2),
      currency: "BAM",
      successUrl: `${appUrl}/dashboard/subscription/checkout/result?status=success`,
      cancelUrl: `${appUrl}/dashboard/subscription/checkout/result?status=cancel`,
      errorUrl: `${appUrl}/dashboard/subscription/checkout/result?status=error`,
      callbackUrl: `${appUrl}/api/subscription/checkout/callback`,
      description: `SmartStay pretplata — ${price.tierName} (${price.propertyCount} objekata)`,
      language: "bs",
      customer: {
        email: session.user.email,
        firstName: subscription.billingName.split(" ")[0],
        lastName: subscription.billingName.split(" ").slice(1).join(" ") || subscription.billingName,
        billingAddress1: subscription.billingAddress,
        billingCity: subscription.billingCity,
        billingPostcode: subscription.billingPostcode,
        billingCountry: subscription.billingCountry,
      },
    });

    return NextResponse.json({ redirectUrl });
  } catch (err) {
    await prisma.payment.update({
      where: { merchantTransactionId },
      data: { status: "FAILED" },
    });
    console.error("[subscription/checkout] Bankart error:", err);
    return NextResponse.json({ error: "Plaćanje trenutno nije dostupno. Pokušajte ponovo kasnije." }, { status: 502 });
  }
}
