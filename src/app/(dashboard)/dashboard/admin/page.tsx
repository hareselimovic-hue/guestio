import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/AdminPanel";
import AdminBankTransfers from "@/components/AdminBankTransfers";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) redirect("/dashboard");

  const now = new Date();
  const [users, whitelist, subData, pendingTransfers, invoices] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, createdAt: true, emailVerified: true,
        _count: { select: { properties: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whitelistEmail.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, subscription: true },
    }),
    prisma.payment.findMany({
      where: { method: "BANK_TRANSFER", status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true, subscription: { select: { billingName: true } } } } },
    }),
    prisma.invoice.findMany({
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: { user: { select: { email: true } } },
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

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626]">Admin Panel</h1>
        <p className="text-[#6B6B6B] mt-1">Manage users and access control</p>
      </div>
      <div className="space-y-10 mb-10">
        <AdminBankTransfers
          transfers={pendingTransfers.map((p) => ({
            id: p.id,
            reference: p.merchantTransactionId,
            amount: p.amount,
            createdAt: p.createdAt.toISOString(),
            email: p.user.email,
            billingName: p.user.subscription?.billingName ?? null,
          }))}
          invoices={invoices.map((i) => ({
            id: i.id,
            number: i.number,
            amount: i.amount,
            method: i.method,
            issuedAt: i.issuedAt.toISOString(),
            billingName: i.billingName,
            email: i.user.email,
          }))}
        />
      </div>
      <AdminPanel users={users} whitelist={whitelist} subUsers={subUsers} />
    </div>
  );
}
