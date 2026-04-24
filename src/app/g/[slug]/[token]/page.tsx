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

  // Handle preview (no token needed for host)
  let guestLink = null;
  if (token !== "preview") {
    guestLink = await prisma.guestLink.findUnique({ where: { token } });
    if (!guestLink || guestLink.propertyId !== property.id) notFound();

    // Increment view count + record individual view event
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
