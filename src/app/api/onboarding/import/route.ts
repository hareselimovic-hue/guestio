import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPlatform, normaliseUrl } from "@/lib/listing-import";
import { processGuideRequest } from "@/lib/guide-request";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // listing read + AI draft run in after()

/**
 * Public (the /start wizard calls it before the account exists, the app's "New property" after):
 * POST { url, email? } → { id } and the listing is read into a draft in the background.
 * Poll GET /api/onboarding/import/<id> for the result.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const platform = rawUrl.length > 3 && rawUrl.length < 1000 ? detectPlatform(withProto) : null;
  if (!platform) return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  const url = normaliseUrl(withProto);

  // Abuse guard: 10 per IP and 150 in total per day (each read costs an AI call)
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || null;
  const since = new Date(Date.now() - 86_400_000);
  const [mine, all] = await Promise.all([
    ip ? prisma.guideRequest.count({ where: { purpose: "ONBOARDING", ip, createdAt: { gt: since } } }) : 0,
    prisma.guideRequest.count({ where: { purpose: "ONBOARDING", createdAt: { gt: since } } }),
  ]);
  if (mine >= 10 || all >= 150) return NextResponse.json({ error: "TOO_MANY" }, { status: 429 });

  // Same link read in the last hour → reuse it (going back and forth in the wizard)
  const recent = await prisma.guideRequest.findFirst({
    where: { purpose: "ONBOARDING", url, propertyId: null, status: { not: "FAILED" }, createdAt: { gt: new Date(Date.now() - 3_600_000) } },
    select: { id: true },
  });
  if (recent) return NextResponse.json({ id: recent.id, platform });

  // Lead list: someone who leaves the wizard early still gets the "your trial is waiting" follow-up
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await prisma.whitelistEmail.upsert({ where: { email }, update: {}, create: { email } }).catch(() => {});
  }

  const gr = await prisma.guideRequest.create({ data: { purpose: "ONBOARDING", email, url, platform, kind: "APARTMENT", ip } });
  after(async () => {
    try {
      await processGuideRequest(gr.id);
    } catch (e) {
      console.error("[onboarding] import failed:", e);
    }
  });
  return NextResponse.json({ id: gr.id, platform });
}
