import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { userCanUseHotels } from "@/lib/hotel";

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

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);
  const properties = await prisma.property.findMany({
    where: propertyAccessWhere(session.user.id, wsIds, memberUserIds),
    include: { _count: { select: { guests: true, sections: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, internalName, address, customSlug, kind: requestedKind } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = customSlug?.trim() ? toSlug(customSlug.trim()) : slugify(name.trim());

  const existing = await prisma.property.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "This URL is already taken, choose another." }, { status: 409 });

  // Auto-assign to workspace if user belongs to one
  const [wsIds, user] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { accountType: true } }),
  ]);
  const workspaceId = wsIds.length > 0 ? wsIds[0] : null;
  const wanted = requestedKind === "HOTEL" || requestedKind === "APARTMENT" ? requestedKind : user?.accountType === "HOTEL" ? "HOTEL" : "APARTMENT";
  const kind = wanted === "HOTEL" && !(await userCanUseHotels(session.user)) ? "APARTMENT" : wanted;
  // Hotels check in at a reception, with typical hotel times
  const checkin = kind === "HOTEL"
    ? { checkInType: "PERSONAL", checkIn: "14:00", checkOut: "12:00", instructions: "" }
    : { checkIn: "15:00", checkOut: "11:00", instructions: "" };

  const property = await prisma.property.create({
    data: {
      userId: session.user.id,
      workspaceId,
      kind,
      name: name.trim(),
      internalName: internalName?.trim() || null,
      slug,
      address: address?.trim() || null,
      sections: {
        create: [
          { type: "CHECKIN", title: "Check-in & Check-out", content: checkin, order: 0 },
          { type: "WELCOME", title: "Welcome", content: { message: "" }, order: 1 },
          { type: "WIFI", title: "WiFi", content: { network: "", password: "" }, order: 2 },
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
