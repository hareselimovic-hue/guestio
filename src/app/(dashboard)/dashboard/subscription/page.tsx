import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";

export default async function SubscriptionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });

  const now = new Date();
  const isActive = sub && sub.validUntil >= now;
  const daysLeft = sub
    ? Math.ceil((sub.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  function fmtDate(d: Date) {
    return d.toLocaleDateString("bs-BA", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="w-6 h-6 text-[#FF6700]" />
        <h1 className="text-2xl font-bold text-[#262626]">Pretplata</h1>
      </div>

      <div className="bg-white rounded-2xl border border-[#EDEDE9] p-8 space-y-6">

        {/* Status */}
        <div className="flex items-center gap-3">
          {isActive ? (
            <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500 shrink-0" />
          )}
          <div>
            <p className="text-sm text-[#6B6B6B] font-medium uppercase tracking-wide">Status</p>
            <p className={`text-lg font-bold ${isActive ? "text-green-600" : "text-red-500"}`}>
              {isActive ? "Aktivna" : "Istekla"}
            </p>
          </div>
        </div>

        <div className="border-t border-[#F0F0F0]" />

        {/* Valid until */}
        {sub ? (
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#6B6B6B] shrink-0" />
            <div>
              <p className="text-sm text-[#6B6B6B] font-medium">Važi do</p>
              <p className="text-[#262626] font-semibold">{fmtDate(sub.validUntil)}</p>
            </div>
          </div>
        ) : null}

        {/* Days remaining */}
        {sub && isActive && (
          <div className={`rounded-xl px-5 py-4 ${daysLeft <= 7 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
            <p className={`text-sm font-semibold ${daysLeft <= 7 ? "text-orange-700" : "text-green-700"}`}>
              {daysLeft <= 7
                ? `⚠️ Preostalo samo ${daysLeft} ${daysLeft === 1 ? "dan" : "dana"}`
                : `Preostalo: ${daysLeft} dana`}
            </p>
          </div>
        )}

        {/* Expired notice */}
        {!isActive && (
          <div className="rounded-xl px-5 py-4 bg-red-50 border border-red-200">
            <p className="text-sm font-semibold text-red-700 mb-1">Vaša pretplata je istekla</p>
            <p className="text-sm text-red-600">
              Da biste nastavili koristiti SmartStay, kontaktirajte nas za obnovu pretplate.
            </p>
          </div>
        )}

        <div className="border-t border-[#F0F0F0]" />

        {/* CTA */}
        <div>
          <p className="text-sm text-[#6B6B6B] mb-3">
            Za produženje pretplate ili promjenu plana, kontaktirajte nas:
          </p>
          <a
            href="mailto:info@smartstay.ba?subject=Obnova pretplate SmartStay"
            className="inline-flex items-center gap-2 bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Kontaktirajte nas →
          </a>
        </div>
      </div>
    </div>
  );
}
