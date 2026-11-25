"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Loader2, MapPin, Star, ExternalLink, Pencil, Link2, Copy } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PasswordInput } from "@/components/ui/password-input";
import { toGuidePlace, type NearbyPlace, type PlaceCategory } from "@/lib/nearby-places";
import type { OnboardingDraft } from "@/lib/onboarding";
import { STRINGS, type Lang } from "./strings";

/**
 * Self-serve guide wizard. mode "start": public /start (link → account → review → WiFi → places → done).
 * mode "app": "New property → From listing link" for signed-in owners (no account step, can copy from an existing apartment).
 */

type Step = "link" | "account" | "review" | "wifi" | "places" | "done";
type Import = { status: "READING" | "READY" | "FAILED"; slow: boolean; draft: OnboardingDraft | null };
const CATS: PlaceCategory[] = ["FOOD", "CAFE", "SIGHT", "SHOP"];

export interface GuideWizardProps {
  mode: "start" | "app";
  lang: Lang;
  sessionEmail: string | null;
  initialLink?: string;
  initialEmail?: string;
  initialRequestId?: string;
  copySources?: { id: string; name: string }[];
}

export default function GuideWizard(props: GuideWizardProps) {
  const t = STRINGS[props.lang];
  const isApp = props.mode === "app";
  const [sessionEmail, setSessionEmail] = useState(props.sessionEmail);
  // The account step is decided once, so the step count doesn't jump right after signing up
  const [needsAccount] = useState(!isApp && !props.sessionEmail);
  const steps: Step[] = useMemo(() => ["link", ...(needsAccount ? ["account" as Step] : []), "review", "wifi", "places", "done"], [needsAccount]);
  const [step, setStep] = useState<Step>(props.initialRequestId ? (needsAccount ? "account" : "review") : "link");
  const idx = steps.indexOf(step);
  const go = (s: Step) => { setStep(s); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); };
  const next = () => go(steps[Math.min(idx + 1, steps.length - 1)]);
  const back = () => go(steps[Math.max(idx - 1, 0)]);

  // ── listing import ──
  const [link, setLink] = useState(props.initialLink ?? "");
  const [linkErr, setLinkErr] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(props.initialRequestId ?? null);
  const [imp, setImp] = useState<Import | null>(props.initialRequestId ? { status: "READING", slow: false, draft: null } : null);
  const [skipped, setSkipped] = useState(false); // owner continued without waiting for a slow listing

  async function startImport(url: string) {
    setLinkErr("");
    setLinkBusy(true);
    try {
      const r = await fetch("/api/onboarding/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email: props.initialEmail }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setLinkErr(j.error === "TOO_MANY" ? t.linkMany : t.linkBad); return false; }
      setRequestId(j.id);
      setImp({ status: "READING", slow: j.platform === "BOOKING", draft: null });
      return true;
    } catch {
      setLinkErr(t.linkBad);
      return false;
    } finally {
      setLinkBusy(false);
    }
  }

  // Coming from smartstay.ba with ?link= → start reading right away
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || !props.initialLink || props.initialRequestId) return;
    autoStarted.current = true;
    startImport(props.initialLink).then((ok) => { if (ok) setStep(steps[1]); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!requestId || imp?.status !== "READING") return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/onboarding/import/${requestId}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!stop) setImp({ status: j.status, slow: !!j.slow, draft: j.draft });
      } catch { /* next tick */ }
    };
    tick();
    const h = setInterval(tick, 2500);
    return () => { stop = true; clearInterval(h); };
  }, [requestId, imp?.status]);

  // ── form ──
  const [f, setF] = useState({
    name: "", address: "", checkIn: "", checkOut: "", rules: "",
    wifiNetwork: "", wifiPassword: "", checkInType: "SELF" as "SELF" | "PERSONAL", entry: "", phone: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const [fromDraft, setFromDraft] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<Set<string>>(new Set());
  const filled = useRef(false);

  // Fill from the listing once it arrives — only fields the owner hasn't typed into yet
  useEffect(() => {
    const d = imp?.draft;
    if (!d || filled.current) return;
    filled.current = true;
    const got = new Set<string>();
    setF((p) => {
      const n = { ...p };
      const put = (k: "name" | "address" | "checkIn" | "checkOut" | "rules", v: string) => { if (v && !p[k].trim()) { n[k] = v; got.add(k); } };
      put("name", d.name); put("address", d.address); put("checkIn", d.checkIn); put("checkOut", d.checkOut); put("rules", d.rules.join("\n"));
      if (!n.checkIn) n.checkIn = "15:00";
      if (!n.checkOut) n.checkOut = "11:00";
      return n;
    });
    setFromDraft(got);
  }, [imp?.draft]);

  // App: copy contact, house rules and entry from one of the owner's apartments
  const [copyFrom, setCopyFrom] = useState("");
  async function applyCopy(id: string) {
    setCopyFrom(id);
    if (!id) { setCopied(new Set()); return; }
    try {
      const r = await fetch(`/api/properties/${id}`);
      if (!r.ok) return;
      const p = await r.json() as { sections: { type: string; content: Record<string, unknown> }[] };
      const c = (type: string) => p.sections.find((x) => x.type === type)?.content ?? {};
      const got = new Set<string>();
      setF((prev) => {
        const n = { ...prev };
        const phone = String(c("CONTACT").phone ?? "");
        if (phone) { n.phone = phone; got.add("phone"); }
        const rules = Array.isArray(c("HOUSE_RULES").rules) ? (c("HOUSE_RULES").rules as string[]).filter(Boolean) : [];
        if (rules.length) { n.rules = rules.join("\n"); got.add("rules"); }
        const ci = c("CHECKIN");
        if (ci.checkInType === "PERSONAL" || ci.checkInType === "SELF") n.checkInType = ci.checkInType;
        if (typeof ci.instructions === "string" && ci.instructions.trim() && !ci.instructions.includes("dopunite")) { n.entry = ci.instructions; got.add("entry"); }
        return n;
      });
      setCopied(got);
    } catch { /* copying is optional */ }
  }

  // ── account (start) ──
  const [acc, setAcc] = useState({ name: "", email: props.initialEmail ?? "", password: "" });
  const [accErr, setAccErr] = useState<"" | "exists" | string>("");
  const [accBusy, setAccBusy] = useState(false);
  const resumePath = `/start?lang=${props.lang}${requestId ? `&req=${requestId}` : ""}`;
  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccErr("");
    setAccBusy(true);
    const { error } = await signUp.email({ name: acc.name.trim(), email: acc.email.trim(), password: acc.password });
    setAccBusy(false);
    if (error) {
      setAccErr(error.code === "USER_ALREADY_EXISTS" || /exist/i.test(error.message ?? "") ? "exists" : (error.message ?? "Error"));
      return;
    }
    setSessionEmail(acc.email.trim());
    next();
  }

  // ── places ──
  const [places, setPlaces] = useState<Record<PlaceCategory, NearbyPlace[]> | null>(null);
  const [placesState, setPlacesState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [cat, setCat] = useState<PlaceCategory>("FOOD");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const placesFor = useRef("");
  useEffect(() => {
    // Listing read → fetch nearby places in the background right away (public OpenStreetMap servers are slow),
    // so they are usually there by the time the owner reaches the step. A changed address fetches again.
    const d = imp?.draft;
    const listingSpot = !!requestId && !!d && (!f.address.trim() || f.address.trim() === d.address);
    if (step !== "places" && !listingSpot) return;
    if (step !== "places" && placesFor.current) return;
    const qs = listingSpot ? `req=${requestId}` : `address=${encodeURIComponent(f.address)}`;
    if (placesFor.current === qs) return;
    placesFor.current = qs;
    setPlacesState("loading");
    fetch(`/api/onboarding/places?${qs}`).then(async (r) => {
      if (!r.ok) throw new Error();
      const j = await r.json() as { places: Record<PlaceCategory, NearbyPlace[]> };
      if (placesFor.current !== qs) return; // a newer address was asked for meanwhile
      setPlaces(j.places);
      // The 3 closest of each kind are ticked to start with
      setPicked(new Set(CATS.flatMap((c) => j.places[c].slice(0, 3).map((p) => p.id))));
      setCat(CATS.find((c) => j.places[c].length) ?? "FOOD");
      setPlacesState("ok");
    }).catch(() => { if (placesFor.current === qs) { placesFor.current = ""; setPlacesState("error"); } });
  }, [step, imp?.draft, f.address, requestId]);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // ── create ──
  const [busy, setBusy] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [result, setResult] = useState<{ id: string; slug: string } | null>(null);
  const [lateFill, setLateFill] = useState(false);
  async function create() {
    setBusy(true);
    setCreateErr("");
    const chosen = places ? CATS.flatMap((c) => places[c].filter((p) => picked.has(p.id))).map(toGuidePlace) : [];
    try {
      const r = await fetch("/api/onboarding/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId ?? undefined,
          name: f.name, address: f.address, checkIn: f.checkIn, checkOut: f.checkOut,
          rules: f.rules.split("\n").map((x) => x.trim()).filter(Boolean),
          wifiNetwork: f.wifiNetwork, wifiPassword: f.wifiPassword, checkInType: f.checkInType, entry: f.entry, phone: f.phone,
          places: chosen,
        }),
      });
      if (!r.ok) throw new Error();
      setResult(await r.json());
      setLateFill(imp?.status === "READING");
      go("done");
    } catch {
      setCreateErr(t.createErr);
    } finally {
      setBusy(false);
    }
  }

  const tag = (k: string) => copied.has(k)
    ? <span className="ml-1.5 rounded bg-orange-tint px-1.5 py-0.5 text-[10.5px] font-semibold text-orange-dark">{t.copied}</span>
    : fromDraft.has(k) ? <span className="ml-1.5 rounded bg-green-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-green-700">{t.fromListing}</span> : null;

  const total = steps.length - 1; // "done" is not a step
  const draft = imp?.draft;

  return (
    <div className="space-y-5">
      {step !== "done" && (
        <div className="space-y-2">
          <div className="flex gap-1">{Array.from({ length: total }, (_, i) => <i key={i} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-orange" : "bg-line"}`} />)}</div>
          <p className="text-xs text-ink-2">{t.stepOf(idx + 1, total)}</p>
        </div>
      )}

      {step === "link" && (
        <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await startImport(link)) next(); }}>
          <div>
            <h1 className="text-2xl font-bold text-ink leading-tight">{t.linkTitle}</h1>
            <p className="mt-1.5 text-sm text-ink-2">{t.linkSub}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-link" className="text-ink">{t.linkLabel}</Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
              <Input id="ob-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder={t.linkPh} className="h-11 pl-9" autoFocus required />
            </div>
            {linkErr && <p className="text-sm text-red-600">{linkErr}</p>}
          </div>
          {isApp && !!props.copySources?.length && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-copy" className="text-ink">Copy contact, house rules and entry from</Label>
              <select id="ob-copy" value={copyFrom} onChange={(e) => applyCopy(e.target.value)} className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink">
                <option value="">Don&apos;t copy</option>
                {props.copySources.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <p className="text-xs text-ink-2">WiFi is never copied, every apartment has its own.</p>
            </div>
          )}
          <button type="submit" disabled={linkBusy || !link.trim()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange font-semibold text-white hover:bg-orange-dark disabled:opacity-60">
            {linkBusy && <Loader2 className="h-4 w-4 animate-spin" />}{t.next}
          </button>
          <button type="button" onClick={() => { setRequestId(null); setImp(null); setF((p) => ({ ...p, checkIn: p.checkIn || "15:00", checkOut: p.checkOut || "11:00" })); next(); }} className="w-full text-center text-sm font-medium text-ink-2 underline underline-offset-4 hover:text-ink">
            {t.linkNone}
          </button>
        </form>
      )}

      {step === "account" && (
        <form className="space-y-4" onSubmit={createAccount}>
          {imp && <ReadingCard imp={imp} t={t} />}
          <h1 className="text-2xl font-bold text-ink leading-tight">{t.accTitle}</h1>
          <Field id="ob-name" label={t.accName}><Input id="ob-name" value={acc.name} onChange={(e) => setAcc({ ...acc, name: e.target.value })} required className="h-11" autoComplete="name" /></Field>
          <Field id="ob-email" label={t.accEmail}><Input id="ob-email" type="email" value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} required className="h-11" autoComplete="email" /></Field>
          <Field id="ob-pass" label={t.accPass}><PasswordInput id="ob-pass" value={acc.password} onChange={(e) => setAcc({ ...acc, password: e.target.value })} required minLength={8} placeholder={t.accPassPh} className="h-11" autoComplete="new-password" /></Field>
          <Field id="ob-phone" label={t.accPhone}><Input id="ob-phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t.accPhonePh} className="h-11" autoComplete="tel" /></Field>
          {accErr && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {accErr === "exists" ? <>{t.accExists} <Link className="font-semibold underline" href={`/login?redirect=${encodeURIComponent(resumePath)}`}>{t.accLogin}</Link></> : accErr}
            </p>
          )}
          <button type="submit" disabled={accBusy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange font-semibold text-white hover:bg-orange-dark disabled:opacity-60">
            {accBusy && <Loader2 className="h-4 w-4 animate-spin" />}{accBusy ? t.accBusy : t.accBtn}
          </button>
          <p className="text-center text-xs text-ink-2">{t.accTerms}</p>
          <p className="text-center text-sm text-ink-2">{t.accHave} <Link className="font-medium text-orange hover:underline" href={`/login?redirect=${encodeURIComponent(resumePath)}`}>{t.accLogin}</Link></p>
        </form>
      )}

      {step === "review" && (
        <ReviewStep t={t} imp={imp} skipped={skipped} onSkipWait={() => setSkipped(true)}>
          <div>
            <h1 className="text-2xl font-bold text-ink leading-tight">{t.revTitle}</h1>
            <p className="mt-1.5 text-sm text-ink-2">{t.revSub}</p>
          </div>
          {draft?.coverImage && (
            <div className="relative h-40 overflow-hidden rounded-2xl bg-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.coverImage} alt="" className="h-full w-full object-cover" />
              {draft.photoCount > 1 && <span className="absolute right-2.5 top-2.5 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-navy">{t.photos(draft.photoCount)}</span>}
            </div>
          )}
          <Field id="ob-n" label={<>{t.revName}{tag("name")}</>}><Input id="ob-n" value={f.name} onChange={(e) => set("name", e.target.value)} required className="h-11" /></Field>
          <Field id="ob-a" label={<>{t.revAddress}{tag("address")}</>}><Input id="ob-a" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder={t.revAddressPh} className="h-11" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ob-ci" label={t.revCheckIn}><Input id="ob-ci" type="time" value={f.checkIn} onChange={(e) => set("checkIn", e.target.value)} className="h-11" /></Field>
            <Field id="ob-co" label={t.revCheckOut}><Input id="ob-co" type="time" value={f.checkOut} onChange={(e) => set("checkOut", e.target.value)} className="h-11" /></Field>
          </div>
          <Field id="ob-r" label={<>{t.revRules}{tag("rules")}</>}><Textarea id="ob-r" value={f.rules} onChange={(e) => set("rules", e.target.value)} placeholder={t.revRulesPh} rows={4} className="min-h-24" /></Field>
          <Nav t={t} onBack={needsAccount ? undefined : back} onNext={next} nextLabel={t.revOk} disabled={!f.name.trim()} />
        </ReviewStep>
      )}

      {step === "wifi" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-ink leading-tight">{t.wifiTitle}</h1>
            <p className="mt-1.5 text-sm text-ink-2">{t.wifiSub}</p>
          </div>
          <Field id="ob-wn" label={t.wifiNet}><Input id="ob-wn" value={f.wifiNetwork} onChange={(e) => set("wifiNetwork", e.target.value)} className="h-11" /></Field>
          <Field id="ob-wp" label={t.wifiPass}><Input id="ob-wp" value={f.wifiPassword} onChange={(e) => set("wifiPassword", e.target.value)} className="h-11" /></Field>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-ink">{t.enterLabel}</p>
            <div className="grid grid-cols-2 gap-2">
              {(["SELF", "PERSONAL"] as const).map((v) => (
                <button key={v} type="button" onClick={() => set("checkInType", v)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium ${f.checkInType === v ? "border-orange bg-orange-tint text-ink" : "border-line text-ink-2 hover:border-ink-2/40"}`}>
                  {v === "SELF" ? t.enterSelf : t.enterPersonal}
                </button>
              ))}
            </div>
          </div>
          <Field id="ob-e" label={<>{t.enterHow}{tag("entry")}</>}><Textarea id="ob-e" value={f.entry} onChange={(e) => set("entry", e.target.value)} placeholder={t.enterHowPh} rows={3} /></Field>
          {(isApp || !needsAccount) && <Field id="ob-ph" label={<>{t.phone}{tag("phone")}</>}><Input id="ob-ph" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t.accPhonePh} className="h-11" /></Field>}
          <Nav t={t} onBack={back} onNext={next} />
          <p className="text-center text-xs text-ink-2">{t.skipLater}</p>
        </div>
      )}

      {step === "places" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-ink leading-tight">{t.recTitle}</h1>
            <p className="mt-1.5 text-sm text-ink-2">{t.recSub(f.address.split(",")[0])}</p>
          </div>
          {placesState === "loading" && <p className="flex items-center gap-2 py-6 text-sm text-ink-2"><Loader2 className="h-4 w-4 animate-spin" />{t.recLoading}</p>}
          {placesState === "error" && <p className="rounded-lg bg-canvas px-3 py-3 text-sm text-ink-2">{t.recErr}</p>}
          {placesState === "ok" && places && (CATS.every((c) => !places[c].length)
            ? <p className="rounded-lg bg-canvas px-3 py-3 text-sm text-ink-2">{t.recNone}</p>
            : <>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {CATS.filter((c) => places[c].length).map((c) => {
                  const n = places[c].filter((p) => picked.has(p.id)).length;
                  return (
                    <button key={c} type="button" onClick={() => setCat(c)}
                      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${cat === c ? "border-navy bg-navy text-white" : "border-line bg-white text-ink"}`}>
                      {t.cats[c]}{n ? ` · ${n}` : ""}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-ink-2">{t.recCount(picked.size)}</p>
              <div className="space-y-2">
                {places[cat].map((p) => {
                  const on = picked.has(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors ${on ? "border-orange bg-orange-tint" : "border-line bg-white hover:border-ink-2/30"}`}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-ink-2"><MapPin className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{p.name}</span>
                        <span className="block truncate text-xs text-ink-2">
                          {p.kind} · {t.walk(p.distance)}{p.rating ? <> · <Star className="inline h-3 w-3 -translate-y-px fill-current" /> {p.rating.toFixed(1)}</> : null}
                        </span>
                      </span>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 ${on ? "border-orange bg-orange text-white" : "border-line"}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                    </button>
                  );
                })}
              </div>
            </>)}
          {createErr && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createErr}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={back} className="h-12 rounded-xl border border-line px-5 text-sm font-semibold text-ink hover:bg-canvas">{t.back}</button>
            <button type="button" onClick={create} disabled={busy} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-orange font-semibold text-white hover:bg-orange-dark disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? t.creating : t.create}
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && <Done t={t} result={result} sessionEmail={isApp ? null : sessionEmail} lateFill={lateFill} />}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id} className="text-ink">{label}</Label>{children}</div>;
}

function Nav({ t, onBack, onNext, nextLabel, disabled }: { t: typeof STRINGS.bs; onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-1">
      {onBack && <button type="button" onClick={onBack} className="h-12 rounded-xl border border-line px-5 text-sm font-semibold text-ink hover:bg-canvas">{t.back}</button>}
      <button type="button" onClick={onNext} disabled={disabled} className="h-12 flex-1 rounded-xl bg-orange font-semibold text-white hover:bg-orange-dark disabled:opacity-60">{nextLabel ?? t.next}</button>
    </div>
  );
}

/** Live checklist while the listing is read (ticks advance on a timer, the last one waits for the result) */
function ReadingCard({ imp, t }: { imp: Import; t: typeof STRINGS.bs }) {
  const [k, setK] = useState(0);
  const n = t.reading.length;
  useEffect(() => {
    if (imp.status !== "READING") return;
    const h = setInterval(() => setK((x) => Math.min(x + 1, n - 1)), 1600);
    return () => clearInterval(h);
  }, [imp.status, n]);
  if (imp.status === "FAILED") return <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">{t.readFailed}</p>;
  const done = imp.status === "READY" ? n : k;
  return (
    <div className="space-y-1.5 rounded-xl bg-canvas px-3.5 py-3">
      {t.reading.map((label, i) => (
        <div key={label} className="flex items-center gap-2 text-[13px] text-ink-2">
          {i < done ? <span className="grid h-4 w-4 place-items-center rounded-full bg-green-600 text-white"><Check className="h-3 w-3" /></span>
            : i === done ? <Loader2 className="h-4 w-4 animate-spin text-orange" /> : <span className="h-4 w-4 rounded-full border-2 border-line" />}
          {label}
        </div>
      ))}
      {imp.status === "READING" && imp.slow && <p className="pt-1 text-xs text-ink-2">{t.readingSlow}</p>}
    </div>
  );
}

/** Review waits for the listing; Booking can be slow, so the owner may continue and we fill it in later */
function ReviewStep({ t, imp, skipped, onSkipWait, children }: { t: typeof STRINGS.bs; imp: Import | null; skipped: boolean; onSkipWait: () => void; children: React.ReactNode }) {
  const [canSkip, setCanSkip] = useState(false);
  useEffect(() => {
    const h = setTimeout(() => setCanSkip(true), 15_000);
    return () => clearTimeout(h);
  }, []);
  if (imp?.status === "READING" && skipped) {
    return <div className="space-y-4"><p className="rounded-xl bg-canvas px-3.5 py-3 text-sm text-ink-2">{t.readingSlow}</p>{children}</div>;
  }
  if (imp?.status === "READING") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-ink leading-tight">{t.revWait}</h1>
        <ReadingCard imp={imp} t={t} />
        {(imp.slow || canSkip) && (
          <button type="button" onClick={onSkipWait} className="h-12 w-full rounded-xl border border-line font-semibold text-ink hover:bg-canvas">{t.revSkip}</button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {imp?.status === "FAILED" && <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800">{t.readFailed}</p>}
      {children}
    </div>
  );
}

function Done({ t, result, sessionEmail, lateFill }: { t: typeof STRINGS.bs; result: { id: string; slug: string }; sessionEmail: string | null; lateFill: boolean }) {
  const url = `${window.location.origin}/g/${result.slug}/preview`;
  const [copiedOk, setCopiedOk] = useState(false);
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-700"><Check className="h-8 w-8" /></div>
      <div>
        <h1 className="text-2xl font-bold text-ink">{t.doneTitle}</h1>
        <p className="mt-1.5 text-sm text-ink-2">{t.doneSub}</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-line px-3 py-2.5 text-left">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" className="flex items-center gap-1 text-sm font-semibold text-orange"
          onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopiedOk(true); setTimeout(() => setCopiedOk(false), 2000); }).catch(() => {})}>
          <Copy className="h-3.5 w-3.5" />{copiedOk ? t.copiedOk : t.copy}
        </button>
      </div>
      <div className="flex justify-center"><QRCodeCanvas value={url} size={140} fgColor="#0F2F61" /></div>
      <div className="space-y-2.5">
        <a href={url} target="_blank" rel="noopener" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange font-semibold text-white hover:bg-orange-dark"><ExternalLink className="h-4 w-4" />{t.view}</a>
        <Link href={`/dashboard/properties/${result.id}`} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-line font-semibold text-ink hover:bg-canvas"><Pencil className="h-4 w-4" />{t.edit}</Link>
      </div>
      {lateFill && <p className="text-xs text-ink-2">{t.doneLate}</p>}
      {sessionEmail && <p className="text-xs text-ink-2">{t.doneNote(sessionEmail)}</p>}
    </div>
  );
}
