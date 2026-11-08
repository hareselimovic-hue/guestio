import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedProperty } from "@/lib/hotel";

export const dynamic = "force-dynamic";

/** One room: the hotel guide sections + this room's own versions (overrides) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ propertyId: string; roomId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { propertyId, roomId } = await params;
  const property = await getManagedProperty(session.user.id, propertyId);
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const room = await prisma.guestLink.findFirst({
    where: { id: roomId, propertyId, roomNumber: { not: null } },
    select: { id: true, token: true, roomNumber: true, sectionOverrides: { select: { sectionId: true, content: true, updatedAt: true } } },
  });
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sections = await prisma.section.findMany({
    where: { propertyId, type: { not: "AI_CONTEXT" } },
    orderBy: { order: "asc" },
    select: { id: true, type: true, title: true, content: true, isVisible: true, order: true },
  });

  return NextResponse.json({
    hotel: { id: property.id, name: property.name, slug: property.slug },
    room: { id: room.id, token: room.token, roomNumber: room.roomNumber },
    sections,
    overrides: Object.fromEntries(room.sectionOverrides.map((o) => [o.sectionId, o.content])),
  });
}
