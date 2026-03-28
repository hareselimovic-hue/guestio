import { prisma } from "@/lib/prisma";

/**
 * Returns all workspace IDs the user has access to (owner + member).
 */
export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const [owned, memberships] = await Promise.all([
    prisma.workspace.findFirst({ where: { ownerId: userId }, select: { id: true } }),
    prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } }),
  ]);
  const ids = memberships.map((m) => m.workspaceId);
  if (owned) ids.push(owned.id);
  return [...new Set(ids)];
}

/**
 * Returns all userIds that share a workspace with this user (including themselves).
 */
export async function getWorkspaceMemberUserIds(userId: string): Promise<string[]> {
  // Find the workspace this user belongs to
  const workspace = await prisma.workspace.findFirst({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: { members: { select: { userId: true } } },
  });

  if (!workspace) return [userId];

  const memberIds = workspace.members.map((m) => m.userId);
  // Include the owner too
  const allIds = [...new Set([workspace.ownerId, ...memberIds])];
  return allIds;
}

/**
 * Returns the workspace the user belongs to (owned or member), or null.
 */
export async function getUserWorkspace(userId: string) {
  const owned = await prisma.workspace.findFirst({
    where: { ownerId: userId },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (owned) return { workspace: owned, isOwner: true };

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId },
    include: {
      workspace: {
        include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      },
    },
  });
  if (membership) return { workspace: membership.workspace, isOwner: false };

  return null;
}

/**
 * Prisma `where` clause for property access.
 * Includes: properties with workspaceId set, personal properties, AND
 * properties owned by any workspace member (covers cases where workspaceId wasn't set).
 */
export function propertyAccessWhere(userId: string, workspaceIds: string[], memberUserIds: string[] = []) {
  if (workspaceIds.length === 0) {
    return { userId };
  }

  const conditions: object[] = [
    { workspaceId: { in: workspaceIds } },
    { userId, workspaceId: null },
  ];

  // Also include properties owned by workspace members even if workspaceId isn't set
  if (memberUserIds.length > 0) {
    conditions.push({ userId: { in: memberUserIds } });
  }

  return { OR: conditions };
}
