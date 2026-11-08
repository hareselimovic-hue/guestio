import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Hotel } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedHotelIds, userCanUseHotels } from "@/lib/hotel";
import HotelDashboard from "@/components/HotelDashboard";

export const dynamic = "force-dynamic";

export default async function HotelPage({ searchParams }: { searchParams: Promise<{ property?: string; tab?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const ids = await getManagedHotelIds(session.user.id);
  const hotels = await prisma.property.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, slug: true, reviewUrl: true, receptionEmail: true, guestRegistrationEnabled: true },
    orderBy: { createdAt: "asc" },
  });
  const { property, tab } = await searchParams;

  if (hotels.length === 0) {
    if (!(await userCanUseHotels(session.user))) redirect("/dashboard");
    return (
      <div className="p-4 sm:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-[#262626] mb-2">Hotel</h1>
        <div className="bg-white border border-[#EDEDE9] rounded-2xl p-6 text-center">
          <Hotel className="w-10 h-10 text-[#0F2F61] mx-auto mb-3" />
          <p className="font-semibold text-[#262626]">You don&apos;t have a hotel yet</p>
          <p className="text-sm text-[#6B6B6B] mt-1">
            Create your hotel to get the hotel guide, room QR codes, reception requests, room service, extras,
            announcements and guest feedback.
          </p>
          <Link href="/dashboard/properties/new?kind=hotel" className="inline-block mt-4 text-sm font-semibold text-white bg-[#0F2F61] px-4 py-2 rounded-lg">
            Create your hotel
          </Link>
        </div>
      </div>
    );
  }

  const current = hotels.find((h) => h.id === property) ?? hotels[0];
  return <HotelDashboard hotels={hotels} current={current} initialTab={tab === "review" ? "settings" : tab ?? "requests"} />;
}
