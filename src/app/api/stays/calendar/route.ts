import { NextRequest, NextResponse } from "next/server";
import { getStay } from "@/lib/stays";
import { fetchCalendar } from "@/lib/rentlio-stays";
import { sarajevoToday } from "@/lib/stays-calc";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const stay = getStay(req.nextUrl.searchParams.get("slug") ?? "");
  if (!stay) return NextResponse.json({ error: "Unknown apartment" }, { status: 404 });
  try {
    const today = sarajevoToday();
    const cal = await fetchCalendar(stay.rentlioUnitTypeId, today);
    return NextResponse.json({ today, currency: stay.currency, days: Object.values(cal) });
  } catch (e) {
    console.error("stays calendar", e);
    return NextResponse.json({ error: "Availability is temporarily unavailable." }, { status: 502 });
  }
}
