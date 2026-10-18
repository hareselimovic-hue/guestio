"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { COUNTRY_CODES } from "@/lib/countries";

type Lang = "EN" | "BS";

interface GuestInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: "" | "M" | "F";
  citizenship: string;
  placeOfBirth: string;
  documentType: "" | "PASSPORT" | "ID_CARD";
  documentNumber: string;
  documentExpiry: string;
}

const EMPTY_GUEST: GuestInput = {
  firstName: "", lastName: "", dateOfBirth: "", sex: "", citizenship: "",
  placeOfBirth: "", documentType: "", documentNumber: "", documentExpiry: "",
};

export const REGISTRATION_SENT_KEY = (slug: string) => `smartstay_reg_sent_${slug}`;

const T = {
  EN: {
    title: "Guest registration",
    intro: "Local regulations require us to register every guest. Please fill in the details for all guests exactly as written in their travel document.",
    stay: "Your stay",
    checkIn: "Arrival date",
    checkOut: "Departure date",
    guest: "Guest",
    firstName: "First name",
    lastName: "Last name",
    dateOfBirth: "Date of birth",
    sex: "Sex",
    male: "Male",
    female: "Female",
    citizenship: "Citizenship",
    placeOfBirth: "Place of birth",
    documentType: "Travel document type",
    passport: "Passport",
    idCard: "ID card",
    documentNumber: "Document number",
    documentExpiry: "Document valid until",
    select: "Select…",
    addGuest: "Add another guest",
    remove: "Remove",
    submit: "Send registration",
    sending: "Sending…",
    privacy: "Your data is stored securely and is visible only to your host.",
    errRequired: "Please fill in all fields.",
    errDates: "Departure date must be after arrival date.",
    errServer: "Something went wrong. Please try again.",
    doneTitle: "Thank you, registration sent!",
    doneBody: "Your host has received your details. Enjoy your stay!",
    back: "Back to the guide",
  },
  BS: {
    title: "Prijava gostiju",
    intro: "Propisi nalažu da prijavimo svakog gosta. Molimo unesite podatke za sve goste tačno kako piše u putnoj ispravi.",
    stay: "Vaš boravak",
    checkIn: "Datum dolaska",
    checkOut: "Datum odlaska",
    guest: "Gost",
    firstName: "Ime",
    lastName: "Prezime",
    dateOfBirth: "Datum rođenja",
    sex: "Spol",
    male: "Muški",
    female: "Ženski",
    citizenship: "Državljanstvo",
    placeOfBirth: "Mjesto rođenja",
    documentType: "Vrsta putne isprave",
    passport: "Pasoš",
    idCard: "Lična karta",
    documentNumber: "Broj putne isprave",
    documentExpiry: "Rok važenja putne isprave",
    select: "Odaberite…",
    addGuest: "Dodaj još jednog gosta",
    remove: "Ukloni",
    submit: "Pošalji prijavu",
    sending: "Šaljem…",
    privacy: "Vaši podaci se čuvaju sigurno i vidljivi su samo vašem domaćinu.",
    errRequired: "Molimo popunite sva polja.",
    errDates: "Datum odlaska mora biti nakon datuma dolaska.",
    errServer: "Došlo je do greške. Pokušajte ponovo.",
    doneTitle: "Hvala, prijava je poslana!",
    doneBody: "Vaš domaćin je primio podatke. Ugodan boravak!",
    back: "Nazad na vodič",
  },
} as const;

const inputCls =
  "w-full rounded-xl border border-[#EDEDE9] bg-white px-3.5 py-3 text-[16px] text-[#262626] outline-none transition-colors focus:border-[#0F2F61] focus:ring-2 focus:ring-[#0F2F61]/10";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">{label}</span>
      {children}
    </label>
  );
}

