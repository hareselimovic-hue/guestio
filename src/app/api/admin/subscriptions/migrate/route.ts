import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

// One-time migration: set all users without subscription to validUntil = 2030-12-31
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validUntil = new Date("2030-12-31T23:59:59Z");
  const users = await prisma.user.findMany({ select: { id: true } });

  let created = 0;
  for (const user of users) {
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, validUntil },
    });
    created++;
  }

  return NextResponse.json({ ok: true, migrated: created });
}
