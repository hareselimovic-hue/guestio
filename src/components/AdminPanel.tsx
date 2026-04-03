"use client";

import { useState } from "react";
import { Trash2, Plus, Users, Shield, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
  emailVerified: boolean;
}

interface WhitelistEntry {
  id: string;
  email: string;
  createdAt: Date | string;
}

interface AdminPanelProps {
  users: User[];
  whitelist: WhitelistEntry[];
}

export default function AdminPanel({ users, whitelist: initialWhitelist }: AdminPanelProps) {
  const [whitelist, setWhitelist] = useState(initialWhitelist);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ created: number; total: number; alreadyExisted: number } | null>(null);

  async function syncRentlio() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/rentlio/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) setSyncResult(data);
    } finally {
      setSyncing(false);
    }
  }

  async function addEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Unesite valjanu email adresu.");
      return;
    }
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Greška pri dodavanju.");
      } else {
        const d = await res.json();
        setWhitelist((prev) => [d.entry, ...prev]);
        setNewEmail("");
      }
    } finally {
      setAdding(false);
    }
  }

  async function removeEmail(id: string) {
    const res = await fetch(`/api/admin/whitelist?id=${id}`, { method: "DELETE" });
    if (res.ok) setWhitelist((prev) => prev.filter((e) => e.id !== id));
  }

  function fmt(date: Date | string) {
    return new Date(date).toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="space-y-10">
      {/* ── Rentlio Sync ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-[#FF6700]" />
          <h2 className="text-lg font-semibold text-[#262626]">Rentlio sinhronizacija</h2>
        </div>
        <p className="text-sm text-[#6B6B6B] mb-4">
          Kreira SmartStay property za svaki Rentlio apartman koji još nije u sistemu.
        </p>
        <button
          onClick={syncRentlio}
          disabled={syncing}
          className="flex items-center gap-2 bg-[#0F2F61] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0a2347] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sinhronizacija..." : "Sync Rentlio properties"}
        </button>
        {syncResult && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            ✓ Pronađeno <strong>{syncResult.total}</strong> apartmana u Rentliu —{" "}
            <strong>{syncResult.created}</strong> novo kreirano,{" "}
            <strong>{syncResult.alreadyExisted}</strong> već postojalo.
          </div>
        )}
      </section>

      {/* ── Whitelist ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#FF6700]" />
          <h2 className="text-lg font-semibold text-[#262626]">Whitelist registracije</h2>
        </div>
        <p className="text-sm text-[#6B6B6B] mb-4">
          Samo emailovi s ove liste mogu kreirati nalog. Vaš admin email je uvijek dozvoljen.
        </p>

        {/* Add form */}
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            placeholder="novi@email.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEmail()}
            className="flex-1 border border-[#E0E0E0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6700]"
          />
          <button
            onClick={addEmail}
            disabled={adding}
            className="flex items-center gap-1.5 bg-[#FF6700] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55e00] disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {/* Whitelist table */}
        {whitelist.length === 0 ? (
          <p className="text-sm text-[#6B6B6B] italic">Nema emailova na whitelisti.</p>
        ) : (
          <div className="border border-[#E0E0E0] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F5]">
                <tr>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium hidden sm:table-cell">Dodano</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {whitelist.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 text-[#262626]">{entry.email}</td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">{fmt(entry.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeEmail(entry.id)}
                        className="text-[#6B6B6B] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Users ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#FF6700]" />
          <h2 className="text-lg font-semibold text-[#262626]">
            Registrovani korisnici{" "}
            <span className="text-[#6B6B6B] font-normal text-base">({users.length})</span>
          </h2>
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-[#6B6B6B] italic">Nema registrovanih korisnika.</p>
        ) : (
          <div className="border border-[#E0E0E0] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F5]">
                <tr>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium">Ime</th>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium hidden md:table-cell">Registrovan</th>
                  <th className="text-center px-4 py-3 text-[#6B6B6B] font-medium hidden sm:table-cell">Verificiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 text-[#262626] font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-[#6B6B6B]">{u.email}</td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden md:table-cell">{fmt(u.createdAt)}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {u.emailVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#CCCCCC] inline" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
