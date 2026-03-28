import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;

  const invite = await prisma.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });

  if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite link has expired" }, { status: 410 });

  // Check if already in a workspace
  const existing = await getUserWorkspace(session.user.id);
  if (existing) {
    if (existing.workspace.id === invite.workspaceId) {
      return NextResponse.json({ alreadyMember: true });
    }
    return NextResponse.json({ error: "Already in a different workspace" }, { status: 409 });
  }

  // Add as member
  await prisma.workspaceMember.create({
    data: { workspaceId: invite.workspaceId, userId: session.user.id },
  });

  // Assign their existing properties to this workspace
  await prisma.property.updateMany({
    where: { userId: session.user.id, workspaceId: null },
    data: { workspaceId: invite.workspaceId },
  });

  return NextResponse.json({ ok: true, workspaceName: invite.workspace.name });
}
