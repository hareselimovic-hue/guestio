import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { updateProspectFields } from "@/lib/prospect-edit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin fills in what the listing didn't say before approving:
 * PATCH { welcome?, wifiNetwork?, wifiPassword?, checkIn?, checkOut?, instructions?, phone? }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gr = await prisma.guideRequest.findUnique({ where: { id }, select: { propertyId: true } });
  if (!gr?.propertyId) return NextResponse.json({ error: "Zahtjev nema vodič" }, { status: 404 });
  const r = await updateProspectFields(gr.propertyId, (await req.json().catch(() => ({}))) as Record<string, unknown>);
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
