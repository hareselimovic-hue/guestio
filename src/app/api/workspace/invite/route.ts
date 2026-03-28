import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Get current active invite link
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await prisma.workspace.findFirst({ where: { ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ token: null });

  const invite = await prisma.workspaceInvite.findFirst({
    where: { workspaceId: workspace.id, expiresAt: { gt: new Date() } },
  });

  return NextResponse.json({ token: invite?.token ?? null });
}

// Generate a new invite link (30 days) — reuses existing if still valid
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await prisma.workspace.findFirst({ where: { ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

  // Reuse existing active invite
  const existing = await prisma.workspaceInvite.findFirst({
    where: { workspaceId: workspace.id, expiresAt: { gt: new Date() } },
  });
  if (existing) return NextResponse.json({ token: existing.token });

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: workspace.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ token: invite.token });
}

// Invalidate current invite and generate a fresh one
export async function PUT() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await prisma.workspace.findFirst({ where: { ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

  await prisma.workspaceInvite.updateMany({
    where: { workspaceId: workspace.id },
    data: { expiresAt: new Date(0) },
  });

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: workspace.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ token: invite.token });
}
