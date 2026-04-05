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

// Samo matcha postojeće propertije po imenu — ne kreira nove
export async function POST() {
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

  const localProperties = await prisma.property.findMany({
    where: { workspaceId: workspace.id, rentlioPropertyId: null },
    select: { id: true, name: true },
  });

  const localByName = new Map(localProperties.map(p => [p.name.toLowerCase().trim(), p]));

  const matched = [];
  const unmatched = [];

  for (const rp of rentlioProperties) {
    const local = localByName.get(rp.name.toLowerCase().trim());
    if (local) {
      await prisma.property.update({
        where: { id: local.id },
        data: { rentlioPropertyId: rp.id },
      });
      matched.push({ localName: local.name, rentlioId: rp.id });
    } else {
      unmatched.push(rp.name);
    }
  }

  return NextResponse.json({
    ok: true,
    matched: matched.length,
    unmatched: unmatched.length,
    matchedProperties: matched,
  });
}
