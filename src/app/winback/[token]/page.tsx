import { redirect } from "next/navigation";
import Link from "next/link";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { Gift, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const GIFT_DAYS = 30;
const OFFER_VALID_DAYS = 14;

type State = "offer" | "done" | "invalid" | "expired" | "used" | "active";

async function loadState(token: string): Promise<{ state: State; validUntil?: Date }> {
  const sub = await prisma.subscription.findFirst({
    where: { winbackToken: token },
    select: { validUntil: true, winbackOfferSentAt: true, winbackAcceptedAt: true },
  });
  if (!sub?.winbackOfferSentAt) return { state: "invalid" };
  if (sub.winbackAcceptedAt) return { state: "used", validUntil: sub.validUntil };
  if (Date.now() - sub.winbackOfferSentAt.getTime() > OFFER_VALID_DAYS * 86_400_000) return { state: "expired" };
  if (sub.validUntil > new Date()) return { state: "active", validUntil: sub.validUntil };
  return { state: "offer" };
}

// Accepting needs an explicit click (POST) — email link scanners only GET this page.
async function accept(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const { state } = await loadState(token);
  if (state !== "offer") redirect(`/winback/${encodeURIComponent(token)}`);

  const now = new Date();
  const validUntil = new Date(now.getTime() + GIFT_DAYS * 86_400_000);
  const res = await prisma.subscription.updateMany({
    where: { winbackToken: token, winbackAcceptedAt: null, validUntil: { lt: now } },
    data: { winbackAcceptedAt: now, validUntil },
  });

  if (res.count > 0) {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { winbackToken: token },
        select: { user: { select: { email: true, name: true } } },
      });
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@smartstay.ba",
        to: "info@smartstay.ba",
        subject: `Win-back prihvaćen: ${sub?.user.email} (+${GIFT_DAYS} dana)`,
        html: `<p>${sub?.user.name ?? ""} (${sub?.user.email}) je prihvatio/la ponudu od ${GIFT_DAYS} dana besplatno.</p>
<p>Pretplata važi do ${fmt(validUntil)}</p>`,
      });
    } catch (err) {
      console.error("[winback] admin notice failed:", err);
    }
  }
  redirect(`/winback/${encodeURIComponent(token)}?done=1`);
}

// DD.MM.YYYY. in Sarajevo time
const fmt = (d: Date) => {
  const [y, m, day] = d.toLocaleDateString("en-CA", { timeZone: "Europe/Sarajevo" }).split("-");
  return `${day}.${m}.${y}.`;
};

export default async function WinbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;
  const loaded = await loadState(token);
  const state: State = done && loaded.state === "used" ? "done" : loaded.state;

  const content: Record<State, { icon: React.ReactNode; title: string; body: string }> = {
    offer: {
      icon: <Gift className="w-12 h-12 text-[#FF6700]" />,
      title: "Još 30 dana besplatno",
      body: "Kliknite ispod i vaš SmartStay nalog se odmah ponovo aktivira na 30 dana — bez kartice i bez obaveze.",
    },
    done: {
      icon: <CheckCircle2 className="w-12 h-12 text-green-600" />,
      title: "Nalog je ponovo aktivan!",
      body: `Vaša pretplata važi do ${loaded.validUntil ? fmt(loaded.validUntil) : ""} Dobrodošli nazad.`,
    },
    used: {
      icon: <CheckCircle2 className="w-12 h-12 text-green-600" />,
      title: "Ponuda je već iskorištena",
      body: "Ovaj poklon ste već aktivirali. Pretplatu možete produžiti u aplikaciji.",
    },
    active: {
      icon: <CheckCircle2 className="w-12 h-12 text-green-600" />,
      title: "Vaša pretplata je već aktivna",
      body: `Pretplata važi do ${loaded.validUntil ? fmt(loaded.validUntil) : ""}, pa poklon trenutno nije potreban.`,
    },
    expired: {
      icon: <XCircle className="w-12 h-12 text-[#BABAB5]" />,
      title: "Ponuda je istekla",
      body: "Ova ponuda je važila 14 dana. Pretplatu možete produžiti u aplikaciji ili nam pišite na info@smartstay.ba.",
    },
    invalid: {
      icon: <XCircle className="w-12 h-12 text-[#BABAB5]" />,
      title: "Link nije važeći",
      body: "Provjerite da ste otvorili cijeli link iz emaila ili nam pišite na info@smartstay.ba.",
    },
  };
  const c = content[state];

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#EDEDE9] shadow-sm p-8 text-center">
        <p className="text-xl font-extrabold text-[#0F2F61] mb-6">Smart<span className="text-[#FF6700]">Stay</span></p>
        <div className="flex justify-center mb-4">{c.icon}</div>
        <h1 className="text-2xl font-bold text-[#262626] mb-2">{c.title}</h1>
        <p className="text-sm text-[#6B6B6B] leading-relaxed mb-6">{c.body}</p>

        {state === "offer" ? (
          <form action={accept}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              Aktiviraj 30 dana besplatno
            </button>
          </form>
        ) : (
          <Link
            href="/dashboard"
            className="inline-block w-full bg-[#0F2F61] hover:bg-[#0a2347] text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            Otvori SmartStay
          </Link>
        )}
      </div>
    </div>
  );
}
