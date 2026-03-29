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
  const entries = await prisma.whitelistEmail.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { email } = await req.json();
  if (!email || typeof email !== "string") return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  const entry = await prisma.whitelistEmail.upsert({
    where: { email: email.toLowerCase().trim() },
    update: {},
    create: { email: email.toLowerCase().trim() },
  });
  return NextResponse.json({ entry });
}

export async function DELETE(req: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { email } = await req.json();
  await prisma.whitelistEmail.delete({ where: { email } });
  return NextResponse.json({ ok: true });
}
