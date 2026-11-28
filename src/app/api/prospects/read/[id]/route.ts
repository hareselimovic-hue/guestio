import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProspectApiAuthorized } from "@/lib/prospect";

export const dynamic = "force-dynamic";

/** Sales agent: result of POST /api/prospects/read → { status: "READING" | "READY" | "FAILED", platform, raw?, error? } */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const gr = await prisma.guideRequest.findFirst({ where: { id, purpose: "AGENT_READ" }, select: { status: true, platform: true, raw: true, error: true } });
  if (!gr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const status = gr.status === "READY" ? "READY" : gr.status === "FAILED" ? "FAILED" : "READING";
  return NextResponse.json(
    { status, platform: gr.platform, ...(status === "READY" ? { raw: gr.raw } : {}), ...(status === "FAILED" ? { error: gr.error } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
