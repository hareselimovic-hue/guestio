import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedProperty, translateSectionContent } from "@/lib/hotel";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ propertyId: string; roomId: string; sectionId: string }> };

/** Resolves property → room → hotel section, all belonging together and managed by the user */
async function resolve(ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { propertyId, roomId, sectionId } = await ctx.params;
  const property = await getManagedProperty(session.user.id, propertyId);
  if (!property) return null;
  const [room, section] = await Promise.all([
    prisma.guestLink.findFirst({ where: { id: roomId, propertyId, roomNumber: { not: null } }, select: { id: true } }),
    prisma.section.findFirst({ where: { id: sectionId, propertyId }, select: { id: true } }),
  ]);
  return room && section ? { propertyId, roomId, sectionId } : null;
}

/** Save this room's own version of a section (it stops following the hotel guide) */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { content } = await req.json();
  if (!content || typeof content !== "object" || Array.isArray(content)) return NextResponse.json({ error: "Bad content" }, { status: 400 });

  const translations = ((await translateSectionContent(content)) ?? undefined) as Prisma.InputJsonValue | undefined;
  await prisma.roomSectionOverride.upsert({
    where: { guestLinkId_sectionId: { guestLinkId: r.roomId, sectionId: r.sectionId } },
    create: { guestLinkId: r.roomId, sectionId: r.sectionId, content, translations },
    update: { content, translations },
  });
  return NextResponse.json({ ok: true });
}

/** Back to the hotel guide */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.roomSectionOverride.deleteMany({ where: { guestLinkId: r.roomId, sectionId: r.sectionId } });
  return NextResponse.json({ ok: true });
}

/** Apply this room's version to other rooms: { roomIds: [...] } */
export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await resolve(ctx);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { roomIds } = await req.json();
  if (!Array.isArray(roomIds)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const source = await prisma.roomSectionOverride.findUnique({
    where: { guestLinkId_sectionId: { guestLinkId: r.roomId, sectionId: r.sectionId } },
  });
  if (!source) return NextResponse.json({ error: "Save this room first." }, { status: 400 });

  const targets = await prisma.guestLink.findMany({
    where: { id: { in: roomIds.filter((x: unknown) => typeof x === "string" && x !== r.roomId) }, propertyId: r.propertyId, roomNumber: { not: null } },
    select: { id: true },
  });
  await prisma.$transaction(targets.map((t) =>
    prisma.roomSectionOverride.upsert({
      where: { guestLinkId_sectionId: { guestLinkId: t.id, sectionId: r.sectionId } },
      create: { guestLinkId: t.id, sectionId: r.sectionId, content: source.content ?? {}, translations: source.translations ?? undefined },
      update: { content: source.content ?? {}, translations: source.translations ?? undefined },
    }),
  ));
  return NextResponse.json({ ok: true, applied: targets.length });
}
