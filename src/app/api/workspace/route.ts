import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getUserWorkspace(session.user.id);
  return NextResponse.json(result ?? null);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user already has a workspace
  const existing = await getUserWorkspace(session.user.id);
  if (existing) return NextResponse.json({ error: "Already in a workspace" }, { status: 409 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      ownerId: session.user.id,
      members: { create: { userId: session.user.id } },
    },
  });

  // Assign all existing personal properties to this workspace
  await prisma.property.updateMany({
    where: { userId: session.user.id, workspaceId: null },
    data: { workspaceId: workspace.id },
  });

  const result = await getUserWorkspace(session.user.id);
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const workspace = await prisma.workspace.findFirst({ where: { ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: { name: name.trim() },
  });

  return NextResponse.json(updated);
}
