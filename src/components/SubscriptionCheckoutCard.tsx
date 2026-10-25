"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { calculateMonthlyPrice } from "@/lib/pricing";

interface BillingInfo {
  billingName: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  billingPostcode: string | null;
}

export default function SubscriptionCheckoutCard({
  propertyCount,
  billing,
}: {
  propertyCount: number;
  billing: BillingInfo;
}) {
  const [form, setForm] = useState({
    billingName: billing.billingName ?? "",
    billingAddress: billing.billingAddress ?? "",
    billingCity: billing.billingCity ?? "",
    billingPostcode: billing.billingPostcode ?? "",
  });
  const [hasBilling, setHasBilling] = useState(
    Boolean(billing.billingName && billing.billingAddress && billing.billingCity && billing.billingPostcode)
  );
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
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

  async function pay() {
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

  return (
    <div className="bg-white rounded-2xl border border-[#EDEDE9] p-8 space-y-5">
      <div className="flex items-center gap-3">
        <CreditCard className="w-5 h-5 text-[#FF6700]" />
        <h2 className="font-bold text-[#262626]">Plati karticom</h2>
      </div>

      <div className="rounded-xl bg-[#F7F7F5] px-5 py-4 space-y-1">
        <p className="text-sm text-[#6B6B6B]">
          {price.tierName} plan · {price.propertyCount} {price.propertyCount === 1 ? "objekat" : "objekata"} × {price.pricePerProperty.toFixed(2)} KM
        </p>
        <p className="text-2xl font-bold text-[#262626]">{price.total.toFixed(2)} KM<span className="text-sm font-normal text-[#6B6B6B]"> / mjesečno</span></p>
        <p className="text-xs text-[#9B9B9B]">Cijena se svaki put ponovo računa po vašem trenutnom broju objekata.</p>
      </div>

      {!hasBilling ? (
        <form onSubmit={saveBilling} className="space-y-3">
          <p className="text-sm text-[#6B6B6B]">Prije prvog plaćanja unesite podatke za naplatu:</p>
          <input
            required
            placeholder="Ime i prezime / naziv firme"
            value={form.billingName}
            onChange={(e) => setForm({ ...form, billingName: e.target.value })}
            className="w-full rounded-xl border border-[#EDEDE9] px-4 py-2.5 text-sm"
          />
          <input
            required
            placeholder="Adresa"
            value={form.billingAddress}
            onChange={(e) => setForm({ ...form, billingAddress: e.target.value })}
            className="w-full rounded-xl border border-[#EDEDE9] px-4 py-2.5 text-sm"
          />
          <div className="flex gap-3">
            <input
              required
              placeholder="Grad"
              value={form.billingCity}
              onChange={(e) => setForm({ ...form, billingCity: e.target.value })}
              className="flex-1 rounded-xl border border-[#EDEDE9] px-4 py-2.5 text-sm"
            />
            <input
              required
              placeholder="Poštanski broj"
              value={form.billingPostcode}
              onChange={(e) => setForm({ ...form, billingPostcode: e.target.value })}
              className="w-32 rounded-xl border border-[#EDEDE9] px-4 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0F2F61] hover:bg-[#0a2347] disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Sačuvaj i nastavi
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={pay}
            disabled={paying}
            className="w-full bg-[#FF6700] hover:bg-[#e05c00] disabled:opacity-60 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {paying && <Loader2 className="w-4 h-4 animate-spin" />}
            Plati {price.total.toFixed(2)} KM karticom
          </button>
          <button
            onClick={() => setHasBilling(false)}
            className="w-full text-center text-xs text-[#9B9B9B] hover:text-[#6B6B6B]"
          >
            Izmijeni podatke za naplatu
          </button>
        </div>
      )}
    </div>
  );
}
