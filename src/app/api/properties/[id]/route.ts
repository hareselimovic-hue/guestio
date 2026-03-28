import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const property = await prisma.property.findFirst({
    where: { id, userId: session.user.id },
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

  return NextResponse.json(property);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  const property = await prisma.property.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.ownerName !== undefined && { ownerName: data.ownerName }),
      ...(data.ownerAddress !== undefined && { ownerAddress: data.ownerAddress }),
      ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount }),
    },
  });

  return NextResponse.json(property);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const property = await prisma.property.findFirst({ where: { id, userId: session.user.id }, include: { sections: true } });
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
  await prisma.property.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
