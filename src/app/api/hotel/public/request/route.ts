import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanText, EMAIL_RE, GUEST_LANGS, notifyHotelStaff, REQUEST_LABEL, REQUEST_TYPES, resolveHotelGuest } from "@/lib/hotel";

export const dynamic = "force-dynamic";

/**
 * Public: a guest sends a request from the hotel guide (reception request, room-service order,
 * extra service or facility booking). Prices/names of ordered items come from the hotel's own
 * catalogue, never from the client.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || body.website) return NextResponse.json({ ok: true }); // honeypot

  const ctx = await resolveHotelGuest(body.slug, body.token);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { property, guestLink } = ctx;

  const type = REQUEST_TYPES.includes(body.type) ? (body.type as string) : null;
  if (!type) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Only room links (QR in the room) can send requests — the general hotel link is public
  // (Booking messages, websites) and read-only, so nobody can order for a room they're not in
  const roomNumber = guestLink?.roomNumber;
  if (!roomNumber) return NextResponse.json({ error: "Scan the QR code in your room to send requests." }, { status: 403 });

  let items: { name: string; qty: number; price: number | null }[] | null = null;
  if (type === "ORDER" || type === "BOOKING") {
    const wanted = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    const ids = wanted.map((i: { id?: unknown }) => i?.id).filter((x: unknown): x is string => typeof x === "string");
    const catalogue = await prisma.hotelService.findMany({ where: { id: { in: ids }, propertyId: property.id, active: true } });
    items = wanted
      .map((i: { id?: string; qty?: unknown }) => {
        const s = catalogue.find((c) => c.id === i.id);
        const qty = Math.min(Math.max(Math.floor(Number(i.qty) || 1), 1), 20);
        return s ? { name: s.name, qty, price: s.price } : null;
      })
      .filter(Boolean) as { name: string; qty: number; price: number | null }[];
    if (items.length === 0) return NextResponse.json({ error: "Nothing selected" }, { status: 400 });
  }

  const guests = Number(body.guests);
  // Optional — only used to email the guest status updates on this request
  const email = typeof body.guestEmail === "string" ? body.guestEmail.trim().toLowerCase().slice(0, 200) : "";
  const request = await prisma.guestRequest.create({
    data: {
      propertyId: property.id,
      guestLinkId: guestLink?.id ?? null,
      roomNumber,
      type,
      items: items ?? undefined,
      note: cleanText(body.note, 500),
      scheduledFor: cleanText(body.scheduledFor, 60),
      guests: Number.isFinite(guests) && guests > 0 ? Math.min(Math.floor(guests), 50) : null,
      lang: GUEST_LANGS.includes(body.lang) ? body.lang : null,
      guestEmail: EMAIL_RE.test(email) ? email : null,
    },
  });

  const total = items?.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0) ?? 0;
  const rows: [string, string][] = [
    ["Soba", roomNumber],
    ["Zahtjev", REQUEST_LABEL[type] ?? type],
    ...(items ? [["Stavke", items.map((i) => `${i.qty} × ${i.name}`).join("\n")] as [string, string]] : []),
    ...(total > 0 ? [["Ukupno", `${total.toFixed(2).replace(".", ",")} €`] as [string, string]] : []),
    ...(request.scheduledFor ? [["Termin", request.scheduledFor] as [string, string]] : []),
    ...(request.guests ? [["Osoba", String(request.guests)] as [string, string]] : []),
    ...(request.note ? [["Napomena", request.note] as [string, string]] : []),
    ...(request.guestEmail ? [["Gost prati status", "Da — dobija mail kad preuzmete / završite"] as [string, string]] : []),
  ];
  await notifyHotelStaff(property, `Soba ${roomNumber}: ${REQUEST_LABEL[type] ?? type}`, rows, "/dashboard/hotel");

  // The guide keeps the id on the device to show the guest this request's status
  return NextResponse.json({ ok: true, id: request.id });
}
