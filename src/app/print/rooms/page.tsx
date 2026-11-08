import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedProperty } from "@/lib/hotel";
import RoomQrSheet from "./RoomQrSheet";

export const dynamic = "force-dynamic";

// Printable A4 sheet with one QR card per room (outside the dashboard layout so it prints clean)
export default async function PrintRoomsPage({ searchParams }: { searchParams: Promise<{ property?: string; room?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { property: propertyId, room } = await searchParams;
  const property = propertyId ? await getManagedProperty(session.user.id, propertyId) : null;
  if (!property) notFound();

  // ?room= prints a single card, otherwise every room
  const rooms = await prisma.guestLink.findMany({
    where: { propertyId: property.id, roomNumber: { not: null }, ...(room ? { id: room } : {}) },
    select: { id: true, token: true, roomNumber: true },
  });
  rooms.sort((a, b) => a.roomNumber!.localeCompare(b.roomNumber!, undefined, { numeric: true }));

  return (
    <RoomQrSheet
      hotelName={property.name}
      rooms={rooms.map((r) => ({ id: r.id, roomNumber: r.roomNumber!, path: `/g/${property.slug}/${r.token}` }))}
    />
  );
}
