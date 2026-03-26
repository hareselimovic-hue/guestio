import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await req.json();

  // Verify ownership via property
  const section = await prisma.section.findFirst({
    where: { id, property: { userId: session.user.id } },
  });
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.section.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });

  return NextResponse.json(updated);
}
