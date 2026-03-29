import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const accessFilter = wsIds.length > 0
    ? { OR: [{ workspaceId: { in: wsIds } }, { userId: session.user.id, workspaceId: null }] }
    : { userId: session.user.id };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...accessFilter },
    include: { sections: { select: { order: true } } },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const maxOrder = property.sections.reduce((max, s) => Math.max(max, s.order), 0);

  const section = await prisma.section.create({
    data: {
      propertyId,
      type: "CUSTOM",
      title: "Custom",
      content: { body: "", links: [] },
      order: maxOrder + 1,
    },
  });

  return NextResponse.json(section, { status: 201 });
}
