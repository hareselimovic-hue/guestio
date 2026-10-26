"use client";

import { useState } from "react";
import { Trash2, Plus, Users, Shield, CheckCircle, XCircle, CreditCard } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date | string;
  emailVerified: boolean;
  _count: { properties: number };
}

interface WhitelistEntry {
  id: string;
  email: string;
  createdAt: Date | string;
}

interface SubUser {
  id: string;
  name: string;
  email: string;
  subscription: { id: string; validUntil: string; daysLeft: number } | null;
}

interface AdminPanelProps {
  users: User[];
  whitelist: WhitelistEntry[];
  subUsers: SubUser[];
}

const ADMIN_EMAIL = "hareselimovic@gmail.com";

interface DeletePreview {
  user: User;
  workspaceProperties: number;
  personalProperties: number;
  hasWorkspace: boolean;
}

export default function AdminPanel({ users: initialUsers, whitelist: initialWhitelist, subUsers: initialSubUsers }: AdminPanelProps) {
  const [users, setUsers] = useState(initialUsers);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingUser, setDeletingUser] = useState(false);
  const [whitelist, setWhitelist] = useState(initialWhitelist);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [subUsers, setSubUsers] = useState(initialSubUsers);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");

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

  async function askDeleteUser(user: User) {
    setDeleteError("");
    const res = await fetch(`/api/admin/users?id=${user.id}&dryRun=1`, { method: "DELETE" });
    const d = await res.json();
    if (!res.ok) {
      alert(d.error ?? "Greška.");
      return;
    }
    setDeletePreview({ user, ...d });
  }

  async function confirmDeleteUser() {
    if (!deletePreview) return;
    setDeletingUser(true);
    setDeleteError("");
    const { user } = deletePreview;
    const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
    const d = await res.json();
    setDeletingUser(false);
    if (!res.ok) {
      setDeleteError(d.error ?? "Greška pri brisanju.");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setSubUsers((prev) => prev.filter((u) => u.id !== user.id));
    setWhitelist((prev) => prev.filter((e) => e.email.toLowerCase() !== user.email.toLowerCase()));
    setDeletePreview(null);
  }

  async function extendSubscription(userId: string) {
    if (!newDate) return;
    const res = await fetch("/api/admin/subscriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, validUntil: newDate }),
    });
    if (res.ok) {
      const d = await res.json();
      const now = new Date();
      const daysLeft = Math.ceil((new Date(d.subscription.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      setSubUsers((prev) => prev.map((u) =>
        u.id === userId ? { ...u, subscription: { id: d.subscription.id, validUntil: d.subscription.validUntil, daysLeft } } : u
      ));
      setExtendingId(null);
      setNewDate("");
    }
  }

  function setQuickDate(userId: string, days: number | "2030") {
    const d = new Date();
    if (days === "2030") {
      setNewDate("2030-12-31");
    } else {
      d.setDate(d.getDate() + days);
      setNewDate(d.toISOString().split("T")[0]);
    }
    setExtendingId(userId);
  }

  function daysBadge(days: number | null) {
    if (days === null) return <span className="text-[#CCCCCC]">—</span>;
    if (days <= 0) return <span className="text-red-500">Istekla</span>;
    if (days <= 7) return <span className="text-orange-500">{days}d</span>;
    return <span className="text-green-600">{days}d</span>;
  }

  // Extend buttons / date editor — shared by the mobile cards and the desktop table
  function renderSubActions(u: SubUser, align: "start" | "end" = "start") {
    const justify = align === "end" ? "justify-end" : "justify-start";
    if (extendingId === u.id) {
      return (
        <div className={`flex items-center gap-1.5 flex-wrap ${justify}`}>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="border border-[#E0E0E0] rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6700]"
          />
          <button onClick={() => extendSubscription(u.id)} className="bg-[#FF6700] text-white text-xs px-2.5 py-1 rounded-lg hover:bg-[#e05c00] font-medium">Sačuvaj</button>
          <button onClick={() => { setExtendingId(null); setNewDate(""); }} className="text-[#6B6B6B] text-xs px-2 py-1">Otkaži</button>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1 flex-wrap ${justify}`}>
        <button onClick={() => setQuickDate(u.id, 30)} className="text-xs border border-[#E0E0E0] px-2 py-1 rounded-lg hover:bg-[#F7F7F5] text-[#262626]">+30d</button>
        <button onClick={() => setQuickDate(u.id, 365)} className="text-xs border border-[#E0E0E0] px-2 py-1 rounded-lg hover:bg-[#F7F7F5] text-[#262626]">+1god</button>
        <button onClick={() => setQuickDate(u.id, "2030")} className="text-xs border border-[#E0E0E0] px-2 py-1 rounded-lg hover:bg-[#F7F7F5] text-[#262626]">2030</button>
        <button onClick={() => { setExtendingId(u.id); setNewDate(u.subscription ? u.subscription.validUntil.split("T")[0] : ""); }} className="text-xs bg-[#F7F7F5] border border-[#E0E0E0] px-2 py-1 rounded-lg hover:bg-[#EDEDE9] text-[#262626]">Datum</button>
      </div>
    );
  }

  function fmt(date: Date | string) {
    return new Date(date).toLocaleDateString("bs-BA", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="space-y-10">

      {/* ── Delete user confirmation ── */}
      {deletePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deletingUser && setDeletePreview(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#262626] mb-1">Obrisati korisnika?</h3>
            <p className="text-sm text-[#262626] font-medium">{deletePreview.user.name}</p>
            <p className="text-sm text-[#6B6B6B] mb-4">{deletePreview.user.email}</p>

            <ul className="space-y-2 text-sm text-[#6B6B6B] mb-5">
              <li>• Nalog, prijave i pretplata se trajno brišu.</li>
              <li>• Email se uklanja s whitelist-e, pa se ne može ponovo registrovati.</li>
              {deletePreview.hasWorkspace ? (
                <li>
                  • Njegovi apartmani ({deletePreview.workspaceProperties}), zadaci i komentari{" "}
                  <strong className="text-[#262626]">ostaju u workspaceu</strong> i prelaze na vlasnika workspacea.
                </li>
              ) : deletePreview.personalProperties > 0 ? (
                <li className="text-red-600">
                  • <strong>{deletePreview.personalProperties} apartman(a)</strong> ovog korisnika, sa svim sekcijama,
                  linkovima i prijavama gostiju, trajno se briše.
                </li>
              ) : (
                <li>• Korisnik nema apartmana.</li>
              )}
            </ul>

            {deleteError && <p className="text-sm text-red-500 mb-3">{deleteError}</p>}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletePreview(null)}
                disabled={deletingUser}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#6B6B6B] border border-[#E0E0E0] hover:bg-[#F7F7F5] disabled:opacity-50"
              >
                Odustani
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={deletingUser}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
              >
                {deletingUser ? "Brišem..." : "Da, obriši"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Whitelist ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[#FF6700]" />
          <h2 className="text-lg font-semibold text-[#262626]">Whitelist registracije</h2>
        </div>
        <p className="text-sm text-[#6B6B6B] mb-4">
          Samo emailovi s ove liste mogu kreirati nalog. Vaš admin email je uvijek dozvoljen.
        </p>

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

      {/* ── Registrovani korisnici ── */}
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
          <>
          {/* Mobile: one card per user (the table is wider than the screen) */}
          <div className="sm:hidden border border-[#E0E0E0] rounded-xl divide-y divide-[#F0F0F0] bg-white">
            {users.map((u) => (
              <div key={u.id} className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#262626] truncate">{u.name}</p>
                  <p className="text-xs text-[#6B6B6B] break-all">{u.email}</p>
                  <p className="text-xs text-[#9B9B9B] mt-1">
                    {u._count.properties} {u._count.properties === 1 ? "apartman" : "apartmana"} · registrovan {fmt(u.createdAt)}
                  </p>
                </div>
                {u.email !== ADMIN_EMAIL && (
                  <button
                    onClick={() => askDeleteUser(u)}
                    title="Obriši korisnika"
                    className="p-1.5 -mr-1.5 text-[#6B6B6B] hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="hidden sm:block border border-[#E0E0E0] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F5]">
                <tr>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium">Ime</th>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium hidden md:table-cell">Registrovan</th>
                  <th className="text-center px-4 py-3 text-[#6B6B6B] font-medium">Prop.</th>
                  <th className="text-center px-4 py-3 text-[#6B6B6B] font-medium hidden sm:table-cell">Verificiran</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA]">
                    <td className="px-4 py-3 text-[#262626] font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-[#6B6B6B]">{u.email}</td>
                    <td className="px-4 py-3 text-[#6B6B6B] hidden md:table-cell">{fmt(u.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${u._count.properties > 0 ? "text-[#262626]" : "text-[#CCCCCC]"}`}>
                        {u._count.properties}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {u.emailVerified ? (
                        <CheckCircle className="w-4 h-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="w-4 h-4 text-[#CCCCCC] inline" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.email !== ADMIN_EMAIL && (
                        <button
                          onClick={() => askDeleteUser(u)}
                          title="Obriši korisnika"
                          className="text-[#6B6B6B] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      {/* ── Pretplate ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-[#FF6700]" />
          <h2 className="text-lg font-semibold text-[#262626]">Pretplate</h2>
        </div>

        {subUsers.length === 0 ? (
          <p className="text-sm text-[#6B6B6B] italic">Nema korisnika.</p>
        ) : (
          <>
          {/* Mobile: one card per user with the extend buttons underneath */}
          <div className="sm:hidden border border-[#E0E0E0] rounded-xl divide-y divide-[#F0F0F0] bg-white">
            {subUsers.map((u) => (
              <div key={u.id} className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#262626] truncate">{u.name}</p>
                    <p className="text-xs text-[#6B6B6B] break-all">{u.email}</p>
                    <p className="text-xs text-[#9B9B9B] mt-0.5">
                      Važi do {u.subscription ? fmt(u.subscription.validUntil) : "—"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{daysBadge(u.subscription?.daysLeft ?? null)}</span>
                </div>
                {renderSubActions(u)}
              </div>
            ))}
          </div>
          <div className="hidden sm:block border border-[#E0E0E0] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F7F7F5]">
                <tr>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium">Korisnik</th>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium hidden sm:table-cell">Važi do</th>
                  <th className="text-left px-4 py-3 text-[#6B6B6B] font-medium">Dana</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {subUsers.map((u) => {
                  const days = u.subscription?.daysLeft ?? null;
                  return (
                    <tr key={u.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3">
                        <p className="text-[#262626] font-medium">{u.name}</p>
                        <p className="text-[#6B6B6B] text-xs">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">
                        {u.subscription ? fmt(u.subscription.validUntil) : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold">{daysBadge(days)}</td>
                      <td className="px-4 py-3 text-right">{renderSubActions(u, "end")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
