import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { updateProspectFields } from "@/lib/prospect-edit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Admin edits an outreach guide (found by its secret token) before / after the follow-up goes out. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token } = await params;
  const p = await prisma.property.findFirst({ where: { prospectToken: token }, select: { id: true } });
  if (!p) return NextResponse.json({ error: "Vodič nije pronađen (preuzet ili istekao)" }, { status: 404 });
  const r = await updateProspectFields(p.id, (await req.json().catch(() => ({}))) as Record<string, unknown>);
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
