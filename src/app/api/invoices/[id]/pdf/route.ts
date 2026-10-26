import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderInvoicePdf } from "@/lib/billing";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "hareselimovic@gmail.com";

// Invoice PDF download — the invoice owner or the admin
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { userId: true } });
  if (!invoice || (invoice.userId !== session.user.id && session.user.email !== ADMIN_EMAIL)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { inv, pdf } = await renderInvoicePdf(id);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Faktura-${inv.number}.pdf"`,
    },
  });
}