export default function GuestRegistrationForm({
  propertyName, slug, backHref,
}: { propertyName: string; slug: string; backHref: string }) {
  const [lang, setLang] = useState<Lang>("EN");
  const t = T[lang];
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestInput[]>([{ ...EMPTY_GUEST }]);
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const countries = useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try { names = new Intl.DisplayNames([lang === "BS" ? "bs" : "en"], { type: "region" }); } catch {}
    return COUNTRY_CODES
      .map((code) => ({ code, name: names?.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [lang]);

  function updateGuest(i: number, field: keyof GuestInput, value: string) {
    setGuests((prev) => prev.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const incomplete = !checkIn || !checkOut || guests.some((g) => Object.values(g).some((v) => !v.trim()));
    if (incomplete) return setError(t.errRequired);
    if (checkOut <= checkIn) return setError(t.errDates);

    setSending(true);
    try {
      const res = await fetch("/api/guest-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, checkIn, checkOut, guests, website }),
      });
      if (!res.ok) throw new Error();
      try { localStorage.setItem(REGISTRATION_SENT_KEY(slug), checkOut); } catch {}
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch {
      setError(t.errServer);
    } finally {
      setSending(false);
    }
  }

  const header = (
    <div className="bg-[#0F2F61] px-4 pb-8 pt-5 text-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <a href={backHref} className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </a>
        <div className="flex overflow-hidden rounded-full border border-white/30 text-xs font-semibold">
          {(["EN", "BS"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 transition-colors ${lang === l ? "bg-white text-[#0F2F61]" : "text-white/80"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-2xl">
        <div className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">{propertyName}</div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>{t.title}</h1>
        {!done && <p className="mt-2 text-sm leading-relaxed text-white/75">{t.intro}</p>}
      </div>
    </div>
  );

  if (done) {
    return (
      <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {header}
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-[#EDEDE9] bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-600" />
            <h2 className="text-xl font-bold text-[#262626]">{t.doneTitle}</h2>
            <p className="mt-2 text-sm text-[#6B6B6B]">{t.doneBody}</p>
            <a
              href={backHref}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FF6700] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#e05c00]"
            >
              <ArrowLeft className="h-4 w-4" /> {t.back}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {header}
      <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {/* Honeypot — hidden from humans */}
        <input
          type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        {/* Stay dates */}
        <div className="rounded-2xl border border-[#EDEDE9] bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-[#262626]">{t.stay}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.checkIn}>
              <input type="date" className={inputCls} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </Field>
            <Field label={t.checkOut}>
              <input type="date" className={inputCls} value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Guests */}
        {guests.map((g, i) => (
          <div key={i} className="rounded-2xl border border-[#EDEDE9] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-[#262626]">{t.guest} {i + 1}</h2>
              {guests.length > 1 && (
                <button
                  type="button"
                  onClick={() => setGuests((prev) => prev.filter((_, idx) => idx !== i))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t.remove}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t.firstName}>
                <input className={inputCls} value={g.firstName} autoComplete="given-name" onChange={(e) => updateGuest(i, "firstName", e.target.value)} />
              </Field>
              <Field label={t.lastName}>
                <input className={inputCls} value={g.lastName} autoComplete="family-name" onChange={(e) => updateGuest(i, "lastName", e.target.value)} />
              </Field>
              <Field label={t.dateOfBirth}>
                <input type="date" className={inputCls} value={g.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => updateGuest(i, "dateOfBirth", e.target.value)} />
              </Field>
              <Field label={t.sex}>
                <select className={inputCls} value={g.sex} onChange={(e) => updateGuest(i, "sex", e.target.value)}>
                  <option value="">{t.select}</option>
                  <option value="M">{t.male}</option>
                  <option value="F">{t.female}</option>
                </select>
              </Field>
              <Field label={t.citizenship}>
                <select className={inputCls} value={g.citizenship} onChange={(e) => updateGuest(i, "citizenship", e.target.value)}>
                  <option value="">{t.select}</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label={t.placeOfBirth}>
                <input className={inputCls} value={g.placeOfBirth} onChange={(e) => updateGuest(i, "placeOfBirth", e.target.value)} />
              </Field>
              <Field label={t.documentType}>
                <select className={inputCls} value={g.documentType} onChange={(e) => updateGuest(i, "documentType", e.target.value)}>
                  <option value="">{t.select}</option>
                  <option value="PASSPORT">{t.passport}</option>
                  <option value="ID_CARD">{t.idCard}</option>
                </select>
              </Field>
              <Field label={t.documentNumber}>
                <input className={inputCls} value={g.documentNumber} autoCapitalize="characters" onChange={(e) => updateGuest(i, "documentNumber", e.target.value)} />
              </Field>
              <Field label={t.documentExpiry}>
                <input type="date" className={inputCls} value={g.documentExpiry} onChange={(e) => updateGuest(i, "documentExpiry", e.target.value)} />
              </Field>
            </div>
          </div>
        ))}

        {guests.length < 20 && (
          <button
            type="button"
            onClick={() => setGuests((prev) => [...prev, { ...EMPTY_GUEST }])}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D5D5CF] py-4 text-sm font-semibold text-[#0F2F61] transition-colors hover:border-[#0F2F61] hover:bg-white"
          >
            <Plus className="h-4 w-4" /> {t.addGuest}
          </button>
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FF6700] py-4 font-semibold text-white shadow-lg transition-colors hover:bg-[#e05c00] disabled:opacity-60"
          style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          {sending ? t.sending : t.submit}
        </button>

        <p className="flex items-center justify-center gap-1.5 pb-6 text-center text-xs text-[#6B6B6B]">
          <ShieldCheck className="h-3.5 w-3.5" /> {t.privacy}
        </p>
      </form>
    </div>
  );
}
