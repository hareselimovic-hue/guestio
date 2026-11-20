import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/features";
import { sendToVisitor } from "@/lib/guide-request";

export const dynamic = "force-dynamic";

/** Admin: "Odobri i pošalji" → the visitor gets the guide email. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await sendToVisitor(id);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
