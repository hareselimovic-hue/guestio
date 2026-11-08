import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public: status of the guest's own requests ("My requests" in the guide).
 * The guide only knows the ids it created on this device; ids are random cuids.
 * GET ?slug=<hotel>&ids=a,b,c
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 30);
  if (!slug || ids.length === 0) return NextResponse.json([]);

  const property = await prisma.property.findUnique({ where: { slug }, select: { id: true, kind: true } });
  if (!property || property.kind !== "HOTEL") return NextResponse.json([]);

  const requests = await prisma.guestRequest.findMany({
    where: { id: { in: ids }, propertyId: property.id },
    select: { id: true, type: true, status: true, items: true, createdAt: true, updatedAt: true, staffReply: true, staffReplyTranslated: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests.map(({ staffReply, staffReplyTranslated, ...r }) => ({ ...r, reply: staffReplyTranslated ?? staffReply })));
}
