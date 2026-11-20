import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { translateSections } from "@/lib/translate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

/**
 * Admin fills in what the listing didn't say before approving:
 * PATCH { welcome?, wifiNetwork?, wifiPassword?, checkIn?, checkOut?, instructions?, phone? }
 * Only sent fields change; changed sections are re-translated.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gr = await prisma.guideRequest.findUnique({ where: { id }, select: { propertyId: true, sentAt: true } });
  if (!gr?.propertyId) return NextResponse.json({ error: "Zahtjev nema vodič" }, { status: 404 });
  const prop = await prisma.property.findUnique({
    where: { id: gr.propertyId },
    select: { id: true, prospectToken: true, sections: { select: { id: true, type: true, content: true } } },
  });
  if (!prop?.prospectToken) return NextResponse.json({ error: "Vodič je već preuzet ili istekao" }, { status: 409 });

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patches: Record<string, Record<string, string>> = {
    WELCOME: { ...(str(b.welcome) !== undefined ? { message: str(b.welcome)! } : {}) },
    WIFI: {
      ...(str(b.wifiNetwork, 120) !== undefined ? { network: str(b.wifiNetwork, 120)! } : {}),
      ...(str(b.wifiPassword, 120) !== undefined ? { password: str(b.wifiPassword, 120)! } : {}),
    },
    CHECKIN: {
      ...(str(b.checkIn, 10) !== undefined ? { checkIn: str(b.checkIn, 10)! } : {}),
      ...(str(b.checkOut, 10) !== undefined ? { checkOut: str(b.checkOut, 10)! } : {}),
      ...(str(b.instructions) !== undefined ? { instructions: str(b.instructions)! } : {}),
    },
    CONTACT: { ...(str(b.phone, 40) !== undefined ? { phone: str(b.phone, 40)! } : {}) },
  };

  const changed: string[] = [];
  for (const [type, patch] of Object.entries(patches)) {
    if (!Object.keys(patch).length) continue;
    const s = prop.sections.find((x) => x.type === type);
    if (!s) continue;
    await prisma.section.update({ where: { id: s.id }, data: { content: { ...(s.content as object), ...patch } } });
    if (type !== "WIFI" && type !== "CONTACT") changed.push(s.id); // codes/numbers need no translation
  }
  if (changed.length) {
    try { await translateSections(prop.id, changed); } catch (e) { console.error("[guide-request] re-translate failed:", e); }
  }
  return NextResponse.json({ ok: true });
}
