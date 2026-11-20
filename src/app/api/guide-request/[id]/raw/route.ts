import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isProspectApiAuthorized } from "@/lib/prospect";
import { buildFromRaw, failRequest, MAX_ATTEMPTS } from "@/lib/guide-request";
import type { RawListing } from "@/lib/listing-import";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Browser worker posts what it read: { raw: RawListing } → guide is built + admin is emailed,
 * or { error } → retried up to MAX_ATTEMPTS, then FAILED (admin is emailed to make it by hand).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isProspectApiAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const gr = await prisma.guideRequest.findUnique({ where: { id } });
  if (!gr) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null) as { raw?: RawListing; error?: string } | null;

  if (!body?.raw?.name) {
    const error = String(body?.error ?? "worker could not read the page").slice(0, 300);
    if (gr.attempts + 1 >= MAX_ATTEMPTS) {
      await failRequest(id, error);
    } else {
      await prisma.guideRequest.update({ where: { id }, data: { attempts: { increment: 1 }, error } });
    }
    return NextResponse.json({ ok: false });
  }
  const raw: RawListing = { ...body.raw, platform: gr.platform as RawListing["platform"], url: gr.url };
  const r = await buildFromRaw(id, raw);
  return NextResponse.json(r);
}
