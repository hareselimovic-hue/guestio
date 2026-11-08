import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userCanUseHotels } from "@/lib/hotel";

export const dynamic = "force-dynamic";

// Account type chosen at signup (apartment / hotel) — sets the default kind of new properties
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { accountType } = await req.json();
  if (accountType !== "APARTMENT" && accountType !== "HOTEL") {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }
  if (accountType === "HOTEL" && !(await userCanUseHotels(session.user))) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { accountType } });
  return NextResponse.json({ ok: true });
}
