import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json() as { content: string };
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const task = await prisma.task.findFirst({ where: { id, workspaceId: { in: wsIds } } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
