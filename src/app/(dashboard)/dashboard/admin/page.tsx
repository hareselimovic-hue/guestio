import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/AdminPanel";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) redirect("/dashboard");

  const [users, whitelist] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whitelistEmail.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626]">Admin Panel</h1>
        <p className="text-[#6B6B6B] mt-1">Manage users and access control</p>
      </div>
      <AdminPanel users={users} whitelist={whitelist} />
    </div>
  );
}
