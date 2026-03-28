import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findFirst({ where: { ownerId: session.user.id } });
  if (!workspace) return NextResponse.json({ error: "Not a workspace owner" }, { status: 403 });

  await prisma.workspaceMember.deleteMany({
    where: { workspaceId: workspace.id, userId },
  });

  // Unassign their properties from the workspace
  await prisma.property.updateMany({
    where: { userId, workspaceId: workspace.id },
    data: { workspaceId: null },
  });

  return NextResponse.json({ ok: true });
}
