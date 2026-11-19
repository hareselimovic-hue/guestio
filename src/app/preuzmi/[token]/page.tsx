"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, BookOpen } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type Info = { name: string; kind: string; email: string | null; guideUrl: string };

/**
 * /preuzmi/<token> — the owner takes over the guide we prepared for them.
 * Not signed in → register (email prefilled; the token lets them past the whitelist) → back here with
 * ?auto=1 → the guide is moved to their account straight away.
 */
function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const { data: session, isPending } = useSession();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [done, setDone] = useState(false);
  const autoTried = useRef(false);

  useEffect(() => {
    fetch(`/api/prospects/claim/${token}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError(d.error ?? "Vodič više nije dostupan.");
        else setInfo(d);
      })
      .catch(() => setError("Vodič trenutno ne možemo učitati. Pokušajte ponovo."));
  }, [token]);

  const back = `/preuzmi/${token}?auto=1`;

  const claim = useCallback(async () => {
    setClaiming(true);
    setError(null);
    const res = await fetch(`/api/prospects/claim/${token}`, { method: "POST" });
    if (res.status === 401) {
      const email = info?.email ? `&email=${encodeURIComponent(info.email)}` : "";
      router.push(`/register?redirect=${encodeURIComponent(back)}${email}`);
      return;
    }
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.push(d.redirect ?? "/dashboard"), 1200);
    } else {
      setError(d.error ?? "Preuzimanje nije uspjelo. Pokušajte ponovo.");
      setClaiming(false);
    }
  }, [token, info, back, router]);

  // Back from signup/login: take the guide over without another click
  useEffect(() => {
    if (search.get("auto") === "1" && session && info && !autoTried.current) {
      autoTried.current = true;
      claim();
    }
  }, [search, session, info, claim]);

  const hotel = info?.kind === "HOTEL";

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-line p-8 max-w-md w-full">
        <p className="text-center text-xl font-extrabold text-navy mb-6">
          Smart<span className="text-orange">Stay</span>
        </p>

        {error && !info ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-ink mb-2">Vodič nije dostupan</h1>
            <p className="text-sm text-ink-2">{error} Pišite nam na info@smartstay.ba i rado ćemo pomoći.</p>
          </div>
        ) : !info || isPending ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : done ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-lg font-bold text-ink mb-2">Vodič je vaš!</h1>
            <p className="text-sm text-ink-2">Otvaramo ga u vašem nalogu…</p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 bg-navy/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-navy" />
            </div>
            <p className="text-sm text-ink-2 text-center mb-1">Digitalni vodič za</p>
            <h1 className="text-xl font-bold text-ink text-center mb-5">{info.name}</h1>
            <ul className="text-sm text-ink-2 space-y-2 mb-6 leading-relaxed">
              <li>✓ Vodič prelazi na vaš nalog i ostaje na istom linku.</li>
              <li>✓ Dopunite ono što nismo mogli znati ({hotel ? "WiFi, vrijeme doručka, usluge" : "WiFi, preuzimanje ključa"}) i šaljite ga gostima.</li>
              <li>✓ Prvih 30 dana besplatno i bez obaveze.</li>
            </ul>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-4">{error}</p>}
            <Button
              onClick={claim}
              disabled={claiming}
              className="w-full bg-orange hover:bg-orange-dark text-white font-semibold h-11"
            >
              {claiming ? "Preuzimamo…" : session ? `Preuzmi na nalog ${session.user.email}` : "Preuzmi vodič"}
            </Button>
            {session ? (
              <Button
                variant="outline"
                onClick={() => router.push(`/login?redirect=${encodeURIComponent(back)}`)}
                className="w-full h-11 text-sm mt-3"
              >
                Prijavi se drugim nalogom
              </Button>
            ) : (
              <p className="text-sm text-ink-2 text-center mt-4">
                Već imate SmartStay nalog?{" "}
                <a href={`/login?redirect=${encodeURIComponent(back)}`} className="text-orange font-medium hover:underline">
                  Prijavite se
                </a>
              </p>
            )}
            <p className="text-center mt-5">
              <a href={info.guideUrl} className="text-sm text-navy hover:underline">← Nazad na vodič</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ClaimPage />
    </Suspense>
  );
}
