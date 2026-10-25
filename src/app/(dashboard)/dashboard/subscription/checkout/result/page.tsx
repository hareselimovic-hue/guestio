import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default async function CheckoutResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { status } = await searchParams;
  // The redirect query param is not proof of payment — only the Bankart callback (stored in DB) is.
  const [subscription, latestPayment] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: session.user.id } }),
    prisma.payment.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  function fmtDate(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  const outcome =
    latestPayment?.status === "SUCCESS"
      ? "success"
      : latestPayment?.status === "PENDING" && status === "success"
        ? "processing"
        : status === "cancel"
          ? "cancel"
          : "error";

  const content = {
    success: {
      icon: <CheckCircle className="w-12 h-12 text-green-500" />,
      title: "Plaćanje uspješno",
      message: subscription
        ? `Vaša pretplata je produžena do ${fmtDate(subscription.validUntil)}.`
        : "Vaša pretplata je produžena.",
    },
    processing: {
      icon: <Clock className="w-12 h-12 text-[#0F2F61]" />,
      title: "Plaćanje se obrađuje",
      message: "Čekamo potvrdu banke. Osvježite stranicu za nekoliko sekundi.",
    },
    cancel: {
      icon: <Clock className="w-12 h-12 text-orange-400" />,
      title: "Plaćanje otkazano",
      message: "Niste dovršili plaćanje. Nikakav iznos nije naplaćen.",
    },
    error: {
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      title: "Plaćanje nije uspjelo",
      message: "Došlo je do greške prilikom plaćanja. Pokušajte ponovo ili nas kontaktirajte.",
    },
  }[outcome];

  return (
    <div className="p-6 md:p-10 max-w-md mx-auto text-center">
      <div className="bg-white rounded-2xl border border-[#EDEDE9] p-10 space-y-4">
        <div className="flex justify-center">{content.icon}</div>
        <h1 className="text-xl font-bold text-[#262626]">{content.title}</h1>
        <p className="text-sm text-[#6B6B6B]">{content.message}</p>
        <Link
          href="/dashboard/subscription"
          className="inline-flex items-center gap-2 bg-[#0F2F61] hover:bg-[#0a2347] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors mt-2"
        >
          Nazad na pretplatu
        </Link>
      </div>
    </div>
  );
}
