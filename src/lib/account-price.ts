import { prisma } from "@/lib/prisma";
import { calculateAccountPrice, type AccountPrice } from "@/lib/pricing";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";

/**
 * What this account pays per month right now: apartments by count, each hotel by its rooms
 * (= room links in the hotel panel). Ready-made (prospect) guides are never billed.
 */
export async function getAccountPrice(userId: string): Promise<AccountPrice> {
  const [wsIds, memberUserIds] = await Promise.all([getUserWorkspaceIds(userId), getWorkspaceMemberUserIds(userId)]);
  const where = { AND: [propertyAccessWhere(userId, wsIds, memberUserIds), { prospectToken: null }] };
  const [apartmentCount, hotels] = await Promise.all([
    prisma.property.count({ where: { AND: [where, { kind: { not: "HOTEL" } }] } }),
    prisma.property.findMany({
      where: { AND: [where, { kind: "HOTEL" }] },
      select: { _count: { select: { guests: { where: { roomNumber: { not: null } } } } } },
    }),
  ]);
  return calculateAccountPrice(apartmentCount, hotels.map((h) => h._count.guests));
}
