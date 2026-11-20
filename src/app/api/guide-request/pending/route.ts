import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProspectApiAuthorized } from "@/lib/prospect";
import { MAX_ATTEMPTS } from "@/lib/guide-request";

export const dynamic = "force-dynamic";

/** Browser worker (Bearer PROSPECT_API_TOKEN): requests it should read with a headless browser. */
export async function GET(req: NextRequest) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.guideRequest.findMany({
    where: { status: "NEEDS_BROWSER", attempts: { lt: MAX_ATTEMPTS } },
    select: { id: true, url: true, platform: true, kind: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  return NextResponse.json(rows);
}
