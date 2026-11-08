import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import PropertiesList from "@/components/PropertiesList";

export const dynamic = "force-dynamic";

// The apartment list (was the dashboard home before the overview dashboard)
export default async function ApartmentsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session!.user.id),
    getWorkspaceMemberUserIds(session!.user.id),
  ]);

  const properties = await prisma.property.findMany({
    where: { kind: "APARTMENT", ...propertyAccessWhere(session!.user.id, wsIds, memberUserIds) },
    include: { _count: { select: { guests: true, sections: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#262626]">Apartments</h1>
        <p className="text-[#6B6B6B] mt-1">{properties.length} {properties.length === 1 ? "apartment" : "apartments"}</p>
      </div>
      <PropertiesList properties={properties} />
    </div>
  );
}
