import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
  });

  if (!workspace?.rentlioApiKey) {
    return NextResponse.json({ error: "Rentlio nije konektovan" }, { status: 400 });
  }

  const rentlioProperties = await fetchAllRentlioProperties(workspace.rentlioApiKey);

  // Svi SmartStay propertiji u workspaceu
  const localProperties = await prisma.property.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, rentlioPropertyId: true },
  });

  const linkedIds = new Set(localProperties.filter(p => p.rentlioPropertyId).map(p => p.rentlioPropertyId));
  const localByName = new Map(localProperties.map(p => [p.name.toLowerCase().trim(), p]));

  const items = rentlioProperties.map((rp) => {
    if (linkedIds.has(rp.id)) {
      // Već linkovan
      const local = localProperties.find(p => p.rentlioPropertyId === rp.id);
      return { rentlioId: rp.id, rentlioName: rp.name, status: "linked" as const, localName: local?.name };
    }
    const nameMatch = localByName.get(rp.name.toLowerCase().trim());
    if (nameMatch) {
      // Postoji lokalno po imenu — može se matchati
      return { rentlioId: rp.id, rentlioName: rp.name, status: "matchable" as const, localName: nameMatch.name, localId: nameMatch.id };
    }
    // Novi — treba kreirati
    return { rentlioId: rp.id, rentlioName: rp.name, status: "new" as const };
  });

  return NextResponse.json({
    total: rentlioProperties.length,
    linked: items.filter(i => i.status === "linked").length,
    matchable: items.filter(i => i.status === "matchable").length,
    new: items.filter(i => i.status === "new").length,
    items,
  });
}
