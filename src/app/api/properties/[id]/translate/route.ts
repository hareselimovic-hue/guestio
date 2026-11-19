import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";
import { translateSections } from "@/lib/translate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: propertyId } = await params;
  const body = await req.json();
  const sectionIds: string[] = body.sectionIds ?? [];

  if (sectionIds.length === 0) return NextResponse.json({ ok: true, count: 0 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const accessFilter = wsIds.length > 0
    ? { OR: [{ workspaceId: { in: wsIds } }, { userId: session.user.id, workspaceId: null }] }
    : { userId: session.user.id };

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...accessFilter },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const count = await translateSections(propertyId, sectionIds);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    console.error("Batch translation failed:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
