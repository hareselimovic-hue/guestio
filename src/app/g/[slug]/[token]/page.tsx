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

  return (
    <GuestView
      property={property}
      sections={property.sections}
      guestName={guestLink?.guestName ?? null}
      checkIn={guestLink?.checkIn?.toISOString() ?? null}
      checkOut={guestLink?.checkOut?.toISOString() ?? null}
    />
  );
}
