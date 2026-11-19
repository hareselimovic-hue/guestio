import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds } from "@/lib/workspace";
import { findOpenProspect, prospectGuideUrl } from "@/lib/prospect";

export const dynamic = "force-dynamic";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** GET — what the claim page shows (name, kind, outreach email for prefilling the signup form). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await findOpenProspect(token);
  if (!p) return NextResponse.json({ error: "Vodič više nije dostupan." }, { status: 404 });
  return NextResponse.json({ name: p.name, kind: p.kind, email: p.prospectEmail, guideUrl: prospectGuideUrl(p.slug, token) });
}

/** POST (signed in) — the guide moves to this user's account; the secret link stops being special. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await params;
  const p = await findOpenProspect(token);
  if (!p) return NextResponse.json({ error: "Vodič više nije dostupan." }, { status: 404 });

  const wsIds = await getUserWorkspaceIds(session.user.id);
  // Guarded on the token so two clicks (or two people) can't both claim it
  const { count } = await prisma.property.updateMany({
    where: { id: p.id, prospectToken: token, prospectClaimedAt: null },
    data: {
      userId: session.user.id,
      workspaceId: wsIds[0] ?? null,
      internalName: null,
      prospectToken: null,
      prospectExpiresAt: null,
      prospectClaimedAt: new Date(),
    },
  });
  if (count !== 1) return NextResponse.json({ error: "Vodič je već preuzet." }, { status: 409 });

  // A hotel guide needs hotel mode on the account (rooms, requests, services)
  if (p.kind === "HOTEL") {
    await prisma.user.update({ where: { id: session.user.id }, data: { hotelAccess: true, accountType: "HOTEL" } });
  }

  try {
    if (process.env.RESEND_API_KEY) {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba",
        to: "info@smartstay.ba",
        subject: `Vodič preuzet: ${p.name}`,
        html: `<p>Pripremljeni outreach vodič je preuzet.</p>
<p><strong>Objekat:</strong> ${escapeHtml(p.name)}<br>
<strong>Outreach email:</strong> ${escapeHtml(p.prospectEmail ?? "—")}<br>
<strong>Preuzeo:</strong> ${escapeHtml(session.user.name ?? "")} &lt;${escapeHtml(session.user.email)}&gt;</p>`,
      });
    }
  } catch (err) {
    console.error("[prospects] claim notification failed:", err);
  }

  return NextResponse.json({
    ok: true,
    redirect: p.kind === "HOTEL" ? `/dashboard/hotel?property=${p.id}&tab=guide` : `/dashboard/properties/${p.id}`,
  });
}
