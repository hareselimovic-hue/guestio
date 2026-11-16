"use client";

import { useState } from "react";
import { CreditCard, Landmark, Loader2, Download, Mail, Check } from "lucide-react";
import { calculateMonthlyPrice } from "@/lib/pricing";

interface BillingInfo {
  billingName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingPostcode: string | null;
  billingIdBroj: string | null;
}

export interface PendingTransfer {
  id: string;
  /** e.g. "05.11.–05.12.2026." */
  period: string;
  reference: string;
  amount: number;
  tierName: string;
  dueDate: string;
  recipient: string;
  account: string;
  bank: string;
}

const km = (n: number) => `${n.toFixed(2).replace(".", ",")} KM`;
// Manual DD.MM.YYYY. — not every browser ships the "bs" locale
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
};

const inputCls = "w-full rounded-xl border border-line px-4 py-2.5 text-sm";

export default function SubscriptionCheckoutCard({
  propertyCount,
  billing,
  initialPending,
  collapsedUntil,
}: {
  propertyCount: number;
  billing: BillingInfo;
  initialPending: PendingTransfer | null;
  /** Set while renewal isn't due yet: show a one-line note with "Plati unaprijed" instead of the card */
  collapsedUntil?: string;
}) {
  const [expanded, setExpanded] = useState(!collapsedUntil);
  const [form, setForm] = useState({
    billingName: billing.billingName ?? "",
    billingAddress: billing.billingAddress ?? "",
    billingCity: billing.billingCity ?? "",
    billingPostcode: billing.billingPostcode ?? "",
    billingIdBroj: billing.billingIdBroj ?? "",
  });
  const [hasBilling, setHasBilling] = useState(
    Boolean(billing.billingName && billing.billingAddress && billing.billingCity && billing.billingPostcode)
  );
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [emailed, setEmailed] = useState(false);
  const [pending, setPending] = useState<PendingTransfer | null>(initialPending);
  const [error, setError] = useState("");

  const price = calculateMonthlyPrice(propertyCount);

  async function saveBilling(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/subscription/checkout", { method: "PUT", body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Greška pri snimanju podataka.");
      setHasBilling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri snimanju podataka.");
    } finally {
      setSaving(false);
    }
  }

  async function payByCard() {
    setError("");
    setPaying(true);
    try {
      const res = await fetch("/api/subscription/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Plaćanje trenutno nije dostupno.");
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plaćanje trenutno nije dostupno.");
      setPaying(false);
    }
  }

  async function requestTransfer() {
    setError("");
    setRequesting(true);
    try {
      const res = await fetch("/api/subscription/bank-transfer", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Greška pri kreiranju uputstva.");
      setPending({ ...data.pending, dueDate: String(data.pending.dueDate) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri kreiranju uputstva.");
    } finally {
      setRequesting(false);
    }
  }

  async function emailInstructions() {
    if (!pending) return;
    setError("");
    setEmailing(true);
    try {
      const res = await fetch(`/api/subscription/bank-transfer/${pending.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Slanje emaila nije uspjelo.");
      setEmailed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slanje emaila nije uspjelo.");
    } finally {
      setEmailing(false);
    }
  }

  if (!expanded) {
    return (
      <div className="bg-white rounded-2xl border border-line px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-ink-2">
          Pretplata je aktivna do <strong className="text-ink">{fmtDate(collapsedUntil!)}</strong>. Opcije plaćanja
          pojavit će se 5 dana prije isteka.
        </p>
        <button
          onClick={() => setExpanded(true)}
          className="text-sm font-semibold text-navy hover:underline shrink-0 text-left"
        >
          Plati unaprijed →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-line p-6 sm:p-8 space-y-5">
      <h2 className="font-bold text-ink text-lg">Obnovi pretplatu</h2>

      <div className="rounded-xl bg-canvas px-5 py-4 space-y-1">
        <p className="text-sm text-ink-2">
          {price.tierName} plan · {price.propertyCount} {price.propertyCount === 1 ? "objekat" : "objekata"} × {price.pricePerProperty.toFixed(2)} KM
        </p>
        <p className="text-2xl font-bold text-ink">{price.total.toFixed(2)} KM<span className="text-sm font-normal text-ink-2"> / mjesečno</span></p>
        <p className="text-xs text-ink-3">Cijena se svaki put ponovo računa po vašem trenutnom broju objekata.</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {!hasBilling ? (
        <form onSubmit={saveBilling} className="space-y-3">
          <p className="text-sm text-ink-2">Prije prvog plaćanja unesite podatke za naplatu (pojavljuju se na fakturi):</p>
          <input required placeholder="Ime i prezime / naziv firme" value={form.billingName}
            onChange={(e) => setForm({ ...form, billingName: e.target.value })} className={inputCls} />
          <input required placeholder="Adresa" value={form.billingAddress}
            onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} className={inputCls} />
          <div className="flex flex-col sm:flex-row gap-3">
            <input required placeholder="Grad" value={form.billingCity}
              onChange={(e) => setForm({ ...form, billingCity: e.target.value })} className={`${inputCls} sm:flex-1`} />
            <input required placeholder="Poštanski broj" value={form.billingPostcode}
              onChange={(e) => setForm({ ...form, billingPostcode: e.target.value })} className={`${inputCls} sm:w-36`} />
          </div>
          <input placeholder="ID broj firme (neobavezno)" value={form.billingIdBroj} inputMode="numeric"
            onChange={(e) => setForm({ ...form, billingIdBroj: e.target.value })} className={inputCls} />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Sačuvaj i nastavi
          </button>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card */}
            <div className="rounded-xl border border-line p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange" />
                <p className="font-semibold text-ink">Plati karticom</p>
              </div>
              <p className="text-xs text-ink-2 flex-1">Pretplata se produžava odmah. Fakturu dobijate na email.</p>
              <button
                onClick={payByCard}
                disabled={paying}
                className="w-full bg-orange hover:bg-orange-dark disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                Plati {price.total.toFixed(2)} KM
              </button>
            </div>

            {/* Bank transfer */}
            <div className="rounded-xl border border-line p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-navy" />
                <p className="font-semibold text-ink">Plati virmanom</p>
              </div>
              <p className="text-xs text-ink-2 flex-1">
                Za firme. Dobijate uputstvo za uplatu, a fakturu nakon što uplata stigne. Pristup ostaje aktivan 7 dana dok uplata ne legne.
              </p>
              {!pending && (
                <button
                  onClick={requestTransfer}
                  disabled={requesting}
                  className="w-full bg-navy hover:bg-navy-dark disabled:opacity-60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {requesting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Zatraži uputstvo za uplatu
                </button>
              )}
            </div>
          </div>

          {pending && (
            <div className="rounded-xl border-2 border-navy p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-navy uppercase tracking-wide">Uputstvo za uplatu</p>
                <p className="text-sm text-ink-2 mt-1">Uplatu izvršite do {fmtDate(pending.dueDate)} Fakturu šaljemo na email kad uplata stigne.</p>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-ink-2">Primalac</dt><dd className="text-ink">{pending.recipient}</dd>
                <dt className="text-ink-2">Račun</dt><dd className="text-ink font-mono font-semibold break-all">{pending.account}</dd>
                <dt className="text-ink-2">Banka</dt><dd className="text-ink">{pending.bank}</dd>
                <dt className="text-ink-2">Iznos</dt><dd className="text-ink font-semibold">{km(pending.amount)}</dd>
                <dt className="text-ink-2">Poziv na broj</dt><dd className="text-ink font-mono font-semibold">{pending.reference}</dd>
                <dt className="text-ink-2">Svrha</dt><dd className="text-ink">SmartStay pretplata {pending.period}</dd>
                <dt className="text-ink-2">Period</dt><dd className="text-ink">{pending.period} · {pending.tierName}</dd>
              </dl>
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={`/api/subscription/bank-transfer/${pending.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-line hover:bg-canvas text-ink font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" /> Preuzmi PDF
                </a>
                <button
                  onClick={emailInstructions}
                  disabled={emailing || emailed}
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-line hover:bg-canvas disabled:opacity-70 text-ink font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                >
                  {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : emailed ? <Check className="w-4 h-4 text-green-600" /> : <Mail className="w-4 h-4" />}
                  {emailed ? "Poslano na email" : "Pošalji na email"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setHasBilling(false)}
            className="w-full text-center text-xs text-ink-3 hover:text-ink-2"
          >
            Izmijeni podatke za naplatu
          </button>
        </>
      )}
    </div>
  );
}
