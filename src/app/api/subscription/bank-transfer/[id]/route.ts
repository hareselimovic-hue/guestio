import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderInstructionsPdf, sendInstructionsEmail } from "@/lib/billing";

export const dynamic = "force-dynamic";

async function ownPayment(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return prisma.payment.findFirst({ where: { id, userId: session.user.id, method: "BANK_TRANSFER" } });
}

// GET → payment instructions PDF (download)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ownPayment(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { payment, pdf } = await renderInstructionsPdf(id);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Uputstvo-za-uplatu-${payment.merchantTransactionId}.pdf"`,
    },
  });
}

// POST → email the instructions PDF to the account email
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await ownPayment(id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await sendInstructionsEmail(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[bank-transfer] instructions email failed:", err);
    return NextResponse.json({ error: "Slanje emaila nije uspjelo. Pokušajte ponovo." }, { status: 502 });
  }
}
