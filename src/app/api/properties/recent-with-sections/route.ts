import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const excludeId = req.nextUrl.searchParams.get("exclude") ?? "";

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);

  const accessWhere = propertyAccessWhere(session.user.id, wsIds, memberUserIds);

  const properties = await prisma.property.findMany({
    where: {
      AND: [
        accessWhere,
        excludeId ? { id: { not: excludeId } } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      sections: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
        },
      },
    },
  });

  return NextResponse.json(properties);
}
