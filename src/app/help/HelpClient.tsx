"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, MessageCircle, Globe, Lock, Lightbulb, LayoutGrid, Link2, BarChart2, Plug, ChevronRight, Eye, EyeOff, ArrowLeft } from "lucide-react";

type Tab = "ai" | "sections" | "links" | "analytics" | "rentlio";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "ai",        label: "AI Asistent",    icon: <MessageCircle className="w-4 h-4" /> },
  { id: "sections",  label: "Sekcije",        icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "links",     label: "Guest linkovi",  icon: <Link2 className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics",      icon: <BarChart2 className="w-4 h-4" /> },
  { id: "rentlio",   label: "Rentlio",        icon: <Plug className="w-4 h-4" /> },
];

export default function HelpClient() {
  const [active, setActive] = useState<Tab>("ai");

  return (
    <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>

      {/* Header */}
      <div className="bg-[#0F2F61] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-6 pb-0">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[#8ba3c7] hover:text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Nazad na Dashboard
          </Link>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <p className="text-[#8ba3c7] text-sm font-medium uppercase tracking-wide mb-2">Pomoć i upute</p>
          <h1 className="text-3xl sm:text-4xl font-bold">Kako koristiti SmartStay</h1>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 sm:px-8">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                  active === tab.id
                    ? "border-[#FF6700] text-white"
                    : "border-transparent text-[#8ba3c7] hover:text-white"
                }`}
              >
                {tab.icon}
                <span className="leading-tight text-center">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-6">
        {active === "ai"        && <TabAI />}
        {active === "sections"  && <TabSections />}
        {active === "links"     && <TabLinks />}
        {active === "analytics" && <TabAnalytics />}
        {active === "rentlio"   && <TabRentlio />}
      </div>
    </div>
  );
}

/* ─── TAB: AI ASISTENT ─────────────────────────────────────────────────────── */
function TabAI() {
  return (
    <>
      <Card>
        <SectionHeading icon={<MessageCircle className="w-5 h-5" />} color="bg-[#FF6700]">
          Šta je AI Asistent?
        </SectionHeading>
        <p className="text-[#6B6B6B] leading-relaxed mb-3">
          AI Asistent je chat dugme koje se pojavljuje na stranici vašeg guest guidebooka. Gosti postavljaju pitanja
          prirodnim jezikom i dobijaju trenutne odgovore — bez pozivanja ili poruka vama.
        </p>
        <p className="text-[#6B6B6B] leading-relaxed">
          AI odgovara <strong className="text-[#262626]">isključivo na osnovu informacija koje ste vi unijeli</strong> u
          guidebook. Ne izmišlja — ako nešto ne zna, kaže gostu da kontaktira vas direktno.
        </p>

        {/* Chat mockup */}
        <div className="mt-5 flex justify-center">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-lg border border-[#EDEDE9] overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEDE9]">
              <div className="w-7 h-7 bg-[#FF6700] rounded-full flex items-center justify-center shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-xs text-[#262626]">AI Asistent</p>
                <p className="text-[10px] text-[#9B9B9B]">Powered by AI · odgovara odmah</p>
              </div>
            </div>
            <div className="px-3 py-3 bg-[#F7F7F5] space-y-2">
              <div className="flex justify-end">
                <div className="bg-[#FF6700] text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[75%]">
                  Koja je WiFi lozinka?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white text-[#262626] text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[82%] border border-[#EDEDE9] shadow-sm">
                  Mreža je <strong>Apartment_5G</strong>, lozinka <strong>Welcome2024!</strong> 🔑
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-[#FF6700] text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[75%]">
                  Wann ist der Check-out?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white text-[#262626] text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[82%] border border-[#EDEDE9] shadow-sm">
                  Check-out ist bis <strong>11:00 Uhr</strong>. ✅
                </div>
              </div>
            </div>
            <div className="px-3 py-2.5 border-t border-[#EDEDE9] bg-white flex gap-2 items-center">
              <div className="flex-1 bg-[#F7F7F5] rounded-lg px-3 py-1.5 text-[10px] text-[#9B9B9B]">Upiši pitanje...</div>
              <div className="w-7 h-7 bg-[#FF6700] rounded-lg flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading icon={<Globe className="w-5 h-5" />} color="bg-green-600">
          Podržani jezici
        </SectionHeading>
        <p className="text-[#6B6B6B] text-sm leading-relaxed mb-4">
          AI automatski prepoznaje jezik gosta i odgovara na istom jeziku. Prijedlozi pitanja dostupni su na 4 jezika, no AI razumije i ostale.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[{ flag: "🇬🇧", lang: "Engleski" }, { flag: "🇩🇪", lang: "Njemački" }, { flag: "🇹🇷", lang: "Turski" }, { flag: "🇮🇹", lang: "Talijanski" }].map(({ flag, lang }) => (
            <div key={lang} className="bg-[#F7F7F5] rounded-xl p-3 text-center border border-[#EDEDE9]">
              <div className="text-2xl mb-1">{flag}</div>
              <p className="text-sm font-medium text-[#262626]">{lang}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[#262626] text-lg mb-2">AI Context — skrivena sekcija</h2>
            <p className="text-[#6B6B6B] text-sm leading-relaxed mb-4">
              U editoru postoji <strong className="text-[#262626]">AI Context</strong> dugme (ljubičasto, opcionalno).
              Kreira sekciju nevidljivu gostima, ali AI je čita i koristi za preciznije odgovore.
            </p>
            <div className="bg-white rounded-xl border border-violet-100 overflow-hidden mb-4">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEDE9]">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <span className="text-sm font-medium text-[#262626]">AI Context</span>
                <span className="ml-auto text-xs text-violet-400">optional</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-[#6B6B6B] leading-relaxed">Ključ je u kutijici iza aparata za kafu. Bazen radi 08–22h, pristup bijelom karticom. Najbliža apoteka je 2 min hoda, lijevo od ulaza...</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {["Ključ je u kutijici iza aparata za kafu", "Bazen radi od 08:00 do 22:00, pristup karticom", "Najbliža apoteka: 2 minute hoda, lijevo od ulaza", "Za hitne slučajeve, portir je dostupan 24/7"].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                  <span className="text-violet-500 mt-0.5 shrink-0">•</span>{tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Card>
        <SectionHeading icon={<Lightbulb className="w-5 h-5" />} color="bg-amber-500">
          Savjeti za bolje odgovore
        </SectionHeading>
        <ul className="space-y-2.5">
          {[
            "Popunite što više sekcija — više informacija znači preciznije odgovore.",
            "Koristite AI Context za specifičnosti apartmana koje ne staju u standardne sekcije.",
            "Budite konkretni — umjesto \"ujutro\", napišite \"do 11:00\".",
            "Dodajte lokalne preporuke s opisima — AI može predlagati restorane, apoteke, atrakcije.",
            "AI odgovara kratko (2–4 rečenice) — ako nešto ne zna, kaže i upućuje na vas.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B] list-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />{item}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ─── TAB: SEKCIJE ─────────────────────────────────────────────────────────── */
function TabSections() {
  const sections = [
    { emoji: "👋", name: "Dobrodošlica", desc: "Hero slika, poruka dobrodošlice, ime hosta i CTA dugme. Prva stvar koju gost vidi." },
    { emoji: "📶", name: "WiFi", desc: "Naziv mreže, lozinka i opciona napomena (npr. 2.4GHz za smart TV)." },
    { emoji: "🗝️", name: "Check-in / Check-out", desc: "Vremena, upute za dolazak i odlazak, opciono foto i video instrukcije za self check-in." },
    { emoji: "📋", name: "Kućni red", desc: "Lista pravila koja gost treba poštivati tokom boravka." },
    { emoji: "📍", name: "Lokacija", desc: "Adresa, Google Maps link i upute kako doći (od aerodroma, centra...)." },
    { emoji: "⭐", name: "Lokalne preporuke", desc: "Restorani, kafići, atrakcije — svako mjesto ima naziv, kategoriju, opis i opcioni link." },
    { emoji: "📞", name: "Kontakt", desc: "Broj telefona hosta. Gost dobija dugmad za poziv, Viber i WhatsApp." },
    { emoji: "🚗", name: "Parking", desc: "Dostupnost, tip (garaža/ulica/lot), cijena i napomene." },
    { emoji: "✏️", name: "Custom sekcija", desc: "Slobodna sekcija s naslovom, opisom, stavkama s linkovima i do 3 fotografije." },
    { emoji: "🧠", name: "AI Context", desc: "Skrivena od gostiju — samo za AI asistenta. Detalji u tabu AI Asistent." },
  ];

  return (
    <>
      <Card>
        <SectionHeading icon={<LayoutGrid className="w-5 h-5" />} color="bg-[#0F2F61]">
          Tipovi sekcija
        </SectionHeading>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          Svaki apartman ima set sekcija koje popunjavate. Sekcije možete sakriti (oko ikona) ili obrisati (samo Custom i AI Context).
        </p>
        <div className="space-y-3 mt-2">
          {sections.map(({ emoji, name, desc }) => (
            <div key={name} className="flex items-start gap-3 p-3 bg-[#F7F7F5] rounded-xl border border-[#EDEDE9]">
              <span className="text-xl shrink-0 mt-0.5">{emoji}</span>
              <div>
                <p className="font-semibold text-sm text-[#262626]">{name}</p>
                <p className="text-xs text-[#6B6B6B] leading-relaxed mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={<EyeOff className="w-5 h-5" />} color="bg-slate-500">
          Vidljivost sekcija
        </SectionHeading>
        <div className="space-y-3 text-sm text-[#6B6B6B]">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#F7F7F5] border border-[#EDEDE9] flex items-center justify-center shrink-0 mt-0.5">
              <Eye className="w-3.5 h-3.5 text-[#6B6B6B]" />
            </div>
            <p><strong className="text-[#262626]">Vidljivo</strong> — sekcija se prikazuje gostu na guidebooku.</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#F7F7F5] border border-[#EDEDE9] flex items-center justify-center shrink-0 mt-0.5">
              <EyeOff className="w-3.5 h-3.5 text-[#6B6B6B]" />
            </div>
            <p><strong className="text-[#262626]">Skriveno</strong> — sekcija postoji u editoru ali gost je ne vidi, niti je AI koristi.</p>
          </div>
        </div>
        <p className="text-xs text-[#9B9B9B] mt-2">
          Klik na oko ikonu u headeru sekcije mijenja vidljivost. Ne zaboravite sačuvati.
        </p>
      </Card>

      <Card>
        <SectionHeading icon={<Lightbulb className="w-5 h-5" />} color="bg-amber-500">
          Savjeti
        </SectionHeading>
        <ul className="space-y-2.5">
          {[
            "Popunite barem WiFi, Check-in i Kontakt — to su pitanja koja gosti najčešće imaju.",
            "Narandžasta tačka na sekciji znači da imate nesačuvane izmjene.",
            "Prevodi se generišu automatski pri svakom čuvanju — gosti koji koriste drugi jezik vidjet će prevedeni sadržaj.",
            "Custom sekcija je odlična za mašinu za veš, roštilj, pristup balkonu, bazen...",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B] list-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />{item}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ─── TAB: GUEST LINKOVI ───────────────────────────────────────────────────── */
function TabLinks() {
  return (
    <>
      <Card>
        <SectionHeading icon={<Link2 className="w-5 h-5" />} color="bg-[#FF6700]">
          Link koji šaljete gostima
        </SectionHeading>
        <p className="text-[#6B6B6B] text-sm leading-relaxed mb-4">
          Svaki apartman ima <strong className="text-[#262626]">guest link</strong> — to je link koji šaljete gostima.
          Sadrži kompletan guidebook: WiFi, check-in, pravila, preporuke i sve ostalo što ste unijeli.
        </p>
        <div className="bg-[#F7F7F5] rounded-xl border border-[#EDEDE9] p-4 font-mono text-xs text-[#6B6B6B] break-all">
          app.smartstay.ba/g/<span className="text-[#FF6700]">naziv-apartmana</span>/preview
        </div>
      </Card>

      <Card>
        <SectionHeading icon={<ChevronRight className="w-5 h-5" />} color="bg-[#0F2F61]">
          Kako pronaći i podijeliti link?
        </SectionHeading>
        <ol className="space-y-4">
          {[
            "Otvorite apartman iz dashboarda.",
            "Na vrhu stranice kliknite dugme Share (ikona dijeljenja).",
            "Kopirajte guest link i pošaljite gostu — WhatsApp, email, SMS.",
            "Opciono: preuzmite QR kod koji gost može skenirati.",
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-4 list-none">
              <span className="w-7 h-7 rounded-full bg-[#0F2F61] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-[#6B6B6B] text-sm leading-relaxed pt-1">{text}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <SectionHeading icon={<Lightbulb className="w-5 h-5" />} color="bg-amber-500">
          Savjeti
        </SectionHeading>
        <ul className="space-y-2.5">
          {[
            "Pošaljite link dan-dva prije dolaska — gost ima vremena da pročita upute.",
            "QR kod možete odštampati i ostaviti u apartmanu za buduće goste.",
            "Link je uvijek ažuran — ako izmijenite sadržaj, gost odmah vidi novu verziju.",
            "Isti link možete koristiti za sve goste u tom apartmanu.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B] list-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />{item}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ─── TAB: ANALYTICS ───────────────────────────────────────────────────────── */
function TabAnalytics() {
  return (
    <>
      <Card>
        <SectionHeading icon={<BarChart2 className="w-5 h-5" />} color="bg-[#0F2F61]">
          Šta se mjeri?
        </SectionHeading>
        <div className="space-y-3">
          {[
            { label: "Otvaranja guidebooka", desc: "Svaki put kad gost otvori link, broji se jedno otvaranje. Vidite ukupan broj i posljednje otvaranje po apartmanu.", color: "bg-[#FF6700]" },
            { label: "AI chat poruke", desc: "Koliko puta je AI asistent odgovorio na pitanje gosta. Pratite po apartmanu i ukupno.", color: "bg-violet-500" },
            { label: "Preview otvaranja", desc: "Koliko puta ste vi testirali guidebook putem preview linka.", color: "bg-amber-400" },
            { label: "Guest link pregled", desc: "Za svaki pravi guest link vidite ime gosta, broj otvaranja i datum zadnjeg otvaranja.", color: "bg-green-500" },
          ].map(({ label, desc, color }) => (
            <div key={label} className="flex items-start gap-3 p-3 bg-[#F7F7F5] rounded-xl border border-[#EDEDE9]">
              <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0 mt-1.5`} />
              <div>
                <p className="font-semibold text-sm text-[#262626]">{label}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={<Eye className="w-5 h-5" />} color="bg-[#FF6700]">
          Zadnja otvaranja (feed)
        </SectionHeading>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          Na dnu analytics stranice nalazi se feed zadnjih 50 otvaranja — po apartmanu, imenu gosta i vremenu.
          Idealno za provjeru je li gost otvorio link prije dolaska.
        </p>
      </Card>

      <Card>
        <SectionHeading icon={<Lightbulb className="w-5 h-5" />} color="bg-amber-500">
          Savjeti
        </SectionHeading>
        <ul className="space-y-2.5">
          {[
            "Ako gost nije otvorio link dan prije dolaska — pošaljite podsjetnik.",
            "Visok AI chat count znači da gosti imaju pitanja koja možda vrijedi dodati direktno u guidebook.",
            "Preview otvaranja se broje odvojeno — ne miješaju se sa stvarnim gostima.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B] list-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />{item}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ─── TAB: RENTLIO ─────────────────────────────────────────────────────────── */
function TabRentlio() {
  return (
    <>
      <Card>
        <SectionHeading icon={<Plug className="w-5 h-5" />} color="bg-[#0F2F61]">
          Šta je Rentlio integracija?
        </SectionHeading>
        <p className="text-[#6B6B6B] text-sm leading-relaxed mb-3">
          Rentlio je property management sistem koji mnogi iznajmljivači koriste za upravljanje rezervacijama.
          SmartStay se može povezati s Rentliom kako bi automatski sinhronizovao vaše apartmane —
          bez ručnog kreiranja svakog posebno.
        </p>
        <p className="text-[#6B6B6B] text-sm leading-relaxed">
          Integracija je dostupna vlasnicima workspacea u <strong className="text-[#262626]">Settings → Rentlio</strong>.
        </p>
      </Card>

      <Card>
        <SectionHeading icon={<ChevronRight className="w-5 h-5" />} color="bg-[#FF6700]">
          Kako povezati Rentlio?
        </SectionHeading>
        <ol className="space-y-4">
          {[
            { step: "1", title: "Dohvatite API ključ iz Rentlia", desc: "Prijavite se u Rentlio → Settings → API → kopirajte API ključ." },
            { step: "2", title: "Otvorite SmartStay Settings", desc: "Dashboard → Settings → sekcija Rentlio integracija." },
            { step: "3", title: "Unesite API ključ", desc: "Zalijepite ključ u polje i kliknite Poveži. Status će se promijeniti u Povezano." },
            { step: "4", title: "Pokrenite sync preview", desc: "Kliknite Provjeri Rentlio apartmane da vidite listu — SmartStay pokazuje koje apartmane pronalazi i kako ih planira mapirati." },
            { step: "5", title: "Pokrenite sync", desc: "Kliknite Sinhronizuj. Novi apartmani se kreiraju, postojeći se povezuju po imenu." },
          ].map(({ step, title, desc }) => (
            <li key={step} className="flex items-start gap-4 list-none">
              <span className="w-7 h-7 rounded-full bg-[#FF6700] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </span>
              <div>
                <p className="font-semibold text-sm text-[#262626]">{title}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <SectionHeading icon={<BarChart2 className="w-5 h-5" />} color="bg-slate-500">
          Statusi pri syncu
        </SectionHeading>
        <div className="space-y-3">
          {[
            { status: "Linked", color: "bg-green-500", desc: "Apartman je već povezan po Rentlio ID-u — sync ga ažurira." },
            { status: "Matchable", color: "bg-amber-400", desc: "Ime se podudara s postojećim apartmanom u SmartStay — sync ih povezuje." },
            { status: "New", color: "bg-blue-500", desc: "Novi apartman iz Rentlia — sync ga kreira u SmartStay." },
          ].map(({ status, color, desc }) => (
            <div key={status} className="flex items-start gap-3 p-3 bg-[#F7F7F5] rounded-xl border border-[#EDEDE9]">
              <span className={`w-2.5 h-2.5 rounded-full ${color} shrink-0 mt-1.5`} />
              <div>
                <p className="font-semibold text-sm text-[#262626]">{status}</p>
                <p className="text-xs text-[#6B6B6B] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={<Lightbulb className="w-5 h-5" />} color="bg-amber-500">
          Savjeti
        </SectionHeading>
        <ul className="space-y-2.5">
          {[
            "Sync kreira apartmane ali ne popunjava sekcije — to radite ručno.",
            "Pokrenite Preview sync prije pravog synca da vidite šta će se desiti.",
            "API ključ možete u svakom trenutku ukloniti iz Settings-a.",
            "Sync možete pokrenuti više puta — već povezani apartmani se samo ažuriraju, ne dupliciraju.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B] list-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />{item}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

/* ─── Shared components ────────────────────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDEDE9] p-6 space-y-4">
      {children}
    </div>
  );
}

function SectionHeading({ children, icon, color }: { children: React.ReactNode; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0 text-white`}>
        {icon}
      </div>
      <h2 className="font-bold text-[#262626] text-lg">{children}</h2>
    </div>
  );
}
