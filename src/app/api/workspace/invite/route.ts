import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Generate a new invite link (30 days)
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await prisma.workspace.findFirst({ where: { ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 });

  // Invalidate old invites
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
