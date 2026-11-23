"use client";

import React, { useEffect, useRef } from "react";
import {
  Wifi, Key, ScrollText, MapPin, Star, Heart, Plus,
  Copy, Check, ChevronDown, Phone, ParkingSquare, X, ClipboardList, CheckCircle2,
  Coffee, Sparkles, UtensilsCrossed, Car, PawPrint, Waves, BookOpen, Dumbbell, Baby, Bike,
  ShoppingBag, Thermometer, Tv, WashingMachine, Trash2, Info, Bus, Luggage, Search, Navigation, User,
} from "lucide-react";
import { useState } from "react";
import GuestChat from "./GuestChat";
import GuestWeather from "./GuestWeather";
import { REGISTRATION_SENT_KEY } from "./GuestRegistrationForm";
import {
  GoogleReviewCard, HotelAnnouncements, HotelServicesPanel, HotelTabBar, roomLabel,
  type HotelAnnouncementItem, type HotelServiceItem, type HotelTab,
} from "./HotelGuest";

function ClickableImg({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className ?? ""} cursor-pointer active:opacity-90`}
        style={style}
        onClick={() => setOpen(true)}
      />
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white"
            onClick={() => setOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </>
  );
}

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

// Custom sections get an icon from their title (bs/en/de keywords); fallback: book
const CUSTOM_ICONS: [RegExp, React.ReactNode, string, string][] = [
  [/breakfast|doru[čc]ak|fr[üu]hst|restaurant|restoran/i, <Coffee className="w-5 h-5" key="i" />, "text-amber-700", "bg-amber-50"],
  [/spa|sauna|wellness|massage|masa[žz]/i, <Sparkles className="w-5 h-5" key="i" />, "text-fuchsia-600", "bg-fuchsia-50"],
  [/pool|bazen|swim/i, <Waves className="w-5 h-5" key="i" />, "text-sky-600", "bg-sky-50"],
  [/gym|fitness|teretana/i, <Dumbbell className="w-5 h-5" key="i" />, "text-slate-700", "bg-slate-100"],
  [/facilit|sadr[žz]aj|amenit|ausstattung/i, <Sparkles className="w-5 h-5" key="i" />, "text-indigo-600", "bg-indigo-50"],
  [/food|hrana|meal|kitchen|kuhinj|dinner|ve[čc]er/i, <UtensilsCrossed className="w-5 h-5" key="i" />, "text-red-600", "bg-red-50"],
  [/taxi|transfer|airport|aerodrom|car|auto|rent/i, <Car className="w-5 h-5" key="i" />, "text-slate-700", "bg-slate-100"],
  [/bus|tram|public transport|prevoz/i, <Bus className="w-5 h-5" key="i" />, "text-slate-700", "bg-slate-100"],
  [/pet|ljubim|dog|pas\b/i, <PawPrint className="w-5 h-5" key="i" />, "text-amber-700", "bg-amber-50"],
  [/baby|beb|kid|djec|child/i, <Baby className="w-5 h-5" key="i" />, "text-pink-600", "bg-pink-50"],
  [/bike|bicik/i, <Bike className="w-5 h-5" key="i" />, "text-green-700", "bg-green-50"],
  [/shop|kupov|market|prodavn/i, <ShoppingBag className="w-5 h-5" key="i" />, "text-orange-600", "bg-orange-50"],
  [/heat|grija|klima|air ?con|a\/c/i, <Thermometer className="w-5 h-5" key="i" />, "text-red-600", "bg-red-50"],
  [/tv|television|netflix/i, <Tv className="w-5 h-5" key="i" />, "text-slate-700", "bg-slate-100"],
  [/wash|ve[šs]|laundry|pranje/i, <WashingMachine className="w-5 h-5" key="i" />, "text-sky-600", "bg-sky-50"],
  [/trash|garbage|sme[ćc]|otpad/i, <Trash2 className="w-5 h-5" key="i" />, "text-green-700", "bg-green-50"],
  [/luggage|prtljag|gep[äa]ck/i, <Luggage className="w-5 h-5" key="i" />, "text-slate-700", "bg-slate-100"],
  [/faq|question|pitanj|info/i, <Info className="w-5 h-5" key="i" />, "text-blue-600", "bg-blue-50"],
];
function sectionMeta(type: string, title: string) {
  if (type !== "CUSTOM") return SECTION_META[type] ?? SECTION_META.CUSTOM;
  const hit = CUSTOM_ICONS.find(([re]) => re.test(title));
  return hit
    ? { icon: hit[1], color: hit[2], bg: hit[3] }
    : { icon: <BookOpen className="w-5 h-5" />, color: "text-navy", bg: "bg-navy/5" };
}
/** Real data under the title when we have it (Wi-Fi name, times, address, phone); else the generic subtitle */
function sectionSubtitle(type: string, content: Record<string, unknown>, fallback?: string) {
  const str = (k: string) => (typeof content[k] === "string" ? (content[k] as string).trim() : "");
  if (type === "WIFI" && str("network")) return str("network");
  // CHECKIN: times are already in the bar under the hero
  if (type === "LOCATION" && str("address")) return str("address");
  if (type === "CONTACT" && str("phone")) return str("phone");
  return fallback;
}

const UI_STRINGS: Record<string, {
  welcome: string; exploreGuide: string; guideSoon: string; guideSoonSub: string;
  trueLocalTitle: string; trueLocalBody: string; trueLocalCta: string;
  rentCarTitle: string; rentCarBody: string; callUs: string;
  regTitle: string; regBody: string; regCta: string; regDone: string; regDoneBody: string;
  checkInAfter: string; checkOutBefore: string; searchPh: string; noResults: string; host: string; reception: string; stayStarts: string;
  sections: Record<string, { label: string; subtitle?: string }>;
}> = {
  EN: {
    checkInAfter: "Check-in after", checkOutBefore: "Check-out before", searchPh: "Search the guide…", noResults: "Nothing found for", host: "Your host", reception: "Reception", stayStarts: "Your stay starts here. All the important details and helpful information are just below.",
    welcome: "Welcome",
    exploreGuide: "Explore the guide",
    guideSoon: "Guide coming soon",
    guideSoonSub: "Your host is still adding information.",
    trueLocalTitle: "Want to explore the area like a true local?",
    trueLocalBody: "Looking for authentic local experiences in Bosnia & Herzegovina? Explore hand-picked tours, activities and hidden gems curated just for you.",
    trueLocalCta: "Explore TrueLocal.ba",
    rentCarTitle: "Rent-a-car",
    rentCarBody: "Need a car during your stay? We offer reliable and affordable car rental — contact us and we'll arrange everything for you.",
    callUs: "Call us",
    regTitle: "Guest registration",
    regBody: "Please send us the details of all guests so we can register your stay with the local authorities, as required by law. It takes about 2 minutes.",
    regCta: "Send guest details",
    regDone: "Details sent",
    regDoneBody: "Thank you! We have received your details.",
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
  BS: {
    checkInAfter: "Check-in od", checkOutBefore: "Check-out do", searchPh: "Pretražite vodič…", noResults: "Nema rezultata za", host: "Vaš domaćin", reception: "Recepcija", stayStarts: "Vaš boravak počinje ovdje. Sve važne informacije i korisni savjeti su odmah ispod.",
    welcome: "Dobro došli",
    exploreGuide: "Pogledaj vodič",
    guideSoon: "Vodič uskoro",
    guideSoonSub: "Vaš domaćin još dodaje informacije.",
    trueLocalTitle: "Želite istražiti okolinu kao pravi lokalac?",
    trueLocalBody: "Tražite autentična lokalna iskustva u Bosni i Hercegovini? Istražite pažljivo odabrane ture, aktivnosti i skrivene dragulje.",
    trueLocalCta: "Istraži TrueLocal.ba",
    rentCarTitle: "Rent-a-car",
    rentCarBody: "Treba vam auto tokom boravka? Nudimo pouzdano i povoljno iznajmljivanje vozila — javite nam se i sve ćemo organizovati.",
    callUs: "Pozovi nas",
    regTitle: "Prijava gostiju",
    regBody: "Molimo pošaljite nam podatke svih gostiju kako bismo prijavili vaš boravak nadležnim organima, kako zakon nalaže. Traje oko 2 minute.",
    regCta: "Pošalji podatke gostiju",
    regDone: "Podaci poslani",
    regDoneBody: "Hvala! Primili smo vaše podatke.",
    sections: {
      WIFI:        { label: "WiFi",               subtitle: "Internet i WiFi" },
      CHECKIN:     { label: "Dolazak i odlazak",  subtitle: "Informacije o dolasku i odlasku" },
      HOUSE_RULES: { label: "Kućni red",          subtitle: "Pravila i smjernice" },
      LOCATION:    { label: "Lokacija",           subtitle: "Kako doći" },
      LOCAL_RECS:  { label: "Preporuke",          subtitle: "Šta raditi u blizini" },
      CONTACT:     { label: "Kontakt",            subtitle: "Treba vam pomoć?" },
      PARKING:     { label: "Parking",            subtitle: "Parking i pristup" },
    },
  },
  DE: {
    checkInAfter: "Check-in ab", checkOutBefore: "Check-out bis", searchPh: "Im Gästeführer suchen…", noResults: "Keine Ergebnisse für", host: "Ihr Gastgeber", reception: "Rezeption", stayStarts: "Ihr Aufenthalt beginnt hier. Alle wichtigen Details und hilfreichen Informationen finden Sie gleich unten.",
    welcome: "Willkommen",
    exploreGuide: "Zum Gästeführer",
    guideSoon: "Leitfaden kommt bald",
    guideSoonSub: "Ihr Gastgeber fügt noch Informationen hinzu.",
    trueLocalTitle: "Die Umgebung wie ein Einheimischer entdecken?",
    trueLocalBody: "Suchen Sie authentische lokale Erlebnisse in Bosnien & Herzegowina? Entdecken Sie handverlesene Touren, Aktivitäten und versteckte Juwelen.",
    trueLocalCta: "TrueLocal.ba entdecken",
    rentCarTitle: "Mietwagen",
    rentCarBody: "Benötigen Sie ein Auto während Ihres Aufenthalts? Wir bieten zuverlässige und erschwingliche Mietwagen — kontaktieren Sie uns.",
    callUs: "Anrufen",
    regTitle: "Gästeanmeldung",
    regBody: "Bitte senden Sie uns die Daten aller Gäste, damit wir Ihren Aufenthalt wie gesetzlich vorgeschrieben bei den örtlichen Behörden anmelden können. Dauert etwa 2 Minuten.",
    regCta: "Gästedaten senden",
    regDone: "Daten gesendet",
    regDoneBody: "Vielen Dank! Wir haben Ihre Daten erhalten.",
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
    checkInAfter: "Giriş saati", checkOutBefore: "Çıkış saati", searchPh: "Rehberde ara…", noResults: "Sonuç bulunamadı:", host: "Ev sahibiniz", reception: "Resepsiyon", stayStarts: "Konaklamanız burada başlıyor. Tüm önemli bilgiler ve faydalı ipuçları hemen aşağıda.",
    welcome: "Hoş Geldiniz",
    exploreGuide: "Rehberi Keşfet",
    guideSoon: "Rehber Yakında",
    guideSoonSub: "Ev sahibiniz henüz bilgi ekliyor.",
    trueLocalTitle: "Çevreyi gerçek bir yerel gibi keşfetmek ister misiniz?",
    trueLocalBody: "Bosna Hersek'te otantik yerel deneyimler mi arıyorsunuz? Özenle seçilmiş turları, aktiviteleri ve gizli hazineleri keşfedin.",
    trueLocalCta: "TrueLocal.ba'yı Keşfet",
    rentCarTitle: "Araç Kiralama",
    rentCarBody: "Konaklama sürenizde araç mı gerekiyor? Güvenilir ve uygun fiyatlı araç kiralama sunuyoruz — bizimle iletişime geçin.",
    callUs: "Ara",
    regTitle: "Misafir kaydı",
    regBody: "Konaklamanızı yasal zorunluluk gereği yerel makamlara bildirebilmemiz için lütfen tüm misafirlerin bilgilerini bize gönderin. Yaklaşık 2 dakika sürer.",
    regCta: "Misafir bilgilerini gönder",
    regDone: "Bilgiler gönderildi",
    regDoneBody: "Teşekkürler! Bilgilerinizi aldık.",
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
    checkInAfter: "Check-in dalle", checkOutBefore: "Check-out entro", searchPh: "Cerca nella guida…", noResults: "Nessun risultato per", host: "Il tuo host", reception: "Reception", stayStarts: "Il tuo soggiorno inizia qui. Tutti i dettagli importanti e le informazioni utili sono qui sotto.",
    welcome: "Benvenuto",
    exploreGuide: "Esplora la guida",
    guideSoon: "Guida in arrivo",
    guideSoonSub: "Il tuo host sta ancora aggiungendo informazioni.",
    trueLocalTitle: "Vuoi esplorare la zona come un vero locale?",
    trueLocalBody: "Cerchi esperienze locali autentiche in Bosnia ed Erzegovina? Scopri tour, attività e gemme nascoste selezionate per te.",
    trueLocalCta: "Esplora TrueLocal.ba",
    rentCarTitle: "Noleggio auto",
    rentCarBody: "Hai bisogno di un'auto durante il soggiorno? Offriamo noleggio affidabile e conveniente — contattaci e organizziamo tutto.",
    callUs: "Chiama",
    regTitle: "Registrazione ospiti",
    regBody: "Inviateci i dati di tutti gli ospiti, così potremo registrare il vostro soggiorno presso le autorità locali, come previsto dalla legge. Richiede circa 2 minuti.",
    regCta: "Invia i dati degli ospiti",
    regDone: "Dati inviati",
    regDoneBody: "Grazie! Abbiamo ricevuto i vostri dati.",
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
  token: string;
  registrationEnabled?: boolean;
  /** Only for properties of kind HOTEL */
  hotel?: { roomNumber: string | null; reviewUrl: string | null; announcements: HotelAnnouncementItem[]; services: HotelServiceItem[] } | null;
}

const LANGUAGES = [
  { code: "EN", flag: "🇬🇧", label: "EN" },
  { code: "BS", flag: "🇧🇦", label: "BS" },
  { code: "DE", flag: "🇩🇪", label: "DE" },
  { code: "TR", flag: "🇹🇷", label: "TR" },
  { code: "IT", flag: "🇮🇹", label: "IT" },
];

const GUEST_LANG_KEY = "smartstay_guest_lang";

function getContent(section: Section, lang: string): Record<string, unknown> {
  if (lang === "EN") return section.content as Record<string, unknown>;
  const t = section.translations?.find((t) => t.language === lang);
  return (t?.content ?? section.content) as Record<string, unknown>;
}

export default function GuestView({ property, sections, guestName, checkIn, checkOut, token, registrationEnabled = false, hotel = null }: Props) {
  const [lang, setLang] = useState("EN");
  const registrationHref = `/g/${property.slug}/registration?from=${token}`;
  const [registrationSent, setRegistrationSent] = useState(false);

  // Sent flag is stored per device with the departure date, so it clears after the stay
  useEffect(() => {
    if (!registrationEnabled) return;
    try {
      const sentUntil = localStorage.getItem(REGISTRATION_SENT_KEY(property.slug));
      if (sentUntil && sentUntil >= new Date().toISOString().slice(0, 10)) setRegistrationSent(true);
    } catch {}
  }, [registrationEnabled, property.slug]);
  // Only show language switcher if at least one section has any translation
  // (hotel blocks and announcements are always translated)
  const hasTranslations = !!hotel || sections.some((s) => s.translations && s.translations.length > 0);

  // First open: the guest's own language (phone/browser setting); afterwards whatever they picked last on this device
  useEffect(() => {
    if (!hasTranslations) return;
    try {
      const saved = localStorage.getItem(GUEST_LANG_KEY);
      if (saved && LANGUAGES.some((l) => l.code === saved)) { setLang(saved); return; }
      const nav = (navigator.language || "").toLowerCase();
      const detected = /^(bs|hr|sr)/.test(nav) ? "BS" : nav.startsWith("de") ? "DE" : nav.startsWith("tr") ? "TR" : nav.startsWith("it") ? "IT" : "EN";
      setLang(detected);
    } catch {}
  }, [hasTranslations]);
  function changeLang(next: string) {
    setLang(next);
    try { localStorage.setItem(GUEST_LANG_KEY, next); } catch {}
  }

  const welcomeSection = sections.find((s) => s.type === "WELCOME");
  const otherSections = sections.filter((s) => s.type !== "WELCOME" && s.type !== "AI_CONTEXT");

  const ui = UI_STRINGS[lang] ?? UI_STRINGS.EN;

  // Always use EN for heroImage (not translated), use translated content for text fields
  const welcomeContentEN = (welcomeSection?.content ?? {}) as Record<string, unknown>;
  const welcomeContent = welcomeSection ? getContent(welcomeSection, lang) : welcomeContentEN;
  const heroImage = (welcomeContentEN.heroImage as string) ?? "";
  const welcomeTitle = ((welcomeContent.welcomeTitle as string) ?? property.name) as string;
  const ctaText = ((welcomeContent.ctaText as string) || ui.exploreGuide) as string;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en", { day: "numeric", month: "long" });

  const hotelCtx = hotel ? { slug: property.slug, token, lang, roomNumber: hotel.roomNumber } : null;
  // Bottom tabs for every guide: Home · Info · (hotels: Reception · Extras) · Assistant
  const [tab, setTab] = useState<HotelTab>("home");
  function changeTab(next: HotelTab) {
    setTab(next);
    window.scrollTo({ top: 0 });
  }
  const [query, setQuery] = useState("");

  // Home screen facts — times, map link and phone from the EN content (not translated), labels translated
  const enContent = (type: string) => (sections.find((x) => x.type === type)?.content ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const timeIn = str(enContent("CHECKIN").checkIn);
  const timeOut = str(enContent("CHECKIN").checkOut);
  const address = str(enContent("LOCATION").address);
  const guideMapUrl = str(enContent("LOCATION").mapUrl);
  const mapHref = guideMapUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");
  const phone = str(enContent("CONTACT").phone);
  const contactName = str(enContent("CONTACT").label) || str(welcomeContent.hostName);

  // Info tab search: section label, title and (translated) content
  const q = query.trim().toLowerCase();
  const visibleSections = q
    ? otherSections.filter((sec) => {
        const label = ui.sections[sec.type]?.label ?? sec.title;
        return `${label} ${sec.title} ${JSON.stringify(getContent(sec, lang))}`.toLowerCase().includes(q);
      })
    : otherSections;

  const langPicker = (light: boolean) => hasTranslations && (
    <select
      value={lang}
      onChange={(e) => changeLang(e.target.value)}
      className={light
        ? "shrink-0 bg-white text-ink text-sm font-medium px-3 h-12 rounded-2xl border border-line shadow-sm outline-none cursor-pointer appearance-none pr-7"
        : "bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full border border-white/30 outline-none cursor-pointer appearance-none pr-7"}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${light ? "%23525252" : "white"}' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} style={{ color: "#262626", background: "#fff" }}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
  const HEAD = { fontFamily: "Plus Jakarta Sans Variable, sans-serif" };
  const glass = "rounded-2xl bg-white/12 backdrop-blur-md border border-white/20";

  return (
    // Home fills exactly one screen (announcement bar included); other tabs scroll above the tab bar
    <div className={tab === "home" ? "min-h-svh flex flex-col bg-canvas" : "min-h-screen bg-canvas pb-20"} style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── HOTEL ANNOUNCEMENTS ── */}
      {hotel && <HotelAnnouncements items={hotel.announcements} lang={lang} />}

      {/* ── HOME: full-screen photo with the essentials ── */}
      {tab === "home" && (
        <div
          className="relative flex-1 flex flex-col overflow-hidden"
          style={{ background: heroImage ? `url(${heroImage}) center/cover no-repeat` : "linear-gradient(135deg, #0F2F61 0%, #1a4a8a 100%)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1730]/[0.82] via-[#0B1730]/[0.78] to-[#0B1730]/[0.93]" />
          {/* every photo ends in solid navy, so the tab icons sit on it */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#0B1730] via-[#0B1730]/90 to-transparent" />
          {hasTranslations && <div className="absolute top-4 right-4 z-20">{langPicker(false)}</div>}

          <div className="relative z-10 flex-1 flex flex-col gap-6 w-full max-w-lg mx-auto px-5 pt-16 pb-[calc(5rem+env(safe-area-inset-bottom))] text-white">
            {/* headline centred in the free space above the cards */}
            <div className="flex-1 flex flex-col justify-center text-center">
              <div className="self-center inline-block bg-white/15 backdrop-blur-sm text-white/90 text-[11px] font-medium px-3 py-1 rounded-full mb-3 tracking-wide">
                {property.name}
                {hotel?.roomNumber && <span className="text-white/70"> · {roomLabel(lang)} {hotel.roomNumber}</span>}
              </div>
              <h1 className="text-[28px] sm:text-[32px] font-semibold leading-snug" style={HEAD}>
                {guestName ? <>{ui.welcome}, <span className="text-orange">{guestName}</span>!</> : welcomeTitle}
              </h1>
              <GuestWeather slug={property.slug} mapUrl={guideMapUrl} lang={lang} />
              {(checkIn || checkOut) && (
                <div className="flex items-center justify-center gap-2 text-white/80 text-sm mt-2">
                  <span>{checkIn && formatDate(checkIn)}</span>
                  {checkIn && checkOut && <span className="text-white/40">→</span>}
                  <span>{checkOut && formatDate(checkOut)}</span>
                </div>
              )}
              {str(welcomeContent.message) && (
                <p className="text-white/75 text-[13px] leading-relaxed mt-2.5">{str(welcomeContent.message).length <= 140 ? str(welcomeContent.message) : ui.stayStarts}</p>
              )}
            </div>

            <div className="space-y-2">

              {(timeIn || timeOut || address || phone) && (
                <div className={`${glass} divide-y divide-white/15`}>
                  {(timeIn || timeOut) && (
                    <div className="flex justify-between gap-4 px-3.5 py-2">
                      {timeIn && <div><p className="text-[11px] text-white/65">{ui.checkInAfter}</p><p className="text-base font-bold leading-tight" style={HEAD}>{timeIn}</p></div>}
                      {timeOut && <div className="text-right"><p className="text-[11px] text-white/65">{ui.checkOutBefore}</p><p className="text-base font-bold leading-tight" style={HEAD}>{timeOut}</p></div>}
                    </div>
                  )}
                  {address && (
                    <a href={mapHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3.5 py-1.5">
                      <MapPin className="w-4 h-4 shrink-0 text-white/80" />
                      <span className="flex-1 min-w-0 text-[13px] truncate">{address}</span>
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-white/15 flex items-center justify-center"><Navigation className="w-3.5 h-3.5" /></span>
                    </a>
                  )}
                  {phone && (
                    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2.5 px-3.5 py-1.5">
                      <User className="w-4 h-4 shrink-0 text-white/80" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold truncate leading-tight">{contactName || (hotel ? ui.reception : ui.host)}</span>
                        <span className="block text-[11px] text-white/65">{phone}</span>
                      </span>
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-white/15 flex items-center justify-center"><Phone className="w-3.5 h-3.5" /></span>
                    </a>
                  )}
                </div>
              )}

              {registrationEnabled && (
                <a
                  href={registrationHref}
                  className="w-full inline-flex items-center justify-center gap-2 border-2 border-white/80 hover:bg-white/15 text-white text-sm font-semibold px-6 py-2 rounded-2xl transition-all backdrop-blur-sm"
                  style={HEAD}
                >
                  {registrationSent ? <CheckCircle2 className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                  {registrationSent ? ui.regDone : ui.regTitle}
                </a>
              )}

              {otherSections.length > 0 && (
                <button
                  onClick={() => changeTab("info")}
                  className="w-full inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-dark text-white text-[15px] font-semibold px-6 py-2.5 rounded-2xl transition-all active:scale-[0.99] shadow-lg"
                  style={HEAD}
                >
                  {ctaText} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reception / Extras: just the language picker, no header bar */}
      {(tab === "reception" || tab === "extras") && hasTranslations && (
        <div className="max-w-2xl mx-auto px-4 pt-4 -mb-1 flex justify-end">{langPicker(true)}</div>
      )}

      {/* Reception / Extras stay mounted (hidden otherwise) so the room-service cart survives tab switches */}
      {hotelCtx && hotel && (
        <div className={tab === "reception" || tab === "extras" ? "max-w-2xl mx-auto px-4 py-4 space-y-4" : "hidden"}>
          <HotelServicesPanel ctx={hotelCtx} services={hotel.services} view={tab === "extras" ? "extras" : "reception"} />
        </div>
      )}

      {/* ── INFO: search + every section ── */}
      {tab === "info" && <>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {(otherSections.length > 3 || hasTranslations) && (
          <div className="flex gap-2">
          {otherSections.length > 3 ? (
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ui.searchPh}
              className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border border-line shadow-sm text-[16px] outline-none focus:border-navy"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 p-1" aria-label="Clear">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          ) : <div className="flex-1" />}
          {langPicker(true)}
          </div>
        )}

        {registrationEnabled && !q && (
          registrationSent ? (
            <div className="bg-white rounded-2xl shadow-sm border border-green-200 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-50 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-ink text-base" style={HEAD}>{ui.regDone}</h2>
                <p className="text-sm text-ink-2">{ui.regDoneBody}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-orange overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-line-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 text-orange">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-ink text-base" style={HEAD}>{ui.regTitle}</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-sm text-ink leading-relaxed">{ui.regBody}</p>
                <a href={registrationHref} className="inline-flex items-center gap-2 bg-orange hover:bg-orange-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                  {ui.regCta} →
                </a>
              </div>
            </div>
          )
        )}

        {visibleSections.map((section) => (
          <SectionCard key={section.id} section={section} content={getContent(section, lang)} ui={ui} />
        ))}

        {q && visibleSections.length === 0 && (
          <p className="text-center text-sm text-ink-2 py-10">{ui.noResults} „{query.trim()}“</p>
        )}

        {hotel?.reviewUrl && !q && <GoogleReviewCard lang={lang} url={hotel.reviewUrl} />}

        {otherSections.length === 0 && (
          <div className="text-center py-16 text-ink-2">
            <p className="text-lg font-medium">{ui.guideSoon}</p>
            <p className="text-sm mt-1">{ui.guideSoonSub}</p>
          </div>
        )}
      </div>

      {/* ── UPSELL CARDS ── */}
      {!q && <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4">
        {/* TrueLocal */}
        <div className="bg-white rounded-2xl shadow-sm border border-line overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-line-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-50 text-green-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h2 className="font-bold text-ink text-base" style={HEAD}>{ui.trueLocalTitle}</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-ink leading-relaxed">{ui.trueLocalBody}</p>
            <a
              href="https://www.truelocal.ba"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              {ui.trueLocalCta}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Rent-a-car — not for hotels (they run their own extras) */}
        {!hotel && <div className="bg-white rounded-2xl shadow-sm border border-line overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-line-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <h2 className="font-bold text-ink text-base" style={HEAD}>{ui.rentCarTitle}</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-ink leading-relaxed">{ui.rentCarBody}</p>
            <div className="flex gap-2 flex-wrap">
              <a href="tel:+38761684110" className="inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
                <Phone className="w-4 h-4" />
                {ui.callUs}
              </a>
              <a
                href="https://wa.me/38761684110"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-whatsapp hover:bg-[#1db955] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
            </div>
          </div>
        </div>}
      </div>}

      {/* Footer */}
      <div className="pb-10 text-center">
        <p className="text-xs text-ink-2">
          Powered by{" "}
          <span className="font-semibold text-navy" style={HEAD}>SmartStay</span>
        </p>
      </div>
      </>}

      {/* ── ASSISTANT: the AI chat as its own tab (kept mounted so the conversation survives tab switches) ── */}
      <GuestChat propertySlug={property.slug} token={token} lang={lang} embedded visible={tab === "assistant"} />

      <HotelTabBar tab={tab} onChange={changeTab} lang={lang} slug={property.slug} isHotel={!!hotel} />

    </div>
  );
}

function SectionCard({ section, content, ui }: { section: Section; content: Record<string, unknown>; ui: typeof UI_STRINGS["EN"] }) {
  const [open, setOpen] = useState(false);
  const meta = sectionMeta(section.type, section.title);
  const sectionStrings = ui.sections[section.type];
  const subtitle = sectionSubtitle(section.type, content, sectionStrings?.subtitle);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-line overflow-hidden">
      {/* Card header — tap to toggle */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left ${open ? "border-b border-line-2" : ""}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
            {meta.icon}
          </div>
          <div>
            <h2
              className="font-bold text-ink text-base leading-tight"
              style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
            >
              {section.type === "CUSTOM" ? section.title : (sectionStrings?.label ?? section.title)}
            </h2>
            {subtitle && (
              <p className="text-xs text-ink-3 font-normal mt-0.5 line-clamp-1">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-ink-2 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
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
          {(content.note as string) && (
            <p className="text-sm text-ink-2 pt-2 border-t border-line-2">
              {content.note as string}
            </p>
          )}
        </div>
      );

    case "CHECKIN": {
      const checkInType = (content.checkInType as string) ?? "SELF";
      const videoUrl = (content.videoUrl as string) ?? "";
      const photos: string[] = (content.photos as string[]) ?? (
        (content.photoUrl as string) ? [(content.photoUrl as string)] : []
      );
      const checkOutInstructions = (content.checkOutInstructions as string) ?? "";
      return (
        <div className="space-y-4">
          {/* ── Check-in ── */}
          <p className="text-sm font-bold text-ink">Check-in</p>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-navy/10 text-navy">
            {checkInType === "SELF" ? "Self check-in" : "Personal welcome"}
          </div>
          <TimeBox label="Check-in" value={(content.checkIn as string) ?? "15:00"} />
          {(content.instructions as string) && (
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {content.instructions as string}
            </p>
          )}
          {checkInType === "SELF" && photos.length > 0 && (
            <div className={photos.length > 1 ? "grid grid-cols-2 gap-2" : ""}>
              {photos.map((url, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <ClickableImg src={url} alt={`Check-in photo ${i + 1}`} className="w-full object-cover rounded-xl" style={{ maxHeight: 240 }} />
                </div>
              ))}
            </div>
          )}
          {checkInType === "SELF" && videoUrl && (
            <div className="rounded-xl overflow-hidden bg-black">
              <video src={videoUrl} controls className="w-full" style={{ maxHeight: 280 }} />
            </div>
          )}

          {/* ── Divider ── */}
          <hr className="border-line" />

          {/* ── Check-out ── */}
          <p className="text-sm font-bold text-ink">Check-out</p>
          <TimeBox label="Check-out" value={(content.checkOut as string) ?? "11:00"} />
          {checkOutInstructions && (
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {checkOutInstructions}
            </p>
          )}
        </div>
      );
    }

    case "HOUSE_RULES": {
      const rules = (content.rules as string[]) ?? [];
      return (
        <ul className="space-y-2.5">
          {rules.length === 0 && <li className="text-sm text-ink-2">No rules defined.</li>}
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-ink">
              <span className="w-6 h-6 bg-navy/10 text-navy rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
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
          {(content.address as string) && (
            <div className="flex items-start gap-2.5 text-sm text-ink">
              <MapPin className="w-4 h-4 text-ink-2 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{content.address as string}</span>
            </div>
          )}
          {(content.address as string) && (
            <a
              href={(content.mapUrl as string) || `https://maps.google.com/?q=${encodeURIComponent(content.address as string)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Open in Google Maps
            </a>
          )}
          {(content.directions as string) && (
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap border-t border-line-2 pt-3">
              {content.directions as string}
            </p>
          )}
        </div>
      );

    case "LOCAL_RECS": {
      const places = (content.places as Array<{ name: string; category: string; description: string; link?: string }>) ?? [];
      return (
        <div className="space-y-3">
          {places.length === 0 && <p className="text-sm text-ink-2">No recommendations yet.</p>}
          {places.map((place, i) => (
            <div key={i} className="flex gap-3 p-3 bg-canvas rounded-xl">
              <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-ink">{place.name}</p>
                  {place.category && (
                    <span className="text-xs bg-orange/10 text-orange px-2 py-0.5 rounded-full font-medium">
                      {place.category}
                    </span>
                  )}
                </div>
                {place.description && (
                  <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">{place.description}</p>
                )}
                {place.link && (
                  <a
                    href={place.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-white bg-navy hover:bg-navy-dark px-3 py-1.5 rounded-lg transition-colors"
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

      if (!phone) return <p className="text-sm text-ink-2">No contact number provided.</p>;

      return (
        <div className="space-y-3">
          {label && (
            <p className="text-sm font-medium text-ink">{label}</p>
          )}
          <p className="text-base font-semibold text-ink">{phone}</p>
          <div className="flex gap-2 flex-wrap">
            {/* Phone call */}
            <a
              href={`tel:${cleanPhone}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-navy text-white hover:bg-navy-dark transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>

            {/* Viber */}
            <a
              href={`viber://chat?number=${cleanPhone}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-viber text-white hover:bg-[#5f4ed4] transition-colors"
            >
              <ViberIcon />
              Viber
            </a>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-whatsapp text-white hover:bg-[#1db955] transition-colors"
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
              <span className="text-sm bg-canvas text-ink px-3 py-1.5 rounded-full font-medium">
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
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap border-t border-line-2 pt-3">
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
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {content.body as string}
            </p>
          )}
          {links.length > 0 && (
            <div className="space-y-2">
              {links.map((item, i) => (
                <div key={i} className="bg-canvas rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-ink">{item.name}</p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-navy font-medium shrink-0 underline underline-offset-2">
                        Otvori →
                      </a>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-ink-2 mt-1 leading-relaxed">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <div className={images.length > 1 ? "grid grid-cols-2 gap-2" : ""}>
              {images.map((url, i) => (
                <div key={i} className="rounded-xl overflow-hidden">
                  <ClickableImg src={url} alt={`photo ${i + 1}`} className="w-full object-cover rounded-xl" style={{ maxHeight: 240 }} />
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
    <div className="flex items-center justify-between bg-canvas rounded-xl px-4 py-3">
      <div>
        <p className="text-xs text-ink-2 font-medium">{label}</p>
        <p className="font-semibold text-ink mt-0.5 text-sm tracking-wide">{value || "—"}</p>
      </div>
      {copyable && value && (
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs font-medium text-navy bg-white border border-line px-3 py-1.5 rounded-lg hover:bg-line-2 transition-colors"
        >
          {copied ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      )}
    </div>
  );
}

function TimeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas rounded-xl p-4 text-center">
      <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-navy" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
        {value}
      </p>
    </div>
  );
}

// ─── Under the hero: check-in / check-out times at a glance (hidden when not filled in) ───
function QuickCards({ sections }: { sections: Section[]; lang: string; isHotel: boolean }) {
  const c = (sections.find((x) => x.type === "CHECKIN")?.content ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const checkIn = str(c.checkIn), checkOut = str(c.checkOut);
  if (!checkIn && !checkOut) return null;
  const cell = (label: string, value: string) => (
    <div className="flex-1 flex items-center justify-center gap-2.5 py-3.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</span>
      <span className="text-lg font-bold text-navy" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>{value}</span>
    </div>
  );
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-line flex divide-x divide-line-2">
      {checkIn && cell("Check-in", checkIn)}
      {checkOut && cell("Check-out", checkOut)}
    </div>
  );
}
