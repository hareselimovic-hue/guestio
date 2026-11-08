import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanText, getManagedProperty, SERVICE_KINDS } from "@/lib/hotel";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ propertyId: string }> };

async function guard(propertyId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return getManagedProperty(session.user.id, propertyId);
}

function parseFields(body: Record<string, unknown>) {
  const price = body.price === "" || body.price === null || body.price === undefined ? null : Number(String(body.price).replace(",", "."));
  return {
    name: cleanText(body.name, 120),
    description: cleanText(body.description, 500),
    category: cleanText(body.category, 60),
    priceNote: cleanText(body.priceNote, 60),
    price: price !== null && Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : null,
  };
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const services = await prisma.hotelService.findMany({ where: { propertyId }, orderBy: [{ kind: "asc" }, { order: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(services);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const kind = SERVICE_KINDS.includes(body.kind) ? body.kind : null;
  const fields = parseFields(body);
  if (!kind || !fields.name) return NextResponse.json({ error: "Naziv je obavezan." }, { status: 400 });

  const count = await prisma.hotelService.count({ where: { propertyId, kind } });
  const service = await prisma.hotelService.create({ data: { propertyId, kind, ...fields, name: fields.name, order: count } });
  return NextResponse.json(service, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (typeof body.id !== "string") return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.name !== undefined) {
    const fields = parseFields(body);
    if (!fields.name) return NextResponse.json({ error: "Naziv je obavezan." }, { status: 400 });
    Object.assign(data, fields);
  }
  await prisma.hotelService.updateMany({ where: { id: body.id, propertyId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { propertyId } = await params;
  if (!(await guard(propertyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.hotelService.deleteMany({ where: { id, propertyId } });
  return NextResponse.json({ ok: true });
}
