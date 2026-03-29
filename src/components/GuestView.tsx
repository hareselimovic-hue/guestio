"use client";

import { useRef } from "react";
import {
  Wifi, Key, ScrollText, MapPin, Star, Heart, Plus,
  Copy, Check, ChevronDown, Phone, ParkingSquare
} from "lucide-react";
import { useState } from "react";

const SECTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  WELCOME:     { icon: <Heart className="w-5 h-5" />,           color: "text-pink-600",   bg: "bg-pink-50" },
  WIFI:        { icon: <Wifi className="w-5 h-5" />,            color: "text-blue-600",   bg: "bg-blue-50" },
  CHECKIN:     { icon: <Key className="w-5 h-5" />,             color: "text-amber-600",  bg: "bg-amber-50" },
  HOUSE_RULES: { icon: <ScrollText className="w-5 h-5" />,      color: "text-purple-600", bg: "bg-purple-50" },
  LOCATION:    { icon: <MapPin className="w-5 h-5" />,          color: "text-green-600",  bg: "bg-green-50" },
  LOCAL_RECS:  { icon: <Star className="w-5 h-5" />,            color: "text-orange-600", bg: "bg-orange-50" },
  CONTACT:     { icon: <Phone className="w-5 h-5" />,           color: "text-teal-600",   bg: "bg-teal-50" },
  PARKING:     { icon: <ParkingSquare className="w-5 h-5" />,   color: "text-slate-600",  bg: "bg-slate-50" },
  CUSTOM:      { icon: <Plus className="w-5 h-5" />,            color: "text-gray-600",   bg: "bg-gray-50" },
};

const UI_STRINGS: Record<string, {
  welcome: string; exploreGuide: string; guideSoon: string; guideSoonSub: string;
  sections: Record<string, { label: string; subtitle?: string }>;
}> = {
  EN: {
    welcome: "Welcome",
    exploreGuide: "Explore the guide",
    guideSoon: "Guide coming soon",
    guideSoonSub: "Your host is still adding information.",
    sections: {
      WIFI:        { label: "WiFi",               subtitle: "Internet & WiFi" },
      CHECKIN:     { label: "Check-in & Check-out", subtitle: "Arrival & departure info" },
      HOUSE_RULES: { label: "House Rules",        subtitle: "House Rules & Guidelines" },
      LOCATION:    { label: "Location",           subtitle: "How to get here" },
      LOCAL_RECS:  { label: "Recommendations",    subtitle: "Things to do nearby" },
      CONTACT:     { label: "Contact",            subtitle: "Need help?" },
      PARKING:     { label: "Parking",            subtitle: "Parking & Access" },
    },
  },
  DE: {
    welcome: "Willkommen",
    exploreGuide: "Zum Gästeführer",
    guideSoon: "Leitfaden kommt bald",
    guideSoonSub: "Ihr Gastgeber fügt noch Informationen hinzu.",
    sections: {
      WIFI:        { label: "WLAN",               subtitle: "Internet & WLAN" },
      CHECKIN:     { label: "Check-in & Check-out", subtitle: "Anreise & Abreise" },
      HOUSE_RULES: { label: "Hausregeln",         subtitle: "Regeln & Richtlinien" },
      LOCATION:    { label: "Lage",               subtitle: "So kommen Sie her" },
      LOCAL_RECS:  { label: "Empfehlungen",       subtitle: "Aktivitäten in der Nähe" },
      CONTACT:     { label: "Kontakt",            subtitle: "Brauchen Sie Hilfe?" },
      PARKING:     { label: "Parken",             subtitle: "Parken & Zugang" },
    },
  },
  TR: {
    welcome: "Hoş Geldiniz",
    exploreGuide: "Rehberi Keşfet",
    guideSoon: "Rehber Yakında",
    guideSoonSub: "Ev sahibiniz henüz bilgi ekliyor.",
    sections: {
      WIFI:        { label: "WiFi",               subtitle: "İnternet & WiFi" },
      CHECKIN:     { label: "Giriş & Çıkış",      subtitle: "Varış & Ayrılış bilgisi" },
      HOUSE_RULES: { label: "Ev Kuralları",       subtitle: "Kurallar & Yönergeler" },
      LOCATION:    { label: "Konum",              subtitle: "Nasıl Gelinir" },
      LOCAL_RECS:  { label: "Tavsiyeler",         subtitle: "Yakında Yapılacaklar" },
      CONTACT:     { label: "İletişim",           subtitle: "Yardıma mı İhtiyacınız Var?" },
      PARKING:     { label: "Otopark",            subtitle: "Park & Erişim" },
    },
  },
  IT: {
    welcome: "Benvenuto",
    exploreGuide: "Esplora la guida",
    guideSoon: "Guida in arrivo",
    guideSoonSub: "Il tuo host sta ancora aggiungendo informazioni.",
    sections: {
      WIFI:        { label: "WiFi",               subtitle: "Internet & WiFi" },
      CHECKIN:     { label: "Check-in & Check-out", subtitle: "Info arrivo & partenza" },
      HOUSE_RULES: { label: "Regole della casa",  subtitle: "Regole e linee guida" },
      LOCATION:    { label: "Posizione",          subtitle: "Come arrivare" },
      LOCAL_RECS:  { label: "Consigli locali",    subtitle: "Cosa fare nei dintorni" },
      CONTACT:     { label: "Contatti",           subtitle: "Hai bisogno di aiuto?" },
      PARKING:     { label: "Parcheggio",         subtitle: "Parcheggio & Accesso" },
    },
  },
};

