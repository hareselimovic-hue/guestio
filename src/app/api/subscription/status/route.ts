import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ expired: false, isAdmin: false });

  const isAdmin = session.user.email === ADMIN_EMAIL;
  if (isAdmin) return NextResponse.json({ expired: false, isAdmin: true });

  let sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  // If no subscription yet (race condition after registration), treat as active trial
  if (!sub) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const validUntil = new Date(user?.createdAt ?? new Date());
    validUntil.setDate(validUntil.getDate() + 30);
    sub = await prisma.subscription.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id, validUntil },
    });
  }
  const expired = sub.validUntil < new Date();

  return NextResponse.json({ expired, isAdmin: false });
}
