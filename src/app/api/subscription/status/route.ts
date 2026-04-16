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

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  const expired = !sub || sub.validUntil < new Date();

  return NextResponse.json({ expired, isAdmin: false });
}
