import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);

  const registration = await prisma.guestRegistration.findFirst({
    where: { id, property: propertyAccessWhere(session.user.id, wsIds, memberUserIds) },
    select: { id: true },
  });
  if (!registration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.guestRegistration.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
