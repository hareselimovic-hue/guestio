import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanText, notifyHotelStaff } from "@/lib/hotel";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  HOUSEKEEPING: "Čišćenje sobe", TOWELS: "Peškiri", ISSUE: "Nešto ne radi", WAKEUP: "Buđenje", OTHER: "Drugi zahtjev",
  ORDER: "Narudžba", BOOKING: "Rezervacija",
};

/**
 * Public: the guest cancels their own request from "My requests" (only this device knows its ids).
 * POST { slug, id, reason? } — a request already in progress needs a reason for the reception.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { slug?: unknown; id?: unknown; reason?: unknown } | null;
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const id = typeof body?.id === "string" ? body.id : "";
  const reason = cleanText(body?.reason, 500);
  if (!slug || !id) return NextResponse.json({ error: "Missing request" }, { status: 400 });

  const property = await prisma.property.findUnique({
    where: { slug },
    select: { id: true, kind: true, name: true, receptionEmail: true, workspaceId: true, userId: true },
  });
  if (!property || property.kind !== "HOTEL") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = await prisma.guestRequest.findFirst({ where: { id, propertyId: property.id } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (r.status !== "NEW" && r.status !== "IN_PROGRESS") return NextResponse.json({ error: "Already finished" }, { status: 409 });
  if (r.status === "IN_PROGRESS" && !reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  // Guarded on the current status, so a reception click at the same moment can't be overwritten
  const { count } = await prisma.guestRequest.updateMany({
    where: { id: r.id, status: r.status },
    data: { status: "CANCELED", cancelReason: reason, canceledAt: new Date() },
  });
  if (count !== 1) return NextResponse.json({ error: "Changed meanwhile" }, { status: 409 });

  const items = Array.isArray(r.items) ? (r.items as { name?: string; qty?: number }[]).map((i) => `${i.qty ?? 1} × ${i.name ?? ""}`).join("\n") : "";
  const rows: [string, string][] = [
    ["Zahtjev", LABEL[r.type] ?? r.type],
    ...(items ? [["Stavke", items] as [string, string]] : []),
    ["Status prije", r.status === "IN_PROGRESS" ? "U toku" : "Primljeno"],
    ...(reason ? [["Komentar gosta", reason] as [string, string]] : []),
  ];
  await notifyHotelStaff(property, `Gost je otkazao zahtjev – soba ${r.roomNumber ?? "?"}`, rows, "/dashboard/hotel");
  return NextResponse.json({ ok: true });
}
