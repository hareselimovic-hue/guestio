import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, propertyAccessWhere } from "@/lib/workspace";

export const dynamic = "force-dynamic";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugify(text: string) {
  return toSlug(text) + "-" + Math.random().toString(36).slice(2, 7);
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const properties = await prisma.property.findMany({
    where: propertyAccessWhere(session.user.id, wsIds),
    include: { _count: { select: { guests: true, sections: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, address, customSlug } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = customSlug?.trim() ? toSlug(customSlug.trim()) : slugify(name.trim());

  const existing = await prisma.property.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "This URL is already taken, choose another." }, { status: 409 });

  // Auto-assign to workspace if user belongs to one
  const wsIds = await getUserWorkspaceIds(session.user.id);
  const workspaceId = wsIds.length > 0 ? wsIds[0] : null;

  const property = await prisma.property.create({
    data: {
      userId: session.user.id,
      workspaceId,
      name: name.trim(),
      slug,
      address: address?.trim() || null,
      sections: {
        create: [
          { type: "WELCOME", title: "Welcome", content: { message: "" }, order: 0 },
          { type: "WIFI", title: "WiFi", content: { network: "", password: "" }, order: 1 },
          { type: "CHECKIN", title: "Check-in & Check-out", content: { checkIn: "15:00", checkOut: "11:00", instructions: "" }, order: 2 },
          { type: "HOUSE_RULES", title: "House Rules", content: { rules: [] }, order: 3 },
          { type: "LOCATION", title: "Location", content: { address: address?.trim() || "", mapUrl: "", directions: "" }, order: 4 },
          { type: "LOCAL_RECS", title: "Local Recommendations", content: { places: [] }, order: 5 },
          { type: "CONTACT", title: "Contact", content: { phone: "", label: "" }, order: 6 },
          { type: "PARKING", title: "Parking", content: { available: false, parkingType: "", paid: false, notes: "" }, order: 7 },
        ],
      },
    },
    include: { sections: true },
  });

  return NextResponse.json(property, { status: 201 });
}
