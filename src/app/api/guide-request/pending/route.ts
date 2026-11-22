import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProspectApiAuthorized } from "@/lib/prospect";
import { MAX_ATTEMPTS } from "@/lib/guide-request";

export const dynamic = "force-dynamic";

/** Browser worker (Bearer PROSPECT_API_TOKEN): requests it should read with a headless browser (incl. stuck NEW ones). */
export async function GET(req: NextRequest) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Also requests stuck in NEW: the direct read on the server ran out of time (no email went out), so the
  // browser worker finishes them on its next run and the admin still gets the review / "failed" email.
  const stuckBefore = new Date(Date.now() - 10 * 60_000);
  const rows = await prisma.guideRequest.findMany({
    where: {
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "NEEDS_BROWSER" }, { status: "NEW", createdAt: { lt: stuckBefore } }],
    },
    select: { id: true, url: true, platform: true, kind: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  return NextResponse.json(rows);
}
