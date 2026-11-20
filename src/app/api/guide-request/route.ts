import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPlatform, normaliseUrl } from "@/lib/listing-import";
import { processGuideRequest } from "@/lib/guide-request";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // read listing + AI + translation run in after()

const ORIGINS = new Set(["https://smartstay.ba", "https://www.smartstay.ba", "http://localhost:8080", "http://127.0.0.1:8080"]);
function cors(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://smartstay.ba",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

/**
 * Public: "Zalijepite link vašeg Airbnb ili Booking oglasa — šaljemo vam spreman vodič na mail."
 * POST { email, url, kind?: "APARTMENT"|"HOTEL", lang?: "bs"|"en" } → 200 { ok }
 * The guide is built in the background and only reaches the visitor after the admin approves it.
 */
export async function POST(req: NextRequest) {
  const headers = cors(req);
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";
  const kind = body?.kind === "HOTEL" ? "HOTEL" : "APARTMENT";
  const lang = body?.lang === "en" ? "en" : "bs";
  const en = lang === "en";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: en ? "Please enter a valid email." : "Upišite ispravan email." }, { status: 400, headers });
  }
  const withProto = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const platform = rawUrl.length > 3 && rawUrl.length < 1000 ? detectPlatform(withProto) : null;
  if (!platform) {
    return NextResponse.json({ error: en ? "Paste the link of your Airbnb or Booking listing (or your website)." : "Zalijepite link vašeg Airbnb ili Booking oglasa (ili vašeg sajta)." }, { status: 400, headers });
  }
  const url = normaliseUrl(withProto);

  // Simple abuse guard: 3 per email and 40 in total per day
  const since = new Date(Date.now() - 86_400_000);
  const [mine, all] = await Promise.all([
    prisma.guideRequest.count({ where: { email, createdAt: { gt: since } } }),
    prisma.guideRequest.count({ where: { createdAt: { gt: since } } }),
  ]);
  if (mine >= 3 || all >= 40) {
    return NextResponse.json({ error: en ? "We already received your request — the guide is on its way." : "Vaš zahtjev je već stigao — vodič je na putu." }, { status: 429, headers });
  }

  // Lead list (marks hotel leads; feeds the onboarding follow-up)
  await prisma.whitelistEmail.upsert({
    where: { email },
    update: kind === "HOTEL" ? { hotel: true } : {},
    create: { email, hotel: kind === "HOTEL" },
  });

  const gr = await prisma.guideRequest.create({ data: { email, url, platform, kind, lang } });
  after(async () => {
    try {
      await processGuideRequest(gr.id);
    } catch (e) {
      console.error("[guide-request] processing failed:", e);
    }
  });
  return NextResponse.json({ ok: true }, { headers });
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req) });
}
