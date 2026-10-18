import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";

export const dynamic = "force-dynamic";

async function accessWhere(userId: string) {
  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(userId),
    getWorkspaceMemberUserIds(userId),
  ]);
  return propertyAccessWhere(userId, wsIds, memberUserIds);
}

// Lists properties with their guest registration switch
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const properties = await prisma.property.findMany({
    where: await accessWhere(session.user.id),
    select: { id: true, name: true, guestRegistrationEnabled: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(properties);
}

// Body: { ids: string[], enabled: boolean }
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, enabled } = await req.json();
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string") || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await prisma.property.updateMany({
    where: { AND: [{ id: { in: ids } }, await accessWhere(session.user.id)] },
    data: { guestRegistrationEnabled: enabled },
  });
  return NextResponse.json({ updated: result.count });
}
