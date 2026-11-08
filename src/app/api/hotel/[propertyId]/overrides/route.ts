import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedProperty } from "@/lib/hotel";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ propertyId: string }> };

async function guard(propertyId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return getManagedProperty(session.user.id, propertyId);
}

/** Which hotel guide sections have their own version in some rooms: { [sectionId]: ["201", "202"] } */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await prisma.roomSectionOverride.findMany({
    where: { guestLink: { propertyId, roomNumber: { not: null } } },
    select: { sectionId: true, guestLink: { select: { roomNumber: true } } },
  });
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.sectionId] ??= []).push(r.guestLink.roomNumber!);
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return NextResponse.json(out);
}

/** All rooms follow the hotel guide again for one section: ?sectionId= */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const sectionId = req.nextUrl.searchParams.get("sectionId");
  if (!sectionId) return NextResponse.json({ error: "Missing sectionId" }, { status: 400 });
  const { count } = await prisma.roomSectionOverride.deleteMany({ where: { sectionId, guestLink: { propertyId } } });
  return NextResponse.json({ ok: true, reset: count });
}
