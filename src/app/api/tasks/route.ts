import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const INCLUDE = {
  author: { select: { id: true, name: true, email: true, image: true } },
  property: { select: { id: true, name: true } },
  comments: {
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  if (wsIds.length === 0) return NextResponse.json([]);

  const tasks = await prisma.task.findMany({
    where: { workspaceId: { in: wsIds } },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, propertyId, mentionIds } = await req.json() as {
    content: string;
    propertyId?: string;
    mentionIds?: string[];
  };

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  if (wsIds.length === 0) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const task = await prisma.task.create({
    data: {
      workspaceId: wsIds[0],
      authorId: session.user.id,
      content: content.trim(),
      propertyId: propertyId || null,
      mentionIds: mentionIds || [],
    },
    include: INCLUDE,
  });

  return NextResponse.json(task, { status: 201 });
}
