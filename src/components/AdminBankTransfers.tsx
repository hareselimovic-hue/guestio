"use client";

import { useState } from "react";
import { Landmark, FileText, Download, Loader2 } from "lucide-react";

export interface AdminTransfer {
  id: string;
  reference: string;
  amount: number;
  createdAt: string;
  email: string;
  billingName: string | null;
}

export interface AdminInvoice {
  id: string;
  number: string;
  amount: number;
  method: string;
  issuedAt: string;
  billingName: string | null;
  email: string;
}

const km = (n: number) => `${n.toFixed(2).replace(".", ",")} KM`;
// Manual DD.MM.YYYY. — not every browser ships the "bs" locale
const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
};

export default function AdminBankTransfers({ transfers: initial, invoices: initialInvoices }: { transfers: AdminTransfer[]; invoices: AdminInvoice[] }) {
  const [transfers, setTransfers] = useState(initial);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function act(t: AdminTransfer, action: "mark-paid" | "cancel") {
    const q = action === "mark-paid"
      ? `Potvrdi da je uplata ${km(t.amount)} (poziv na broj ${t.reference}) stigla?\n\nPretplata će se produžiti, a faktura poslati kupcu i Nedimu.`
      : `Otkazati uputstvo ${t.reference}? (npr. kupac je platio karticom ili odustao)`;
    if (!confirm(q)) return;
    setBusy(t.id);
    setMessage("");
    const res = await fetch(`/api/admin/payments/${t.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) { setMessage(d.error ?? "Greška."); return; }
    setTransfers((prev) => prev.filter((x) => x.id !== t.id));
    if (action === "mark-paid") {
      setMessage(d.warning ?? `Označeno plaćeno. Faktura ${d.invoiceNumber} poslana kupcu i Nedimu.`);
      if (d.invoiceNumber) {
        setInvoices((prev) => [{ id: "", number: d.invoiceNumber, amount: t.amount, method: "BANK_TRANSFER", issuedAt: new Date().toISOString(), billingName: t.billingName, email: t.email }, ...prev]);
      }
    }
  }

  return (
    <>
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="w-5 h-5 text-[#FF6700]" />
          <h2 className="text-lg font-semibold text-[#262626]">
            Uplate virmanom <span className="text-[#6B6B6B] font-normal text-base">({transfers.length} čeka)</span>
          </h2>
        </div>
        {message && <p className="text-sm text-[#0F2F61] bg-blue-50 rounded-lg px-3 py-2 mb-3">{message}</p>}
        {transfers.length === 0 ? (
          <p className="text-sm text-[#6B6B6B] italic">Nema uplata koje čekaju.</p>
        ) : (
          <div className="border border-[#E0E0E0] rounded-xl overflow-hidden divide-y divide-[#F0F0F0]">
            {transfers.map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#262626]">{t.billingName ?? t.email} · {km(t.amount)}</p>
                  <p className="text-xs text-[#6B6B6B]">Poziv na broj <span className="font-mono">{t.reference}</span> · zatraženo {fmt(t.createdAt)} · {t.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => act(t, "mark-paid")}
                    disabled={busy === t.id}
                    className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
                  >
                    {busy === t.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Označi plaćeno
                  </button>
                  <button
                    onClick={() => act(t, "cancel")}
                    disabled={busy === t.id}
                    className="text-sm text-[#6B6B6B] hover:text-red-500 px-2"
                  >
                    Otkaži
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-[#FF6700]" />
          <h2 className="text-lg font-semibold text-[#262626]">Izdate fakture</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-[#6B6B6B] italic">Još nema faktura.</p>
        ) : (
          <div className="border border-[#E0E0E0] rounded-xl overflow-hidden divide-y divide-[#F0F0F0]">
            {invoices.map((inv) => (
              <div key={inv.number} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#262626]">{inv.number} · {km(inv.amount)}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    {inv.billingName ?? inv.email} · {fmt(inv.issuedAt)} · {inv.method === "CARD" ? "kartica" : "virman"}
                  </p>
                </div>
                {inv.id && (
                  <a href={`/api/invoices/${inv.id}/pdf`} className="inline-flex items-center gap-1 text-sm text-[#0F2F61] hover:underline">
                    <Download className="w-4 h-4" /> PDF
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
