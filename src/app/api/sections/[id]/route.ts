import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  // Verify access via property (own or workspace)
  const wsIds = await getUserWorkspaceIds(session.user.id);
  const accessFilter = wsIds.length > 0
    ? { OR: [{ workspaceId: { in: wsIds } }, { userId: session.user.id, workspaceId: null }] }
    : { userId: session.user.id };
  const section = await prisma.section.findFirst({
    where: { id, property: accessFilter },
  });
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.section.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const accessFilter = wsIds.length > 0
    ? { OR: [{ workspaceId: { in: wsIds } }, { userId: session.user.id, workspaceId: null }] }
    : { userId: session.user.id };
  const section = await prisma.section.findFirst({
    where: { id, property: accessFilter },
  });
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Only allow deleting CUSTOM sections
  if (section.type !== "CUSTOM") return NextResponse.json({ error: "Cannot delete built-in sections" }, { status: 400 });

  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
