import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanText, getManagedHotelIds, REQUEST_STATUSES, sendGuestStatusEmail, translateText } from "@/lib/hotel";

export const dynamic = "force-dynamic";

/**
 * { status, reply? } — reply is a short note to the guest (shown in the guide, translated).
 * Guests who left an email get one mail per status change (taken / done / declined).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const status = body.status;
  if (!REQUEST_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const hotelIds = await getManagedHotelIds(session.user.id);
  const existing = await prisma.guestRequest.findFirst({
    where: { id, propertyId: { in: hotelIds } },
    include: { property: { select: { name: true, receptionEmail: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reply = cleanText(body.reply, 300);
  const updated = await prisma.guestRequest.update({
    where: { id },
    data: {
      status,
      ...(reply ? { staffReply: reply, staffReplyTranslated: await translateText(reply, existing.lang ?? "EN") } : {}),
    },
  });

  let emailed = false;
  if (updated.guestEmail && status !== "NEW" && updated.notifiedStatus !== status) {
    emailed = await sendGuestStatusEmail(updated, existing.property.name, existing.property.receptionEmail);
    if (emailed) await prisma.guestRequest.update({ where: { id }, data: { notifiedStatus: status } });
  }
  return NextResponse.json({ ok: true, emailed });
}
