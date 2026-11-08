import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import SubscriptionExpiryPopup from "@/components/SubscriptionExpiryPopup";
import { getManagedHotelIds } from "@/lib/hotel";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);
  const [workspace, subscription, account, hotelIds, apartmentCount] = await Promise.all([
    prisma.workspace.findFirst({
      where: { ownerId: session.user.id },
      select: { name: true },
    }),
    session.user.email !== ADMIN_EMAIL
      ? prisma.subscription.findUnique({ where: { userId: session.user.id } })
      : null,
    prisma.user.findUnique({ where: { id: session.user.id }, select: { accountType: true } }),
    getManagedHotelIds(session.user.id),
    prisma.property.count({ where: { kind: "APARTMENT", ...propertyAccessWhere(session.user.id, wsIds, memberUserIds) } }),
  ]);
  // Hotel menu for hotel accounts and anyone managing a hotel property;
  // Apartments for anyone with apartments (and apartment accounts that have none yet)
  const showHotel = account?.accountType === "HOTEL" || hotelIds.length > 0;
  const showApartments = apartmentCount > 0 || !showHotel;

  const daysLeft = subscription
    ? Math.ceil((subscription.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="flex h-screen bg-[#F7F7F5]">
      <Sidebar user={session.user} workspaceName={workspace?.name ?? null} showHotel={showHotel} showApartments={showApartments} />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav user={session.user} showHotel={showHotel} showApartments={showApartments} />
      {daysLeft > 0 && daysLeft <= 5 && (
        <SubscriptionExpiryPopup daysLeft={daysLeft} />
      )}
    </div>
  );
}
