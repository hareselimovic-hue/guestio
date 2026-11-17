import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";

/** PATCH /api/chat-questions/:id  { resolved: boolean } — host marks an unanswered guest question as handled */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { resolved = true } = await req.json().catch(() => ({}));

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);
  const q = await prisma.chatQuestion.findFirst({
    where: { id, property: propertyAccessWhere(session.user.id, wsIds, memberUserIds) },
    select: { id: true },
  });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chatQuestion.update({ where: { id }, data: { resolvedAt: resolved ? new Date() : null } });
  return NextResponse.json({ ok: true });
}
