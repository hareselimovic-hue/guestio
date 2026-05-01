import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);
  const accessWhere = propertyAccessWhere(session.user.id, wsIds, memberUserIds);

  const properties = await prisma.property.findMany({
    where: accessWhere,
    select: {
      id: true,
      name: true,
      slug: true,
      previewViewCount: true,
      guests: {
        select: {
          id: true,
          token: true,
          guestName: true,
          viewCount: true,
          createdAt: true,
          views: {
            select: { viewedAt: true },
            orderBy: { viewedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ properties });
}
