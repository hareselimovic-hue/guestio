import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GuestView from "@/components/GuestView";
export const dynamic = "force-dynamic";

export default async function GuestPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      sections: {
        where: { isVisible: true },
        orderBy: { order: "asc" },
        include: { translations: true },
      },
    },
  });

  if (!property) notFound();

  // Handle preview (track at property level) or real guest link
  let guestLink = null;
  if (token === "preview") {
    await prisma.property.update({
      where: { id: property.id },
      data: { previewViewCount: { increment: 1 } },
    });
  } else {
    guestLink = await prisma.guestLink.findUnique({ where: { token } });
    if (!guestLink || guestLink.propertyId !== property.id) notFound();

    await Promise.all([
      prisma.guestLink.update({
        where: { id: guestLink.id },
        data: { viewCount: { increment: 1 } },
      }),
      prisma.guestLinkView.create({
        data: { guestLinkId: guestLink.id },
      }),
    ]);
  }

  // Hotel extras: active announcements + the hotel's services/menu/facilities
  const isHotel = property.kind === "HOTEL";

  // Hotel room link: sections the room has its own version of replace the hotel guide's
  if (isHotel && guestLink?.roomNumber) {
    const overrides = await prisma.roomSectionOverride.findMany({ where: { guestLinkId: guestLink.id } });
    for (const o of overrides) {
      const section = property.sections.find((s) => s.id === o.sectionId);
      if (!section) continue;
      const tr = (o.translations ?? {}) as Record<string, unknown>;
      section.content = o.content as typeof section.content;
      section.translations = Object.entries(tr).map(([language, content], i) => ({
        id: `${o.id}-${i}`, sectionId: section.id, language, content: content as typeof section.content, updatedAt: o.updatedAt,
      }));
    }
  }
  const [announcements, services] = isHotel
    ? await Promise.all([
        prisma.announcement.findMany({
          where: { propertyId: property.id, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          orderBy: { createdAt: "desc" },
          select: { id: true, message: true, translations: true },
        }),
        prisma.hotelService.findMany({
          where: { propertyId: property.id, active: true },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { id: true, kind: true, category: true, name: true, description: true, price: true, priceNote: true },
        }),
      ])
    : [[], []];

  return (
    <GuestView
      property={property}
      sections={property.sections}
      hotel={isHotel ? {
        roomNumber: guestLink?.roomNumber ?? null,
        reviewUrl: property.reviewUrl,
        announcements: announcements.map((a) => ({ ...a, translations: a.translations as Record<string, string> | null })),
        services,
      } : null}
      registrationEnabled={property.guestRegistrationEnabled}
      guestName={guestLink?.guestName ?? null}
      checkIn={guestLink?.checkIn?.toISOString() ?? null}
      checkOut={guestLink?.checkOut?.toISOString() ?? null}
      token={token}
    />
  );
}
