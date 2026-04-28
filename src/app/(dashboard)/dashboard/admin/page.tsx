import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/AdminPanel";

const ADMIN_EMAIL = "hareselimovic@gmail.com";
const SRM_WORKSPACE_ID = "cmnah6u670001l204fx2pgn19";
const INTERNAL_EMAILS = [ADMIN_EMAIL, "info@sarajevopropertymanagement.ba", "info@smartstay.ba"];

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) redirect("/dashboard");

  const now = new Date();
  const [users, whitelist, subData, externalUsers] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whitelistEmail.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, subscription: true },
    }),
    prisma.user.findMany({
      where: {
        email: { notIn: INTERNAL_EMAILS },
        workspaceMember: { none: { workspaceId: SRM_WORKSPACE_ID } },
      },
      select: {
        id: true, name: true, email: true, createdAt: true,
        _count: { select: { properties: true } },
        subscription: { select: { validUntil: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const subUsers = subData.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    subscription: u.subscription
      ? {
          id: u.subscription.id,
          validUntil: u.subscription.validUntil.toISOString(),
          daysLeft: Math.ceil((u.subscription.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        }
      : null,
  }));

  const externalClients = externalUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    propertyCount: u._count.properties,
    daysLeft: u.subscription
      ? Math.ceil((u.subscription.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626]">Admin Panel</h1>
        <p className="text-[#6B6B6B] mt-1">Manage users and access control</p>
      </div>
      <AdminPanel users={users} whitelist={whitelist} subUsers={subUsers} externalClients={externalClients} />
    </div>
  );
}
