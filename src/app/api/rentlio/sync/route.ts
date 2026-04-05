import { NextResponse } from "next/server";
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
    .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

async function fetchAllRentlioProperties(apiKey: string) {
  let page = 1;
  const allProperties = [];

  while (true) {
    const res = await fetch(`https://api.rentl.io/v1/properties?page=${page}&perPage=30`, {
      headers: { apikey: apiKey },
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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Pronađi workspace korisnika
  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!workspace?.rentlioApiKey) {
    return NextResponse.json(
      { error: "Rentlio nije konektovan. Dodaj API key u Settings → Integrations." },
      { status: 400 }
    );
  }

  // Fetch svih propertija iz Rentlia
  const rentlioProperties = await fetchAllRentlioProperties(workspace.rentlioApiKey);

  // Svi lokalni propertiji u workspaceu
  const localProperties = await prisma.property.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, rentlioPropertyId: true },
  });

  const linkedIds = new Set(localProperties.filter(p => p.rentlioPropertyId).map(p => p.rentlioPropertyId));
  const localByName = new Map(localProperties.map(p => [p.name.toLowerCase().trim(), p]));

  const matched = [];
  const created = [];
  const skipped = [];

  for (const rp of rentlioProperties) {
    // Već linkovan — preskoči
    if (linkedIds.has(rp.id)) {
      skipped.push(rp.name);
      continue;
    }

    // Postoji lokalno po imenu — povezi ID
    const nameMatch = localByName.get(rp.name.toLowerCase().trim());
    if (nameMatch) {
      await prisma.property.update({
        where: { id: nameMatch.id },
        data: { rentlioPropertyId: rp.id },
      });
      matched.push({ localName: nameMatch.name, rentlioId: rp.id });
      continue;
    }

    // Novi — kreiraj
    const slug = slugify(rp.name);
    const property = await prisma.property.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
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
    alreadyLinked: skipped.length,
    matched: matched.length,
    created: created.length,
    matchedProperties: matched,
    createdProperties: created,
  });
}
