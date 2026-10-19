import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

/**
 * DELETE /api/admin/users?id=<userId>[&dryRun=1]
 * For workspace members, their properties, tasks and comments move to the workspace owner so the
 * team keeps them; users without a workspace lose their properties. The email is removed from the whitelist.
 * dryRun returns what would happen without changing anything.
 */
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true,
      ownedWorkspace: { select: { name: true } },
      workspaceMember: { select: { workspace: { select: { id: true, ownerId: true } } } },
    },
  });
  if (!user) return NextResponse.json({ error: "Korisnik ne postoji." }, { status: 404 });
  if (user.email === ADMIN_EMAIL) {
    return NextResponse.json({ error: "Admin nalog se ne može obrisati." }, { status: 400 });
  }
  if (user.ownedWorkspace) {
    return NextResponse.json(
      { error: `Korisnik je vlasnik workspacea "${user.ownedWorkspace.name}" i ne može se obrisati.` },
      { status: 400 },
    );
  }

  // A user can only be in one workspace (see getUserWorkspace)
  const workspace = user.workspaceMember[0]?.workspace ?? null;
  // Team members' properties are visible to the team even without workspaceId (propertyAccessWhere),
  // so for workspace members all of them are kept; only users without a workspace lose their properties.
  const propertyCount = await prisma.property.count({ where: { userId: id } });
  const workspaceProperties = workspace ? propertyCount : 0;
  const personalProperties = workspace ? 0 : propertyCount;

  if (dryRun) {
    return NextResponse.json({ workspaceProperties, personalProperties, hasWorkspace: !!workspace });
  }

  await prisma.$transaction(async (tx) => {
    if (workspace) {
      await tx.property.updateMany({ where: { userId: id }, data: { userId: workspace.ownerId, workspaceId: workspace.id } });
      await tx.task.updateMany({ where: { authorId: id }, data: { authorId: workspace.ownerId } });
      await tx.taskComment.updateMany({ where: { authorId: id }, data: { authorId: workspace.ownerId } });
    }
    await tx.whitelistEmail.deleteMany({ where: { email: { equals: user.email, mode: "insensitive" } } });
    // Cascades: sessions, accounts, personal properties, memberships, subscription, payments
    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true, workspaceProperties, personalProperties });
}
