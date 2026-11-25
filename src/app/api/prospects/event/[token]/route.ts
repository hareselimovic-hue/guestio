import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findOpenProspect, PROSPECT_OWNER_EMAIL } from "@/lib/prospect";

export const dynamic = "force-dynamic";

const TYPES = new Set(["view", "claim_page", "register_start"]);

/**
 * POST {type} — one step of the outreach-guide funnel (guide really opened → claim page → signup started).
 * Skipped for the admin's own visits and repeated within 10 minutes, so the dashboard shows real prospects.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { type } = await req.json().catch(() => ({}));
  if (typeof type !== "string" || !TYPES.has(type)) return NextResponse.json({ error: "Bad type" }, { status: 400 });

  const p = await findOpenProspect(token);
  if (!p) return NextResponse.json({ ok: true });

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (session?.user.email?.toLowerCase() === PROSPECT_OWNER_EMAIL.toLowerCase()) return NextResponse.json({ ok: true, skipped: "admin" });

  const recent = await prisma.prospectEvent.findFirst({
    where: { propertyId: p.id, type, createdAt: { gt: new Date(Date.now() - 10 * 60_000) } },
    select: { id: true },
  });
  if (!recent) await prisma.prospectEvent.create({ data: { propertyId: p.id, type } });
  return NextResponse.json({ ok: true });
}
