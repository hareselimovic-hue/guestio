import { Brain, MessageCircle, Globe, Lock, Lightbulb, ChevronRight } from "lucide-react";

export const metadata = {
  title: "AI Asistent za goste — Pomoć | SmartStay",
  description: "Saznajte kako postaviti i koristiti AI asistenta na vašem SmartStay guidebooku.",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>

      {/* Header */}
      <div className="bg-[#0F2F61] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FF6700] rounded-xl flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#8ba3c7] text-sm font-medium uppercase tracking-wide">Pomoć i upute</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">AI Asistent za goste</h1>
          <p className="text-[#8ba3c7] text-lg leading-relaxed max-w-xl">
            Sve što trebate znati o postavljanju i korištenju AI chatbota na vašem guest guidebooku.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 space-y-8">

        {/* What is it */}
        <Card>
          <SectionHeading icon={<MessageCircle className="w-5 h-5" />} color="bg-[#FF6700]">
            Šta je AI Asistent?
          </SectionHeading>
          <p className="text-[#6B6B6B] leading-relaxed mb-4">
            AI Asistent je chat dugme koje se pojavljuje na stranici vašeg guest guidebooka. Gosti mogu postavljati
            pitanja prirodnim jezikom i dobivati trenutne odgovore — bez pozivanja ili poruka vama.
          </p>
          <p className="text-[#6B6B6B] leading-relaxed">
            AI odgovara <strong className="text-[#262626]">isključivo na osnovu informacija koje ste vi unijeli</strong> u
            guidebook (WiFi, check-in, parking, pravila itd.). Ne izmišlja — ako nešto ne zna,
            kaže gostu da kontaktira vas direktno.
          </p>

          {/* Chat mockup */}
          <div className="mt-6 flex justify-center">
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
                  <div className="bg-white text-[#262626] text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[80%] border border-[#EDEDE9] shadow-sm">
                    Mreža je <strong>Apartment_5G</strong>, lozinka je <strong>Welcome2024!</strong> 🔑
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#FF6700] text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[75%]">
                    Wann ist der Check-out?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-white text-[#262626] text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[80%] border border-[#EDEDE9] shadow-sm">
                    Der Check-out ist bis <strong>11:00 Uhr</strong>. ✅
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

        {/* How guests use it */}
        <Card>
          <SectionHeading icon={<ChevronRight className="w-5 h-5" />} color="bg-[#0F2F61]">
            Kako gosti koriste asistenta?
          </SectionHeading>
          <ol className="space-y-4">
            {[
              "Gost otvori personalizovani link svog guidebooka.",
              "U donjem desnom uglu pojavi se narandžasto chat dugme.",
              "Gost tap-ne i upiše pitanje — na bilo kom jeziku.",
              "AI odgovori odmah, tekst se ispisuje u realnom vremenu.",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-[#FF6700] text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[#6B6B6B] leading-relaxed pt-0.5">{text}</p>
              </li>
            ))}
          </ol>

          {/* Bubble mockup */}
          <div className="mt-6 relative bg-[#F7F7F5] rounded-xl border border-[#EDEDE9] h-24 overflow-hidden">
            <p className="text-xs text-[#BABAB5] absolute top-3 left-4">Guest guidebook stranica...</p>
            <div className="absolute bottom-4 right-4 w-12 h-12 bg-[#FF6700] rounded-full shadow-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-16 right-3 bg-white rounded-xl shadow-lg border border-[#EDEDE9] px-3 py-2 text-xs text-[#262626] whitespace-nowrap">
              Imam pitanje 💬
            </div>
          </div>
        </Card>

        {/* Languages */}
        <Card>
          <SectionHeading icon={<Globe className="w-5 h-5" />} color="bg-green-600">
            Podržani jezici
          </SectionHeading>
          <p className="text-[#6B6B6B] leading-relaxed mb-4">
            AI automatski prepoznaje jezik kojim gost piše i odgovara na istom jeziku.
            Prijedlozi pitanja dostupni su na:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { flag: "🇬🇧", lang: "Engleski" },
              { flag: "🇩🇪", lang: "Njemački" },
              { flag: "🇹🇷", lang: "Turski" },
              { flag: "🇮🇹", lang: "Talijanski" },
            ].map(({ flag, lang }) => (
              <div key={lang} className="bg-[#F7F7F5] rounded-xl p-3 text-center border border-[#EDEDE9]">
                <div className="text-2xl mb-1">{flag}</div>
                <p className="text-sm font-medium text-[#262626]">{lang}</p>
              </div>
            ))}
          </div>
          <p className="text-[#6B6B6B] text-sm mt-3">
            AI može odgovarati i na ostalim jezicima — gost piše na svom jeziku i AI ga prati.
          </p>
        </Card>

        {/* What the AI knows */}
        <Card>
          <SectionHeading icon={<Brain className="w-5 h-5" />} color="bg-violet-600">
            Šta AI zna?
          </SectionHeading>
          <p className="text-[#6B6B6B] leading-relaxed mb-4">
            AI ima pristup svim <strong className="text-[#262626]">vidljivim sekcijama</strong> vašeg guidebooka:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {[
              "Dobrodošlica", "WiFi lozinka", "Check-in / Check-out",
              "Kućni red", "Lokacija i upute", "Lokalne preporuke",
              "Kontakt info", "Parking", "Custom sekcije",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6700] shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <p className="text-[#6B6B6B] text-sm">
            Sekcije s isključenom vidljivošću (oko ikona) <strong className="text-[#262626]">ne</strong> prosljeđuju se AI-u.
          </p>
        </Card>

        {/* AI Context */}
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-[#262626] text-lg mb-2">AI Context — skrivena sekcija</h2>
              <p className="text-[#6B6B6B] leading-relaxed mb-4">
                U editoru postoji posebno <strong className="text-[#262626]">AI Context</strong> dugme (ljubičasto, opcionalno).
                Kreira sekciju koja je <strong className="text-[#262626]">potpuno nevidljiva gostima</strong>,
                ali AI je čita i koristi za preciznije odgovore.
              </p>

              {/* Editor mockup */}
              <div className="bg-white rounded-xl border border-violet-100 overflow-hidden mb-4">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEDE9]">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <span className="text-sm font-medium text-[#262626]">AI Context</span>
                  <span className="ml-auto text-xs text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">Skriveno od gostiju</span>
                </div>
                <div className="px-4 py-3">
                  <div className="bg-[#F7F7F5] rounded-lg px-3 py-2.5 text-xs text-[#6B6B6B] leading-relaxed">
                    Ključ je u kutijici iza aparata za kafu. Bazen radi 08–22h, pristup bijelom karticom. Najbliža apoteka je 2 min hoda, lijevo od ulaza...
                  </div>
                </div>
              </div>

              <p className="text-[#6B6B6B] text-sm font-medium mb-2">Idealno za napomene poput:</p>
              <ul className="space-y-1.5">
                {[
                  "Ključ je u kutijici iza aparata za kafu",
                  "Bazen radi od 08:00 do 22:00, pristup karticom",
                  "Najbliža apoteka: 2 minute hoda, lijevo od ulaza",
                  "Za hitne slučajeve, portir je dostupan 24/7",
                  "Uputstvo za mašinu za veš je na frižideru",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                    <span className="text-violet-500 mt-0.5 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Limitations */}
        <Card>
          <SectionHeading icon={<Lock className="w-5 h-5" />} color="bg-slate-600">
            Ograničenja
          </SectionHeading>
          <ul className="space-y-3">
            {[
              "AI zna samo ono što ste vi unijeli. Ne može pretraživati internet niti odgovarati na opća pitanja.",
              "Odgovori su kratki (2–4 rečenice) radi preglednosti na mobitelu.",
              "Ako AI nema odgovor, to i kaže — i predlaže gostu da kontaktira vas direktno.",
              "AI ne pamti prethodna pitanja unutar razgovora — svako pitanje je nezavisno.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        {/* Tips */}
        <Card>
          <SectionHeading icon={<Lightbulb className="w-5 h-5" />} color="bg-amber-500">
            Savjeti za bolje odgovore
          </SectionHeading>
          <ul className="space-y-3">
            {[
              "Popunite što više sekcija — više informacija znači preciznije odgovore.",
              "Koristite AI Context za sve specifičnosti vašeg apartmana koje ne staju u standardne sekcije.",
              "Budite konkretni — umjesto \"ujutro\", napišite \"do 11:00\".",
              "Dodajte lokalne preporuke s opisima — AI može predlagati restorane, apoteke, atrakcije.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        {/* CTA */}
        <div className="bg-[#0F2F61] rounded-2xl p-8 text-center text-white">
          <p className="font-bold text-xl mb-2">Spremni za postavljanje?</p>
          <p className="text-[#8ba3c7] mb-6 text-sm">Otvorite editor vašeg apartmana i dodajte AI Context sekciju.</p>
          <a
            href="/dashboard"
            className="inline-block bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
          >
            Idi na dashboard →
          </a>
        </div>

      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDEDE9] p-6 space-y-4">
      {children}
    </div>
  );
}

function SectionHeading({
  children,
  icon,
  color,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0 text-white`}>
        {icon}
      </div>
      <h2 className="font-bold text-[#262626] text-lg">{children}</h2>
    </div>
  );
}
