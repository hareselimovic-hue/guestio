import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import GuideWizard from "@/components/onboarding/GuideWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SmartStay · Napravite vodič",
  description: "Digitalni vodič za goste iz vašeg Airbnb ili Booking oglasa za par minuta.",
};

/**
 * Public self-serve wizard (from smartstay.ba): listing link → account → review → WiFi → places → guide.
 * Query: ?link= (start reading right away) · ?email= (prefill) · ?lang=en · ?req= (resume after signing in)
 */
export default async function StartPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const lang = q.lang === "en" ? "en" : "bs";
  const clean = (v?: string) => (v ?? "").slice(0, 1000);

  return (
    <div className="min-h-screen bg-canvas-3">
      <header className="mx-auto flex max-w-lg items-center justify-between px-5 pt-6">
        <a href="https://smartstay.ba" className="rounded-lg bg-navy px-3 py-1.5 text-lg font-bold tracking-tight text-white">SmartStay</a>
        <a href={`/start?lang=${lang === "en" ? "bs" : "en"}`} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink-2 hover:text-ink">
          {lang === "en" ? "BS" : "EN"}
        </a>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16 pt-5">
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <GuideWizard
            mode="start"
            lang={lang}
            sessionEmail={session?.user.email ?? null}
            initialLink={clean(q.link) || undefined}
            initialEmail={clean(q.email).slice(0, 200) || undefined}
            initialRequestId={/^[a-z0-9]{20,40}$/.test(q.req ?? "") ? q.req : undefined}
          />
        </div>
      </main>
    </div>
  );
}
