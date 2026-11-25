import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public, by the unguessable request id: how far the listing read is.
 * → { status: "READING" | "READY" | "FAILED", platform, draft? }
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gr = await prisma.guideRequest.findFirst({
    where: { id, purpose: "ONBOARDING" },
    select: { status: true, platform: true, draft: true, createdAt: true },
  });
  if (!gr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const status = gr.status === "READY" ? "READY" : gr.status === "FAILED" ? "FAILED" : "READING";
  return NextResponse.json({
    status,
    platform: gr.platform,
    // Booking goes through the browser worker; tells the screen to offer "continue without waiting"
    slow: status === "READING" && (gr.status === "NEEDS_BROWSER" || Date.now() - gr.createdAt.getTime() > 60_000),
    draft: status === "READY" ? gr.draft : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
