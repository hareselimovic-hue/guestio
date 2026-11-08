import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanText, getManagedProperty, translateAnnouncement } from "@/lib/hotel";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ propertyId: string }> };

async function guard(propertyId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return getManagedProperty(session.user.id, propertyId);
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await prisma.announcement.findMany({ where: { propertyId }, orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(items);
}

/** { message, hours? } — hours: how long it stays visible (empty = until turned off) */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const message = cleanText(body.message, 400);
  if (!message) return NextResponse.json({ error: "Upišite tekst obavijesti." }, { status: 400 });
  const hours = Number(body.hours);
  const expiresAt = Number.isFinite(hours) && hours > 0 ? new Date(Date.now() + Math.min(hours, 24 * 60) * 3_600_000) : null;

  const translations = await translateAnnouncement(message);
  const item = await prisma.announcement.create({ data: { propertyId, message, translations, expiresAt } });
  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id, active } = await req.json();
  if (typeof id !== "string" || typeof active !== "boolean") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  // Re-activating an expired announcement makes it permanent again
  await prisma.announcement.updateMany({ where: { id, propertyId }, data: active ? { active, expiresAt: null } : { active } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.announcement.deleteMany({ where: { id, propertyId } });
  return NextResponse.json({ ok: true });
}
