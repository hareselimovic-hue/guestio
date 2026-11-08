import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedHotelIds } from "@/lib/hotel";
import { getRegistrationRecipients } from "@/lib/guest-registration";

export const dynamic = "force-dynamic";

/** Hotels the user manages + where their guest requests currently go (for Settings) */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ids = await getManagedHotelIds(session.user.id);
  const hotels = await prisma.property.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, receptionEmail: true, workspaceId: true, userId: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(await Promise.all(hotels.map(async (h) => ({
    id: h.id,
    name: h.name,
    receptionEmail: h.receptionEmail,
    // shown as the fallback when no reception email is set
    defaultRecipients: await getRegistrationRecipients(h),
  }))));
}
