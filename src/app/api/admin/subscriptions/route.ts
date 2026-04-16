import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

async function checkAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.email === ADMIN_EMAIL ? session : null;
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { subscription: true },
  });

  const now = new Date();
  const data = users.map((u) => {
    const sub = u.subscription;
    const daysLeft = sub
      ? Math.ceil((sub.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      subscription: sub
        ? { id: sub.id, validUntil: sub.validUntil, daysLeft }
        : null,
    };
  });

  return NextResponse.json({ users: data });
}

export async function PUT(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, validUntil } = await req.json();
  if (!userId || !validUntil) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: { validUntil: new Date(validUntil) },
    create: { userId, validUntil: new Date(validUntil) },
  });

  return NextResponse.json({ subscription });
}
