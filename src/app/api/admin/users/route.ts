import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
