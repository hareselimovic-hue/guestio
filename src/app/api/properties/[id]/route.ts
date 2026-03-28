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
  const property = await prisma.property.findFirst({
    where: { id, ...propertyAccessWhere(session.user.id, wsIds) },
    include: { sections: { orderBy: { order: "asc" } } },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-add Contact section if missing
  if (!property.sections.some((s) => s.type === "CONTACT")) {
    const maxOrder = property.sections.reduce((m, s) => Math.max(m, s.order), 0);
    const contact = await prisma.section.create({
      data: { propertyId: property.id, type: "CONTACT", title: "Contact", content: { phone: "", label: "" }, order: maxOrder + 1 },
    });
    property.sections.push(contact);
  }

  // Auto-add Parking section if missing
  if (!property.sections.some((s) => s.type === "PARKING")) {
    const maxOrder = property.sections.reduce((m, s) => Math.max(m, s.order), 0);
    const parking = await prisma.section.create({
      data: { propertyId: property.id, type: "PARKING", title: "Parking", content: { available: false, parkingType: "", paid: false, notes: "" }, order: maxOrder + 1 },
    });
    property.sections.push(parking);
  }

  return NextResponse.json(property);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  // Slug uniqueness check
  if (data.slug) {
    const existing = await prisma.property.findFirst({ where: { slug: data.slug, NOT: { id } } });
    if (existing) return NextResponse.json({ error: "This URL is already taken." }, { status: 409 });
  }

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const property = await prisma.property.updateMany({
    where: { id, ...propertyAccessWhere(session.user.id, wsIds) },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.ownerName !== undefined && { ownerName: data.ownerName }),
      ...(data.ownerAddress !== undefined && { ownerAddress: data.ownerAddress }),
      ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount }),
      ...(data.slug && { slug: data.slug }),
    },
  });

  return NextResponse.json(property);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wsIds = await getUserWorkspaceIds(session.user.id);
  const property = await prisma.property.findFirst({ where: { id, ...propertyAccessWhere(session.user.id, wsIds) }, include: { sections: true } });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { type, title, content } = await req.json();
  const maxOrder = property.sections.reduce((m, s) => Math.max(m, s.order), 0);

  const section = await prisma.section.create({
    data: { propertyId: id, type, title, content, order: maxOrder + 1 },
  });

  return NextResponse.json(section, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const wsIds = await getUserWorkspaceIds(session.user.id);
  await prisma.property.deleteMany({ where: { id, ...propertyAccessWhere(session.user.id, wsIds) } });
  return NextResponse.json({ ok: true });
}
