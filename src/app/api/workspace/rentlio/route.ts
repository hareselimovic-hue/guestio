import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getWorkspaceForUser(userId: string) {
  return prisma.workspace.findFirst({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
}

async function testRentlioKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.rentl.io/v1/properties?page=1&perPage=1", {
      headers: { apikey: apiKey },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// GET — status konekcije
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: !!workspace.rentlioApiKey,
    connectedAt: workspace.rentlioConnectedAt,
    maskedKey: workspace.rentlioApiKey
      ? "••••••••" + workspace.rentlioApiKey.slice(-4)
      : null,
  });
}

// POST — spoji Rentlio (test + spremi API key)
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

  if (workspace.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only the workspace owner can manage integrations" }, { status: 403 });
  }

  const { apiKey } = await req.json();
  if (!apiKey?.trim()) return NextResponse.json({ error: "API key is required" }, { status: 400 });

  const valid = await testRentlioKey(apiKey.trim());
  if (!valid) {
    return NextResponse.json({ error: "Invalid Rentlio API key — connection failed" }, { status: 400 });
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      rentlioApiKey: apiKey.trim(),
      rentlioConnectedAt: new Date(),
    },
  });

  return NextResponse.json({
    connected: true,
    connectedAt: new Date(),
    maskedKey: "••••••••" + apiKey.trim().slice(-4),
  });
}

// DELETE — odspoji Rentlio
export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await getWorkspaceForUser(session.user.id);
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  if (workspace.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only the workspace owner can manage integrations" }, { status: 403 });
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { rentlioApiKey: null, rentlioConnectedAt: null },
  });

  return NextResponse.json({ connected: false });
}
