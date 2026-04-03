import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const RENTLIO_API_KEY = process.env.RENTLIO_API_KEY!;
const ADMIN_EMAIL = "hareselimovic@gmail.com";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

async function fetchAllRentlioProperties() {
  let page = 1;
  const allProperties = [];

  while (true) {
    const res = await fetch(`https://api.rentl.io/v1/properties?page=${page}&perPage=30`, {
      headers: { apikey: RENTLIO_API_KEY },
    });
    const data = await res.json();
    if (!data.data || data.data.length === 0) break;
    allProperties.push(...data.data);
    if (allProperties.length >= data.total) break;
    page++;
  }

  return allProperties;
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all properties from Rentlio
  const rentlioProperties = await fetchAllRentlioProperties();

  // Get existing properties with rentlioPropertyId set
  const existingProperties = await prisma.property.findMany({
    where: { rentlioPropertyId: { not: null } },
    select: { rentlioPropertyId: true },
  });
  const existingIds = new Set(existingProperties.map((p) => p.rentlioPropertyId));

  // Get workspace for admin user
  const wsResult = await prisma.workspace.findFirst({
    where: { owner: { email: ADMIN_EMAIL } },
  });
  const workspaceId = wsResult?.id ?? null;

  const toCreate = rentlioProperties.filter((p) => !existingIds.has(p.id));

  const created = [];
  for (const rp of toCreate) {
    const slug = slugify(rp.name);
    const property = await prisma.property.create({
      data: {
        userId: session.user.id,
        workspaceId,
        name: rp.name,
        slug,
        address: [rp.address, rp.city].filter(Boolean).join(", ") || null,
        rentlioPropertyId: rp.id,
        sections: {
          create: [
            { type: "CHECKIN", title: "Check-in & Check-out", content: { checkIn: "15:00", checkOut: "11:00", instructions: "" }, order: 0 },
            { type: "WELCOME", title: "Welcome", content: { message: "" }, order: 1 },
            { type: "WIFI", title: "WiFi", content: { network: "", password: "" }, order: 2 },
            { type: "HOUSE_RULES", title: "House Rules", content: { rules: [] }, order: 3 },
            { type: "LOCATION", title: "Location", content: { address: [rp.address, rp.city].filter(Boolean).join(", ") || "", mapUrl: "", directions: "" }, order: 4 },
            { type: "LOCAL_RECS", title: "Local Recommendations", content: { places: [] }, order: 5 },
            { type: "CONTACT", title: "Contact", content: { phone: rp.mobilePhone || rp.phone || "", label: "" }, order: 6 },
            { type: "PARKING", title: "Parking", content: { available: false, parkingType: "", paid: false, notes: "" }, order: 7 },
          ],
        },
      },
    });
    created.push({ id: property.id, name: rp.name, rentlioId: rp.id });
  }

  return NextResponse.json({
    ok: true,
    total: rentlioProperties.length,
    alreadyExisted: existingIds.size,
    created: created.length,
    createdProperties: created,
  });
}
