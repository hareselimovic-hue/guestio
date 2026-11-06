import { NextRequest, NextResponse } from "next/server";
import { getStay, promoPercent } from "@/lib/stays";
import { fetchCalendar } from "@/lib/rentlio-stays";
import { applyDiscount, quoteStay, sarajevoToday } from "@/lib/stays-calc";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Server je izvor istine za cijenu: ponovo čita Rentlio i računa ukupno + popust.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const stay = getStay(String(body.slug ?? ""));
  const { checkIn, checkOut } = body as { checkIn?: string; checkOut?: string };
  if (!stay || !checkIn || !checkOut || !DATE.test(checkIn) || !DATE.test(checkOut)) {
    return NextResponse.json({ ok: false, reason: "Invalid request." }, { status: 400 });
  }
  const today = sarajevoToday();
  if (checkIn < today) return NextResponse.json({ ok: false, reason: "Check-in date is in the past." });
  try {
    const cal = await fetchCalendar(stay.rentlioUnitTypeId, today);
    const q = quoteStay(cal, checkIn, checkOut);
    if (!q.ok) return NextResponse.json(q);
    const percent = promoPercent(body.promo);
    const { discount, total } = applyDiscount(q.subtotal, percent);
    return NextResponse.json({
      ok: true,
      currency: stay.currency,
      nights: q.nights,
      subtotal: q.subtotal,
      promoPercent: percent,
      promoRejected: Boolean(body.promo) && percent === 0,
      discount,
      total,
    });
  } catch (e) {
    console.error("stays quote", e);
    return NextResponse.json({ ok: false, reason: "Could not check availability. Please try again." }, { status: 502 });
  }
}
