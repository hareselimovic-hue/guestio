import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, propertyAccessWhere } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wsIds = await getUserWorkspaceIds(session.user.id);
  const guests = await prisma.guestLink.findMany({
    where: { property: { id, ...propertyAccessWhere(session.user.id, wsIds) } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(guests);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { guestName, checkIn, checkOut } = await req.json();

  const wsIds2 = await getUserWorkspaceIds(session.user.id);
  const property = await prisma.property.findFirst({
    where: { id, ...propertyAccessWhere(session.user.id, wsIds2) },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const guest = await prisma.guestLink.create({
    data: {
      propertyId: id,
      guestName: guestName?.trim() || null,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
    },
  });

  return NextResponse.json(guest, { status: 201 });
}
