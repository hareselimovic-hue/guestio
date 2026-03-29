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
  const body = await req.json();
  const sectionIds: string[] = body.sectionIds ?? [];

  if (sectionIds.length === 0) return NextResponse.json({ ok: true, count: 0 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  const accessFilter = wsIds.length > 0
    ? { OR: [{ workspaceId: { in: wsIds } }, { userId: session.user.id, workspaceId: null }] }
    : { userId: session.user.id };

  // Verify property access
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...accessFilter },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://guestio.vercel.app";
  const authHeaders = req.headers;

  // Fire off translate for each section (sequential to avoid rate limits)
  let count = 0;
  for (const sectionId of sectionIds) {
    try {
      const res = await fetch(`${baseUrl}/api/sections/${sectionId}/translate`, {
        method: "POST",
        headers: {
          cookie: authHeaders.get("cookie") ?? "",
        },
      });
      if (res.ok) count++;
    } catch (e) {
      console.error(`Failed to translate section ${sectionId}:`, e);
    }
  }

  return NextResponse.json({ ok: true, count });
}