interface SectionTranslation {
  language: string;
  content: unknown;
}

interface Section {
  id: string;
  type: string;
  title: string;
  content: unknown;
  translations?: SectionTranslation[];
}

interface Props {
  property: { id: string; name: string; slug: string };
  sections: Section[];
  guestName: string | null;
  checkIn: string | null;
  checkOut: string | null;
}

const LANGUAGES = [
  { code: "EN", flag: "🇬🇧", label: "EN" },
  { code: "DE", flag: "🇩🇪", label: "DE" },
  { code: "TR", flag: "🇹🇷", label: "TR" },
  { code: "IT", flag: "🇮🇹", label: "IT" },
];

function getContent(section: Section, lang: string): Record<string, unknown> {
  if (lang === "EN") return section.content as Record<string, unknown>;
  const t = section.translations?.find((t) => t.language === lang);
  return (t?.content ?? section.content) as Record<string, unknown>;
}

export default function GuestView({ property, sections, guestName, checkIn, checkOut }: Props) {
  const sectionsRef = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState("EN");

  // Only show language switcher if at least one section has any translation
  const hasTranslations = sections.some((s) => s.translations && s.translations.length > 0);

  const welcomeSection = sections.find((s) => s.type === "WELCOME");
  const otherSections = sections.filter((s) => s.type !== "WELCOME");

  const ui = UI_STRINGS[lang] ?? UI_STRINGS.EN;

  // Always use EN for heroImage (not translated), use translated content for text fields
  const welcomeContentEN = (welcomeSection?.content ?? {}) as Record<string, unknown>;
  const welcomeContent = welcomeSection ? getContent(welcomeSection, lang) : welcomeContentEN;
  const heroImage = (welcomeContentEN.heroImage as string) ?? "";
  const welcomeTitle = (welcomeContent.welcomeTitle as string) ?? property.name;
  const ctaText = (welcomeContent.ctaText as string) || ui.exploreGuide;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en", { day: "numeric", month: "long" });

  function scrollToSections() {
    sectionsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── HERO ── */}
      <div
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: heroImage
            ? `url(${heroImage}) center/cover no-repeat`
            : "linear-gradient(135deg, #0F2F61 0%, #1a4a8a 100%)",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-lg">
          {/* Property badge */}
          <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full mb-6 tracking-wide">
            {property.name}
          </div>

          {/* Welcome message */}
          <h1
            className="text-4xl font-bold text-white mb-3 leading-tight"
            style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
          >
            {guestName
              ? <>{ui.welcome},<br /><span className="text-[#FF6700]">{guestName}</span>!</>
              : welcomeTitle
            }
          </h1>

          {/* Dates */}
          {(checkIn || checkOut) && (
            <div className="flex items-center justify-center gap-2 text-white/80 text-sm mb-2">
              <span>{checkIn && formatDate(checkIn)}</span>
              {checkIn && checkOut && <span className="text-white/40">→</span>}
              <span>{checkOut && formatDate(checkOut)}</span>
            </div>
          )}

          {/* Subtitle from welcome message */}
          {welcomeContent.message && (
            <p className="text-white/80 text-sm leading-relaxed mt-3 mb-2">
              {welcomeContent.message as string}
            </p>
          )}

          {welcomeContent.hostName && (
            <p className="text-white/60 text-xs mt-2">— {welcomeContent.hostName as string}</p>
          )}

          {/* CTA button */}
          {otherSections.length > 0 && (
            <button
              onClick={scrollToSections}
              className="mt-8 inline-flex items-center gap-2 bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold px-6 py-3 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
            >
              {ctaText}
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scroll indicator */}
        {otherSections.length > 0 && (
          <button
            onClick={scrollToSections}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white/80 transition-colors animate-bounce"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        )}

        {/* Language dropdown — top right */}
        {hasTranslations && (
          <div className="absolute top-4 right-4 z-20">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full border border-white/30 outline-none cursor-pointer appearance-none pr-7"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} style={{ color: "#262626", background: "#fff" }}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── SECTION CARDS ── */}
      <div ref={sectionsRef} className="max-w-2xl mx-auto px-4 py-10 space-y-4">

        {otherSections.map((section) => (
          <SectionCard key={section.id} section={section} content={getContent(section, lang)} ui={ui} />
        ))}

        {otherSections.length === 0 && (
          <div className="text-center py-16 text-[#6B6B6B]">
            <p className="text-lg font-medium">{ui.guideSoon}</p>
            <p className="text-sm mt-1">{ui.guideSoonSub}</p>
          </div>
        )}
      </div>

      {/* ── UPSELL CARDS ── */}
      <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {/* TrueLocal */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0EE]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-50 text-green-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h2 className="font-bold text-[#262626] text-base" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
              Want to explore Sarajevo & beyond like a true local?
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-[#262626] leading-relaxed">
              Looking for authentic local experiences in Bosnia & Herzegovina? Explore hand-picked tours, activities and hidden gems curated just for you.
            </p>
            <a
              href="https://www.truelocal.ba"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              Explore TrueLocal.ba
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Rent-a-car */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0EE]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <h2 className="font-bold text-[#262626] text-base" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
              Rent-a-car
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-[#262626] leading-relaxed">
              Need a car during your stay? We offer reliable and affordable car rental — contact us and we'll arrange everything for you.
            </p>
            <div className="flex gap-2 flex-wrap">
              <a
                href="tel:+38761684110"
                className="inline-flex items-center gap-2 bg-[#0F2F61] hover:bg-[#0a2347] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call us
              </a>
              <a
                href="https://wa.me/38761684110"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1db955] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-10 text-center">
        <p className="text-xs text-[#6B6B6B]">
          Powered by{" "}
          <span className="font-semibold text-[#0F2F61]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
            SmartStay
          </span>
        </p>
      </div>
    </div>
  );
}

function SectionCard({ section, content, ui }: { section: Section; content: Record<string, unknown>; ui: typeof UI_STRINGS["EN"] }) {
  const [open, setOpen] = useState(false);
  const meta = SECTION_META[section.type] ?? SECTION_META.CUSTOM;
  const sectionStrings = ui.sections[section.type];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
      {/* Card header — tap to toggle */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left ${open ? "border-b border-[#F0F0EE]" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
            {meta.icon}
          </div>
          <div>
            <h2
              className="font-bold text-[#262626] text-base leading-tight"
              style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
            >
              {section.type === "CUSTOM" ? section.title : (sectionStrings?.label ?? section.title)}
            </h2>
            {sectionStrings?.subtitle && (
              <p className="text-xs text-[#9B9B9B] font-normal mt-0.5">{sectionStrings.subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#6B6B6B] transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Card body */}
      {open && (
        <div className="px-5 py-4">
          <SectionBody type={section.type} content={content} />
        </div>
      )}
    </div>
  );
}

function SectionBody({ type, content }: { type: string; content: Record<string, unknown> }) {
  switch (type) {
    case "WIFI":
      return (
        <div className="space-y-3">
          <WifiRow label="Network" value={(content.network as string) ?? ""} copyable />
          <WifiRow label="Password" value={(content.password as string) ?? ""} copyable />
          {content.note && (
            <p className="text-sm text-[#6B6B6B] pt-2 border-t border-[#F0F0EE]">
              {content.note as string}
            </p>
          )}
        </div>
      );

    case "CHECKIN": {
      const checkInType = (content.checkInType as string) ?? "SELF";
      const videoUrl = (content.videoUrl as string) ?? "";
      return (
        <div className="space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#0F2F61]/10 text-[#0F2F61]">
            {checkInType === "SELF" ? "Self check-in" : "Personal welcome"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimeBox label="Check-in" value={(content.checkIn as string) ?? "15:00"} />
            <TimeBox label="Check-out" value={(content.checkOut as string) ?? "11:00"} />
          </div>
          {content.instructions && (
            <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap">
              {content.instructions as string}
            </p>
          )}
          {checkInType === "SELF" && (() => {
            const photos: string[] = (content.photos as string[]) ?? (
              (content.photoUrl as string) ? [(content.photoUrl as string)] : []
            );
            return photos.length > 0 ? (
              <div className={photos.length > 1 ? "grid grid-cols-2 gap-2" : ""}>
                {photos.map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden">
                    <img src={url} alt={`Check-in photo ${i + 1}`} className="w-full object-cover rounded-xl" style={{ maxHeight: 240 }} />
                  </div>
                ))}
              </div>
            ) : null;
          })()}
          {checkInType === "SELF" && videoUrl && (
            <div className="rounded-xl overflow-hidden bg-black">
              <video src={videoUrl} controls className="w-full" style={{ maxHeight: 280 }} />
            </div>
          )}
        </div>
      );
    }

    case "HOUSE_RULES": {
      const rules = (content.rules as string[]) ?? [];
      return (
        <ul className="space-y-2.5">
          {rules.length === 0 && <li className="text-sm text-[#6B6B6B]">No rules defined.</li>}
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[#262626]">
              <span className="w-6 h-6 bg-[#0F2F61]/10 text-[#0F2F61] rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "LOCATION":
      return (
        <div className="space-y-4">
          {content.address && (
            <div className="flex items-start gap-2.5 text-sm text-[#262626]">
              <MapPin className="w-4 h-4 text-[#6B6B6B] shrink-0 mt-0.5" />
              <span className="leading-relaxed">{content.address as string}</span>
            </div>
          )}
          {content.address && (
            <a
              href={(content.mapUrl as string) || `https://maps.google.com/?q=${encodeURIComponent(content.address as string)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0F2F61] hover:bg-[#0a2347] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Open in Google Maps
            </a>
          )}
          {content.directions && (
            <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap border-t border-[#F0F0EE] pt-3">
              {content.directions as string}
            </p>
          )}
        </div>
      );

    case "LOCAL_RECS": {
      const places = (content.places as Array<{ name: string; category: string; description: string; link?: string }>) ?? [];
      return (
        <div className="space-y-3">
          {places.length === 0 && <p className="text-sm text-[#6B6B6B]">No recommendations yet.</p>}
          {places.map((place, i) => (
            <div key={i} className="flex gap-3 p-3 bg-[#F7F7F5] rounded-xl">
              <div className="w-8 h-8 bg-[#FF6700]/10 rounded-lg flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-[#FF6700]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-[#262626]">{place.name}</p>
                  {place.category && (
                    <span className="text-xs bg-[#FF6700]/10 text-[#FF6700] px-2 py-0.5 rounded-full font-medium">
                      {place.category}
                    </span>
                  )}
                </div>
                {place.description && (
                  <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{place.description}</p>
                )}
                {place.link && (
                  <a
                    href={place.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-white bg-[#0F2F61] hover:bg-[#0a2347] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    Open in Google Maps
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "CONTACT": {
      const phone = (content.phone as string) ?? "";
      const label = (content.label as string) ?? "";
      const cleanPhone = phone.replace(/\s+/g, "");
      const waPhone = cleanPhone.replace(/^\+/, "");

      if (!phone) return <p className="text-sm text-[#6B6B6B]">No contact number provided.</p>;

      return (
        <div className="space-y-3">
          {label && (
            <p className="text-sm font-medium text-[#262626]">{label}</p>
          )}
          <p className="text-base font-semibold text-[#262626]">{phone}</p>
          <div className="flex gap-2 flex-wrap">
            {/* Phone call */}
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#0F2F61] text-white hover:bg-[#0a2347] transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>

            {/* Viber */}
            <a
              href={`viber://chat?number=${cleanPhone}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#7360F2] text-white hover:bg-[#5f4ed4] transition-colors"
            >
              <ViberIcon />
              Viber
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#25D366] text-white hover:bg-[#1db955] transition-colors"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
          </div>
        </div>
      );
    }

    case "PARKING": {
      const available = (content.available as boolean) ?? false;
      const parkingType = (content.parkingType as string) ?? "";
      const paid = (content.paid as boolean) ?? false;
      const notes = (content.notes as string) ?? "";
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${
              available ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}>
              {available ? "✓ Available" : "✗ No parking"}
            </span>
            {available && parkingType && (
              <span className="text-sm bg-[#F7F7F5] text-[#262626] px-3 py-1.5 rounded-full font-medium">
                {parkingType}
              </span>
            )}
            {available && (
              <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                paid ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
              }`}>
                {paid ? "Paid" : "Free"}
              </span>
            )}
          </div>
          {notes && (
            <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap border-t border-[#F0F0EE] pt-3">
              {notes}
            </p>
          )}
        </div>
      );
    }

    default: {
      const images = (content.images as string[]) ?? [];
      const links = (content.links as { name: string; url: string; description: string }[]) ?? [];
      return (
        <div className="space-y-3">
          {(content.body as string) && (
            <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap">
              {content.body as string}
            </p>
          )}
          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((item, i) => (
                <div key={i} className="bg-[#F7F7F5] rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-[#262626]">{item.name}</p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#0F2F61] font-medium shrink-0 underline underline-offset-2">
                        Otvori →
                      </a>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <div className={images.length > 1 ? "grid grid-cols-2 gap-2" : ""}>
              {images.map((url, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <img src={url} alt={`photo ${i + 1}`} className="w-full object-cover rounded-xl" style={{ maxHeight: 240 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  }
}

function ViberIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.4 0C6.57.16 2.38 3.34.83 7.9c-.6 1.76-.7 3.65-.3 5.47.37 1.64 1.1 3.16 2.14 4.45v3.3c0 .28.19.52.46.59.27.07.55-.04.7-.28l1.5-2.22c1.43.7 3 1.08 4.58 1.09h.32c.88 0 1.76-.1 2.62-.3 3.5-.84 6.22-3.47 7.19-6.93.16-.57.27-1.15.32-1.74.06-.63.08-1.27.04-1.9C19.1 4.22 15.6.45 11.4 0zm5.77 14.5c-.78 2.73-3.01 4.78-5.82 5.45-.72.17-1.46.26-2.2.26h-.29c-1.38-.01-2.74-.35-3.96-.98l-.38-.2-.83 1.22v-2.3l-.28-.26C2.44 16.4 1.63 14.9 1.3 13.25c-.36-1.65-.27-3.35.25-4.95C2.82 4.2 6.5 1.43 10.85 1.28h.29c3.65 0 6.82 2.6 7.44 6.2.04.53.05 1.06 0 1.59-.04.5-.13.98-.26 1.46l-.15-.03zM16 10.5c-.2-.09-.93-.46-1.08-.51-.14-.05-.25-.08-.35.08-.1.15-.4.51-.49.62-.09.1-.18.12-.34.04-.16-.08-.68-.25-1.3-.8-.48-.43-.8-.96-.9-1.12-.1-.16-.01-.25.07-.33.08-.08.17-.2.26-.3.09-.1.12-.17.17-.28.06-.12.03-.22-.02-.31-.04-.08-.35-.85-.48-1.16-.13-.31-.26-.26-.35-.27h-.31c-.1 0-.27.04-.4.19-.14.15-.53.52-.53 1.26s.54 1.46.62 1.56c.08.1 1.06 1.62 2.57 2.27.36.15.64.25.85.32.36.11.68.1.94.06.29-.05.88-.36 1.01-.71.12-.35.12-.65.08-.71-.04-.07-.14-.11-.34-.2z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function WifiRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center justify-between bg-[#F7F7F5] rounded-xl px-4 py-3">
      <div>
        <p className="text-xs text-[#6B6B6B] font-medium">{label}</p>
        <p className="font-semibold text-[#262626] mt-0.5 text-sm tracking-wide">{value || "—"}</p>
      </div>
      {copyable && value && (
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0F2F61] bg-white border border-[#EDEDE9] px-3 py-1.5 rounded-lg hover:bg-[#F0F0EE] transition-colors"
        >
          {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      )}
    </div>
  );
}

function TimeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F7F7F5] rounded-xl p-4 text-center">
      <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#0F2F61]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
        {value}
      </p>
    </div>
  );
}
