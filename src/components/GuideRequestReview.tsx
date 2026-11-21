"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Send, Save } from "lucide-react";

type Fields = Record<"welcome" | "wifiNetwork" | "wifiPassword" | "checkIn" | "checkOut" | "instructions" | "phone", string>;

interface Props {
  info: { eyebrow: string; title: string; email: string; source: string | null; note?: string | null; back: { href: string; label: string } };
  guide: { name: string; url: string | null; have: [string, boolean][] } | null;
  fields: Fields;
  /** PATCH endpoint for the fields */
  patchUrl: string;
  /** "Odobri i pošalji" (site requests only); outreach guides go out with the follow-up */
  approve?: { url: string; sent: boolean } | null;
  /** shown when there is no guide yet */
  emptyNote?: string;
}

/** Admin review of a ready-made guide: what it has, fill in what the listing didn't say, (approve & send). */
export default function GuideRequestReview({ info, guide, fields: initial, patchUrl, approve, emptyNote }: Props) {
  const [f, setF] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "send">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sent, setSent] = useState(!!approve?.sent);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setF({ ...f, [k]: e.target.value });
    setDirty(true);
  };

  async function save(): Promise<boolean> {
    setBusy("save");
    setMsg(null);
    const r = await fetch(patchUrl, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    setBusy("");
    if (!r.ok) {
      setMsg({ ok: false, text: (await r.json().catch(() => ({}))).error ?? "Spremanje nije uspjelo" });
      return false;
    }
    setDirty(false);
    setMsg({ ok: true, text: "Spremljeno. Prevodi su osvježeni." });
    return true;
  }

  async function send() {
    if (!approve) return;
    if (dirty && !(await save())) return;
    if (!confirm(`Poslati vodič na ${info.email}?`)) return;
    setBusy("send");
    setMsg(null);
    const r = await fetch(approve.url, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setBusy("");
    if (r.ok) {
      setSent(true);
      setMsg({ ok: true, text: `Poslano na ${info.email}.` });
    } else setMsg({ ok: false, text: d.error ?? "Slanje nije uspjelo" });
  }

  const input = "w-full h-11 px-3 rounded-lg border border-line focus:border-navy outline-none text-[16px] md:text-sm bg-white";
  const label = "block text-xs font-semibold text-ink-2 mb-1";
  const locked = approve ? sent : false;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 pb-24">
      <Link href={info.back.href} className="inline-flex items-center gap-1 text-sm text-ink-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> {info.back.label}
      </Link>

      <p className="text-xs font-bold uppercase tracking-wide text-orange mb-1">{info.eyebrow}</p>
      <h1 className="text-2xl font-bold text-ink mb-2">{guide?.name ?? info.title}</h1>
      <p className="text-sm text-ink-2 break-all">
        {info.email}
        {info.source && <> · <a href={info.source} target="_blank" rel="noreferrer" className="underline">{info.source}</a></>}
      </p>
      {info.note && <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{info.note}</p>}

      {!guide ? (
        <div className="mt-6 rounded-xl border border-line bg-white p-5 text-sm text-ink-2">{emptyNote ?? "Vodič nije pronađen."}</div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-ink">Šta vodič ima</h2>
              {guide.url && (
                <a href={guide.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-navy">
                  Pogledaj vodič <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
              {guide.have.map(([l, ok]) => (
                <li key={l} className={ok ? "text-ink" : "text-amber-700"}>{ok ? "✅" : "⚠️"} {l}</li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-white p-5 space-y-4">
            <h2 className="font-semibold text-ink">Dopuni (neobavezno)</h2>
            <p className="text-xs text-ink-2 -mt-2">Prazna polja vlasnik vidi kao „— dopunite —“ i popuni ih nakon preuzimanja.</p>
            <div>
              <label className={label}>Poruka dobrodošlice</label>
              <textarea value={f.welcome} onChange={set("welcome")} rows={3} className={`${input} h-auto py-2`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>WiFi mreža</label><input value={f.wifiNetwork} onChange={set("wifiNetwork")} className={input} /></div>
              <div><label className={label}>WiFi lozinka</label><input value={f.wifiPassword} onChange={set("wifiPassword")} className={input} /></div>
              <div><label className={label}>Check-in od</label><input value={f.checkIn} onChange={set("checkIn")} placeholder="15:00" className={input} /></div>
              <div><label className={label}>Check-out do</label><input value={f.checkOut} onChange={set("checkOut")} placeholder="11:00" className={input} /></div>
            </div>
            <div>
              <label className={label}>Upute za ulaz</label>
              <textarea value={f.instructions} onChange={set("instructions")} rows={3} className={`${input} h-auto py-2`} />
            </div>
            <div><label className={label}>Kontakt telefon</label><input value={f.phone} onChange={set("phone")} className={input} /></div>
            <button onClick={save} disabled={!dirty || !!busy || locked}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-line text-sm font-semibold text-ink disabled:opacity-40">
              <Save className="w-4 h-4" /> {busy === "save" ? "Spremam…" : "Spremi"}
            </button>
          </div>
        </>
      )}

      {msg && <p className={`mt-4 text-sm rounded-lg px-3 py-2 ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {guide && approve && (
        <div className="mt-6">
          <button onClick={send} disabled={sent || !!busy || !guide.url}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-orange hover:bg-orange-dark text-white font-semibold disabled:opacity-50">
            <Send className="w-4 h-4" /> {sent ? "Poslano posjetiocu" : busy === "send" ? "Šaljem…" : "Odobri i pošalji"}
          </button>
        </div>
      )}
    </div>
  );
}
