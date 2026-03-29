import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { Building2 } from "lucide-react";
import PropertiesList from "@/components/PropertiesList";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session!.user.id),
    getWorkspaceMemberUserIds(session!.user.id),
  ]);
  const accessWhere = propertyAccessWhere(session!.user.id, wsIds, memberUserIds);

  const properties = await prisma.property.findMany({
    where: accessWhere,
    include: { _count: { select: { guests: true, sections: true } } },
    orderBy: { createdAt: "desc" },
  });

  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626]">
          Welcome, {firstName} 👋
        </h1>
        <p className="text-[#6B6B6B] mt-1">
          Manage your properties and guests
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#EDEDE9] w-fit min-w-[160px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-[#0F2F61]/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0F2F61]" />
            </div>
            <span className="text-sm text-[#6B6B6B] font-medium">Properties</span>
          </div>
          <p className="text-3xl font-bold text-[#262626]">{properties.length}</p>
        </div>
      </div>

      {/* Properties list with search */}
      <PropertiesList properties={properties} />
    </div>
  );
}
