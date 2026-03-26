import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    + "-" + Math.random().toString(36).slice(2, 7);
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const properties = await prisma.property.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { guests: true, sections: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, address } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const property = await prisma.property.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      slug: slugify(name.trim()),
      address: address?.trim() || null,
      sections: {
        create: [
          { type: "WELCOME", title: "Dobrodošlica", content: { message: "" }, order: 0 },
          { type: "WIFI", title: "WiFi", content: { network: "", password: "" }, order: 1 },
          { type: "CHECKIN", title: "Check-in & Check-out", content: { checkIn: "15:00", checkOut: "11:00", instructions: "" }, order: 2 },
          { type: "HOUSE_RULES", title: "Kućna pravila", content: { rules: [] }, order: 3 },
          { type: "LOCATION", title: "Lokacija", content: { address: address?.trim() || "", mapUrl: "", directions: "" }, order: 4 },
          { type: "LOCAL_RECS", title: "Lokalne preporuke", content: { places: [] }, order: 5 },
        ],
      },
    },
    include: { sections: true },
  });

  return NextResponse.json(property, { status: 201 });
}
