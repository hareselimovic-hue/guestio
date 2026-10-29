import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import SubscriptionCheckoutCard from "@/components/SubscriptionCheckoutCard";
import { calculateMonthlyPrice } from "@/lib/pricing";
import { addDays, BANK_TRANSFER_GRACE_DAYS, bankTransferPeriod, shortPeriod } from "@/lib/billing";
import { ISSUER } from "@/lib/billing-pdf";
import { FileText, Download } from "lucide-react";

const ADMIN_EMAIL = "hareselimovic@gmail.com";
const RENEWAL_WINDOW_DAYS = 5;

export default async function SubscriptionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  // If subscription doesn't exist yet (race condition on register), create it now
  let sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const validUntil = new Date(user?.createdAt ?? new Date());
    validUntil.setDate(validUntil.getDate() + 30);
    sub = await prisma.subscription.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id, validUntil },
    });
  }

  const now = new Date();
  const isActive = sub && sub.validUntil >= now;
  const daysLeft = sub
    ? Math.ceil((sub.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session.user.id),
    getWorkspaceMemberUserIds(session.user.id),
  ]);
  const [propertyCount, pendingTransfer, invoices] = await Promise.all([
    prisma.property.count({ where: propertyAccessWhere(session.user.id, wsIds, memberUserIds) }),
    prisma.payment.findFirst({
      // Payments with a pre-issued invoice (billed in arrears) aren't renewal requests
      where: { userId: session.user.id, method: "BANK_TRANSFER", status: "PENDING", invoice: { is: null } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { userId: session.user.id },
      orderBy: { issuedAt: "desc" },
      take: 24,
      include: { payment: { select: { status: true } } },
    }),
  ]);

  // Admin doesn't pay; others see the payment options 5 days before expiry, after expiry,
  // or while a bank transfer is open — otherwise a one-line note with "Plati unaprijed"
  const isAdmin = session.user.email === ADMIN_EMAIL;
  const renewalDue = !isActive || daysLeft <= RENEWAL_WINDOW_DAYS || !!pendingTransfer;

  const initialPending = pendingTransfer
    ? {
        id: pendingTransfer.id,
        period: (({ from, to }) => shortPeriod(from, to))(bankTransferPeriod(pendingTransfer)),
        reference: pendingTransfer.merchantTransactionId,
        amount: pendingTransfer.amount,
        tierName: calculateMonthlyPrice(pendingTransfer.propertyCount).tierName,
        dueDate: addDays(pendingTransfer.createdAt, BANK_TRANSFER_GRACE_DAYS).toISOString(),
        recipient: ISSUER.name,
        account: ISSUER.racun,
        bank: ISSUER.banka,
      }
    : null;

  function fmtDate(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="w-6 h-6 text-[#FF6700]" />
        <h1 className="text-2xl font-bold text-[#262626]">Subscription</h1>
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
              {isActive ? "Active" : "Expired"}
            </p>
          </div>
        </div>

        <div className="border-t border-[#F0F0F0]" />

        {/* Valid until */}
        {sub ? (
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#6B6B6B] shrink-0" />
            <div>
              <p className="text-sm text-[#6B6B6B] font-medium">Valid until</p>
              <p className="text-[#262626] font-semibold">{fmtDate(sub.validUntil)}</p>
            </div>
          </div>
        ) : null}

        {/* Days remaining */}
        {sub && isActive && (
          <div className={`rounded-xl px-5 py-4 ${daysLeft <= 7 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
            <p className={`text-sm font-semibold ${daysLeft <= 7 ? "text-orange-700" : "text-green-700"}`}>
              {daysLeft <= 7
                ? `⚠️ Only ${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining`
                : `${daysLeft} days remaining`}
            </p>
          </div>
        )}

        {/* Expired notice */}
        {!isActive && (
          <div className="rounded-xl px-5 py-4 bg-red-50 border border-red-200">
            <p className="text-sm font-semibold text-red-700 mb-1">Your subscription has expired</p>
            <p className="text-sm text-red-600">
              Obnovite pretplatu karticom ili virmanom ispod.
            </p>
          </div>
        )}

        <div className="border-t border-[#F0F0F0]" />

        {/* CTA */}
        <div>
          <p className="text-sm text-[#6B6B6B] mb-3">
            Ili nas kontaktirajte direktno:
          </p>
          <a
            href="mailto:info@smartstay.ba?subject=SmartStay subscription renewal"
            className="inline-flex items-center gap-2 text-[#6B6B6B] hover:text-[#262626] font-medium text-sm underline"
          >
            info@smartstay.ba
          </a>
        </div>
      </div>

      {!isAdmin && (
      <div className="mt-6">
        <SubscriptionCheckoutCard
          collapsedUntil={renewalDue ? undefined : sub.validUntil.toISOString()}
          propertyCount={propertyCount}
          billing={{
            billingName: sub.billingName,
            billingAddress: sub.billingAddress,
            billingCity: sub.billingCity,
            billingPostcode: sub.billingPostcode,
            billingIdBroj: sub.billingIdBroj,
          }}
          initialPending={initialPending}
        />
      </div>
      )}

      {invoices.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-[#EDEDE9] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#0F2F61]" />
            <h2 className="font-bold text-[#262626]">Fakture</h2>
          </div>
          <ul className="divide-y divide-[#F0F0EE]">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#262626]">{inv.number}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    {inv.issuedAt.toLocaleDateString("bs-BA")} · {inv.amount.toFixed(2)} KM · {inv.payment.status === "SUCCESS" ? (inv.method === "CARD" ? "kartica" : "virman") : "čeka uplatu"}
                  </p>
                </div>
                <a
                  href={`/api/invoices/${inv.id}/pdf`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F2F61] hover:underline"
                >
                  <Download className="w-4 h-4" /> PDF
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
