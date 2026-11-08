import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedProperty } from "@/lib/hotel";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ propertyId: string }> };

/** "101-105, 201, Suite A" → ["101", ..., "105", "201", "Suite A"] (max 300) */
function parseRooms(input: string): string[] {
  const out: string[] = [];
  for (const part of input.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      for (let n = Math.min(a, b); n <= Math.max(a, b) && out.length < 300; n++) out.push(String(n));
    } else {
      out.push(part.slice(0, 30));
    }
    if (out.length >= 300) break;
  }
  return [...new Set(out)];
}

async function guard(propertyId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return getManagedProperty(session.user.id, propertyId);
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  const property = await guard(propertyId);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rooms = await prisma.guestLink.findMany({
    where: { propertyId, roomNumber: { not: null } },
    select: { id: true, token: true, roomNumber: true, viewCount: true, _count: { select: { sectionOverrides: true } } },
  });
  rooms.sort((a, b) => a.roomNumber!.localeCompare(b.roomNumber!, undefined, { numeric: true }));
  return NextResponse.json({
    slug: property.slug,
    rooms: rooms.map(({ _count, ...r }) => ({ ...r, customSections: _count.sectionOverrides })),
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  const property = await guard(propertyId);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rooms: input } = await req.json();
  const wanted = typeof input === "string" ? parseRooms(input) : [];
  if (wanted.length === 0) return NextResponse.json({ error: "Upišite brojeve soba, npr. 101-110, 201-210" }, { status: 400 });

  const existing = await prisma.guestLink.findMany({ where: { propertyId, roomNumber: { in: wanted } }, select: { roomNumber: true } });
  const have = new Set(existing.map((e) => e.roomNumber));
  const toCreate = wanted.filter((r) => !have.has(r));
  if (toCreate.length > 0) {
    await prisma.guestLink.createMany({ data: toCreate.map((roomNumber) => ({ propertyId, roomNumber })) });
  }
  return NextResponse.json({ created: toCreate.length, skipped: wanted.length - toCreate.length });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  const property = await guard(propertyId);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.guestLink.deleteMany({ where: { id, propertyId, roomNumber: { not: null } } });
  return NextResponse.json({ ok: true });
}
