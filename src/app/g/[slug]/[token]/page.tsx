import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { prospectClaimPath } from "@/lib/prospect";
import GuestView from "@/components/GuestView";
import ProspectTracker from "@/components/ProspectTracker";
export const dynamic = "force-dynamic";

/** Link preview (WhatsApp, Booking/Airbnb inbox, iMessage): the property's name and photo instead of the generic app title */
export async function generateMetadata({ params }: { params: Promise<{ slug: string; token?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug },
    select: { name: true, coverImage: true, kind: true, prospectToken: true, sections: { where: { type: "WELCOME" }, select: { content: true }, take: 1 } },
  });
  if (!property) return { title: "SmartStay" };
  // Ready-made outreach guide: private until claimed
  if (property.prospectToken) return { title: `${property.name} · SmartStay`, robots: { index: false, follow: false } };
  const welcome = (property.sections[0]?.content ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof welcome[k] === "string" && (welcome[k] as string).trim() ? (welcome[k] as string).trim() : "");
  const image = property.coverImage || str("heroImage") || undefined;
  const title = `${property.name} · ${property.kind === "HOTEL" ? "Hotel guide" : "Guest guide"}`;
  const description = str("welcomeSubtitle") || str("subtitle") || str("welcomeText") ||
    "Wi-Fi, check-in, house rules, directions and local tips — everything for your stay in one link.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "SmartStay", ...(image ? { images: [{ url: image }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, ...(image ? { images: [image] } : {}) },
  };
}

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

  // Ready-made outreach guide: only its secret link works (not /g/<slug> or /preview), until claimed.
  // Its room links (unguessable tokens, opened from the hotel editor) work too — they 404'd before.
  const isProspect = !!property.prospectToken;
  let guestLink = null;
  let isProspectLink = false;
  if (isProspect) {
    const expired = property.prospectExpiresAt && property.prospectExpiresAt < new Date();
    if (expired) notFound();
    isProspectLink =
      token.length === property.prospectToken!.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(property.prospectToken!));
    if (!isProspectLink) {
      guestLink = await prisma.guestLink.findUnique({ where: { token } });
      if (!guestLink || guestLink.propertyId !== property.id || !guestLink.roomNumber) notFound();
    }
  }

  // Handle preview (track at property level) or real guest link
  if (isProspectLink) {
    await prisma.property.update({
      where: { id: property.id },
      data: { prospectViews: { increment: 1 }, prospectLastViewAt: new Date() },
    });
  } else if (isProspect) {
    // room link of an unclaimed guide — owner preview, not counted as a guest view
  } else if (token === "preview") {
    await Promise.all([
      prisma.property.update({
        where: { id: property.id },
        data: { previewViewCount: { increment: 1 } },
      }),
      // dated record for the 30-day Analytics (the counter above has no date)
      prisma.propertyView.create({ data: { propertyId: property.id } }),
    ]);
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

  const view = (
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
      token={isProspectLink ? "preview" : token}
    />
  );
  if (!isProspect) return view;

  const prospectToken = property.prospectToken!;
  return (
    <>
      {isProspectLink && <ProspectTracker token={prospectToken} />}
      <div className="bg-navy text-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm leading-snug flex-1">
            <strong>Ovaj vodič smo pripremili za vas.</strong> Trenutno je vidljiv samo vama. Ako vam se sviđa,
            preuzmite ga, doradite i nastavite koristiti, prvih 30 dana besplatno.
          </p>
          <Link
            href={prospectClaimPath(prospectToken)}
            className="shrink-0 text-center bg-orange hover:bg-orange-dark text-white text-sm font-semibold rounded-lg px-4 py-2.5"
          >
            Preuzmi vodič →
          </Link>
        </div>
      </div>
      {view}
    </>
  );
}
