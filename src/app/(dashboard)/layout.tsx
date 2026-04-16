import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });

  if (!session) {
    redirect("/login");
  }

  // Check subscription (admin is exempt)
  if (session.user.email !== ADMIN_EMAIL) {
    const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
    const isExpired = !sub || sub.validUntil < new Date();
    const pathname = hdrs.get("x-invoke-path") ?? hdrs.get("x-pathname") ?? "";
    if (isExpired && !pathname.includes("/dashboard/subscription")) {
      redirect("/dashboard/subscription");
    }
  }

  return (
    <div className="flex h-screen bg-[#F7F7F5]">
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
