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
 * Prisma `where` clause for property access (owned personally or via workspace).
 */
export function propertyAccessWhere(userId: string, workspaceIds: string[]) {
  if (workspaceIds.length === 0) {
    return { userId };
  }
  return {
    OR: [
      { workspaceId: { in: workspaceIds } },
      { userId, workspaceId: null },
    ],
  };
}
