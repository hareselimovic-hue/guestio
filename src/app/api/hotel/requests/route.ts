import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedHotelIds } from "@/lib/hotel";

export const dynamic = "force-dynamic";

/** Staff inbox: requests from all hotels the user manages. ?propertyId= narrows it, ?open=1 hides finished ones. */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hotelIds = await getManagedHotelIds(session.user.id);
  const only = req.nextUrl.searchParams.get("propertyId");
  const ids = only ? hotelIds.filter((id) => id === only) : hotelIds;
  const open = req.nextUrl.searchParams.get("open") === "1";

  const requests = await prisma.guestRequest.findMany({
    where: { propertyId: { in: ids }, ...(open ? { status: { in: ["NEW", "IN_PROGRESS"] } } : {}) },
    include: { property: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(requests);
}
