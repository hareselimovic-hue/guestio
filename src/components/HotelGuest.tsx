"use client";

import React, { useEffect, useState } from "react";
import {
  Megaphone, BellRing, Sparkles, Bath, Wrench, AlarmClock, MessageSquarePlus, UtensilsCrossed,
  CalendarCheck, Gift, Star, X, Minus, Plus, CheckCircle2, Loader2, ExternalLink, BookOpen, ShoppingBag, BedDouble, Car, MapPin, QrCode,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HotelServiceItem {
  id: string;
  kind: string; // SERVICE | MENU | FACILITY
  category: string | null;
  name: string;
  description: string | null;
  price: number | null;
  priceNote: string | null;
}

export interface HotelAnnouncementItem {
  id: string;
  message: string;
  translations: Record<string, string> | null;
}

interface GuestCtx {
  slug: string;
  token: string;
  lang: string;
  roomNumber: string | null;
}

// ─── Strings ──────────────────────────────────────────────────────────────────

type Strings = typeof EN;

const EN = {
  room: "Room",
  cat: { FOOD: "Food & drink", STAY: "Your stay", TRANSPORT: "Transport", WELLNESS: "Wellness & bookings", TOURS: "Tours & experiences", OCCASIONS: "Special occasions", OTHER: "Other" } as Record<string, string>,
  emailLabel: "Email for updates (optional)",
  emailHint: "We'll only use this email to let you know the status of your request.",
  scanTitle: "Requests & orders from your room",
  scanBody: "Scan the QR code in your room to send requests to the reception and order extras — we'll know your room number automatically.",
  myRequests: "My requests",
  status: { NEW: "Received", IN_PROGRESS: "In progress", DONE: "Done", DECLINED: "Not possible" } as Record<string, string>,
  replyFrom: "Reception",
  tabGuide: "Guide",
  tabReception: "Reception",
  tabExtras: "Extras",
  all: "All",
  extrasShort: "Extras",
  noExtras: "No extras available yet.",
  receptionTitle: "Ask the reception",
  receptionSub: "Tap what you need — we'll take care of it.",
  quick: {
    HOUSEKEEPING: "Clean my room",
    TOWELS: "Fresh towels",
    ISSUE: "Something's not working",
    WAKEUP: "Wake-up call",
    OTHER: "Other request",
  } as Record<string, string>,
  menuTitle: "Room service",
  menuSub: "Order to your room",
  extrasTitle: "Extras for your stay",
  facilitiesTitle: "Book a spot",
  book: "Book",
  free: "Free",
  request: "Request",
  addToOrder: "Add",
  orderToRoom: "Order to my room",
  total: "Total",
  yourRoom: "Your room number",
  note: "Anything we should know? (optional)",
  issueNote: "What's not working?",
  whenWake: "Wake-up time",
  when: "Preferred date & time",
  guests: "Number of guests",
  send: "Send",
  sent: "Sent! The reception has received your request.",
  sentOrder: "Order sent! The reception will confirm shortly.",
  sentBooking: "Request sent! The reception will confirm your booking.",
  error: "Something went wrong — please try again or call the reception.",
  reviewTitle: "Enjoying your stay?",
  reviewBody: "A quick review on Google helps other travellers find us — it takes 30 seconds.",
  reviewCta: "Rate us on Google",
};

const STRINGS: Record<string, Strings> = {
  EN,
  DE: {
    room: "Zimmer",
    cat: { FOOD: "Essen & Getränke", STAY: "Ihr Aufenthalt", TRANSPORT: "Transport", WELLNESS: "Wellness & Reservierungen", TOURS: "Touren & Erlebnisse", OCCASIONS: "Besondere Anlässe", OTHER: "Sonstiges" } as Record<string, string>,
    emailLabel: "E-Mail für Updates (optional)",
    emailHint: "Wir verwenden diese E-Mail nur, um Sie über den Status Ihres Wunsches zu informieren.",
    scanTitle: "Wünsche & Bestellungen aus Ihrem Zimmer",
    scanBody: "Scannen Sie den QR-Code in Ihrem Zimmer, um Wünsche an die Rezeption zu senden und Extras zu bestellen — Ihre Zimmernummer erkennen wir automatisch.",
    myRequests: "Meine Wünsche",
    status: { NEW: "Erhalten", IN_PROGRESS: "In Bearbeitung", DONE: "Erledigt", DECLINED: "Nicht möglich" } as Record<string, string>,
    replyFrom: "Rezeption",
    tabGuide: "Guide",
    tabReception: "Rezeption",
    tabExtras: "Extras",
    all: "Alle",
    extrasShort: "Extras",
    noExtras: "Noch keine Extras verfügbar.",
    receptionTitle: "Fragen Sie die Rezeption",
    receptionSub: "Tippen Sie, was Sie brauchen — wir kümmern uns darum.",
    quick: { HOUSEKEEPING: "Zimmer reinigen", TOWELS: "Frische Handtücher", ISSUE: "Etwas funktioniert nicht", WAKEUP: "Weckruf", OTHER: "Anderer Wunsch" },
    menuTitle: "Zimmerservice",
    menuSub: "Aufs Zimmer bestellen",
    extrasTitle: "Extras für Ihren Aufenthalt",
    facilitiesTitle: "Platz reservieren",
    book: "Buchen",
    free: "Kostenlos",
    request: "Anfragen",
    addToOrder: "Hinzufügen",
    orderToRoom: "Aufs Zimmer bestellen",
    total: "Summe",
    yourRoom: "Ihre Zimmernummer",
    note: "Sonst noch etwas? (optional)",
    issueNote: "Was funktioniert nicht?",
    whenWake: "Weckzeit",
    when: "Gewünschtes Datum & Uhrzeit",
    guests: "Anzahl Personen",
    send: "Senden",
    sent: "Gesendet! Die Rezeption hat Ihren Wunsch erhalten.",
    sentOrder: "Bestellung gesendet! Die Rezeption bestätigt in Kürze.",
    sentBooking: "Anfrage gesendet! Die Rezeption bestätigt Ihre Buchung.",
    error: "Etwas ist schiefgelaufen — bitte erneut versuchen oder die Rezeption anrufen.",
    reviewTitle: "Gefällt Ihnen Ihr Aufenthalt?",
    reviewBody: "Eine kurze Bewertung auf Google hilft anderen Reisenden, uns zu finden — dauert nur 30 Sekunden.",
    reviewCta: "Bewerten Sie uns auf Google",
  },
  TR: {
    room: "Oda",
    cat: { FOOD: "Yiyecek & içecek", STAY: "Konaklamanız", TRANSPORT: "Ulaşım", WELLNESS: "Wellness & rezervasyon", TOURS: "Turlar & deneyimler", OCCASIONS: "Özel günler", OTHER: "Diğer" } as Record<string, string>,
    emailLabel: "Güncellemeler için e-posta (isteğe bağlı)",
    emailHint: "Bu e-postayı yalnızca isteğinizin durumunu bildirmek için kullanacağız.",
    scanTitle: "Odanızdan istekler ve siparişler",
    scanBody: "Resepsiyona istek göndermek ve ekstra sipariş vermek için odanızdaki QR kodu okutun — oda numaranızı otomatik olarak alırız.",
    myRequests: "İsteklerim",
    status: { NEW: "Alındı", IN_PROGRESS: "İşleniyor", DONE: "Tamamlandı", DECLINED: "Mümkün değil" } as Record<string, string>,
    replyFrom: "Resepsiyon",
    tabGuide: "Rehber",
    tabReception: "Resepsiyon",
    tabExtras: "Ekstralar",
    all: "Tümü",
    extrasShort: "Ekstralar",
    noExtras: "Henüz ekstra yok.",
    receptionTitle: "Resepsiyona sorun",
    receptionSub: "İhtiyacınıza dokunun — gerisini biz hallederiz.",
    quick: { HOUSEKEEPING: "Odamı temizleyin", TOWELS: "Temiz havlu", ISSUE: "Bir şey çalışmıyor", WAKEUP: "Uyandırma", OTHER: "Diğer istek" },
    menuTitle: "Oda servisi",
    menuSub: "Odanıza sipariş verin",
    extrasTitle: "Konaklamanız için ekstralar",
    facilitiesTitle: "Rezervasyon yapın",
    book: "Rezerve et",
    free: "Ücretsiz",
    request: "İste",
    addToOrder: "Ekle",
    orderToRoom: "Odama sipariş ver",
    total: "Toplam",
    yourRoom: "Oda numaranız",
    note: "Bilmemiz gereken bir şey var mı? (isteğe bağlı)",
    issueNote: "Ne çalışmıyor?",
    whenWake: "Uyandırma saati",
    when: "Tercih edilen tarih ve saat",
    guests: "Kişi sayısı",
    send: "Gönder",
    sent: "Gönderildi! Resepsiyon isteğinizi aldı.",
    sentOrder: "Sipariş gönderildi! Resepsiyon kısa süre içinde onaylayacak.",
    sentBooking: "İstek gönderildi! Resepsiyon rezervasyonunuzu onaylayacak.",
    error: "Bir sorun oluştu — lütfen tekrar deneyin veya resepsiyonu arayın.",
    reviewTitle: "Konaklamanızdan memnun musunuz?",
    reviewBody: "Google’da kısa bir yorum, diğer gezginlerin bizi bulmasına yardımcı olur — sadece 30 saniye sürer.",
    reviewCta: "Bizi Google’da değerlendirin",
  },
  IT: {
    room: "Camera",
    cat: { FOOD: "Cibo & bevande", STAY: "Il tuo soggiorno", TRANSPORT: "Trasporti", WELLNESS: "Benessere & prenotazioni", TOURS: "Tour & esperienze", OCCASIONS: "Occasioni speciali", OTHER: "Altro" } as Record<string, string>,
    emailLabel: "Email per aggiornamenti (facoltativa)",
    emailHint: "Useremo questa email solo per informarti sullo stato della tua richiesta.",
    scanTitle: "Richieste e ordini dalla tua camera",
    scanBody: "Scansiona il codice QR nella tua camera per inviare richieste alla reception e ordinare extra — riconosciamo automaticamente il numero della camera.",
    myRequests: "Le mie richieste",
    status: { NEW: "Ricevuta", IN_PROGRESS: "In corso", DONE: "Fatto", DECLINED: "Non possibile" } as Record<string, string>,
    replyFrom: "Reception",
    tabGuide: "Guida",
    tabReception: "Reception",
    tabExtras: "Extra",
    all: "Tutti",
    extrasShort: "Extra",
    noExtras: "Nessun extra disponibile.",
    receptionTitle: "Chiedi alla reception",
    receptionSub: "Tocca ciò di cui hai bisogno — ci pensiamo noi.",
    quick: { HOUSEKEEPING: "Pulizia camera", TOWELS: "Asciugamani puliti", ISSUE: "Qualcosa non funziona", WAKEUP: "Sveglia", OTHER: "Altra richiesta" },
    menuTitle: "Servizio in camera",
    menuSub: "Ordina in camera",
    extrasTitle: "Extra per il tuo soggiorno",
    facilitiesTitle: "Prenota",
    book: "Prenota",
    free: "Gratis",
    request: "Richiedi",
    addToOrder: "Aggiungi",
    orderToRoom: "Ordina in camera",
    total: "Totale",
    yourRoom: "Numero della camera",
    note: "Qualcosa da sapere? (facoltativo)",
    issueNote: "Cosa non funziona?",
    whenWake: "Orario della sveglia",
    when: "Data e ora preferite",
    guests: "Numero di persone",
    send: "Invia",
    sent: "Inviato! La reception ha ricevuto la tua richiesta.",
    sentOrder: "Ordine inviato! La reception confermerà a breve.",
    sentBooking: "Richiesta inviata! La reception confermerà la prenotazione.",
    error: "Qualcosa è andato storto — riprova o chiama la reception.",
    reviewTitle: "Ti piace il soggiorno?",
    reviewBody: "Una breve recensione su Google aiuta altri viaggiatori a trovarci — bastano 30 secondi.",
    reviewCta: "Valutaci su Google",
  },
};

const t = (lang: string) => STRINGS[lang] ?? EN;

// This device's requests (ids) and the guest's email, so "My requests" and the email field survive reloads
const EMAIL_KEY = "smartstay_guest_email";
const requestsKey = (slug: string) => `smartstay_requests_${slug}`;
function readIds(slug: string): string[] {
  try { return JSON.parse(localStorage.getItem(requestsKey(slug)) ?? "[]"); } catch { return []; }
}
function rememberRequest(slug: string, id: string) {
  try { localStorage.setItem(requestsKey(slug), JSON.stringify([id, ...readIds(slug)].slice(0, 30))); } catch {}
}
const km = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const HEADING = { fontFamily: "Plus Jakarta Sans Variable, sans-serif" };

async function postJSON(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// ─── Announcements banner (hotels only) ───────────────────────────────────────

export function HotelAnnouncements({ items, lang }: { items: HotelAnnouncementItem[]; lang: string }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-[#FF6700] text-white">
      {items.map((a) => (
        <div key={a.id} className="px-4 py-2.5 border-b border-white/20 last:border-b-0">
          <p className="max-w-2xl mx-auto text-center text-sm font-medium leading-snug">
            <Megaphone className="inline w-4 h-4 mr-1.5 -mt-0.5 align-middle" />
            {a.translations?.[lang] ?? a.message}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-bold text-lg text-[#262626]" style={HEADING}>{title}</h3>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#6B6B6B]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-[#EDEDE9] rounded-xl px-3.5 py-3 text-sm text-[#262626] outline-none focus:border-[#0F2F61] bg-white";

// ─── Services panel: reception, room service, extras, facilities ─────────────

type Pending =
  | { kind: "quick"; type: string }
  | { kind: "item"; item: HotelServiceItem }
  | { kind: "order" };

// Fixed service categories — the category decides how a guest orders
const CATEGORY_ORDER = ["FOOD", "STAY", "TRANSPORT", "WELLNESS", "TOURS", "OCCASIONS", "OTHER"];
const CATEGORY_LOOK: Record<string, { icon: typeof Gift; tone: string }> = {
  FOOD: { icon: UtensilsCrossed, tone: "bg-rose-50 text-rose-600" },
  STAY: { icon: BedDouble, tone: "bg-sky-50 text-sky-600" },
  TRANSPORT: { icon: Car, tone: "bg-slate-100 text-slate-600" },
  WELLNESS: { icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-600" },
  TOURS: { icon: MapPin, tone: "bg-orange-50 text-orange-600" },
  OCCASIONS: { icon: Gift, tone: "bg-pink-50 text-pink-600" },
  OTHER: { icon: Gift, tone: "bg-amber-50 text-amber-600" },
};
/** Asks for a date/time (and number of guests) when booking items of these categories */
const ASKS_WHEN = new Set(["TRANSPORT", "WELLNESS", "TOURS"]);
const ASKS_GUESTS = new Set(["WELLNESS", "TOURS"]);

const QUICK = [
  { type: "HOUSEKEEPING", icon: Sparkles },
  { type: "TOWELS", icon: Bath },
  { type: "ISSUE", icon: Wrench },
  { type: "WAKEUP", icon: AlarmClock },
  { type: "OTHER", icon: MessageSquarePlus },
];

export type HotelView = "reception" | "extras";

export function HotelServicesPanel({ ctx, services, view }: { ctx: GuestCtx; services: HotelServiceItem[]; view: HotelView }) {
  const s = t(ctx.lang);
  const [pending, setPending] = useState<Pending | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [chip, setChip] = useState("__all");
  const [sentCount, setSentCount] = useState(0); // bumps "My requests" after each send
  // The general hotel link is read-only; requests and orders only from a room link (QR in the room)
  const canOrder = !!ctx.roomNumber;

  // Food & drink is ordered with a cart; every other category is one request per item
  const menu = services.filter((x) => x.kind === "FOOD");
  const groups = CATEGORY_ORDER.filter((c) => c !== "FOOD" && services.some((x) => x.kind === c));
  const cartItems = menu.filter((m) => cart[m.id]);
  const cartCount = cartItems.reduce((n, m) => n + cart[m.id], 0);
  const cartTotal = cartItems.reduce((sum, m) => sum + (m.price ?? 0) * cart[m.id], 0);

  // Extras tab: one chip per category the hotel actually offers
  const chips = [
    { key: "__all", label: s.all },
    ...(menu.length ? [{ key: "FOOD", label: s.cat.FOOD }] : []),
    ...groups.map((c) => ({ key: c, label: s.cat[c] })),
  ];
  const show = (key: string) => chip === "__all" || chip === key;

  function done(message: string) {
    setPending(null);
    setToast(message);
    setTimeout(() => setToast(""), 5000);
  }

  return (
    <>
      {view === "reception" && !canOrder && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-[#0F2F61]/30 px-5 py-5 flex gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#0F2F61]/10 text-[#0F2F61]"><QrCode className="w-5 h-5" /></div>
          <div>
            <h2 className="font-bold text-[#262626] text-base leading-tight" style={HEADING}>{s.scanTitle}</h2>
            <p className="text-sm text-[#6B6B6B] mt-1 leading-relaxed">{s.scanBody}</p>
          </div>
        </div>
      )}

      {view === "reception" && canOrder && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-[#0F2F61] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0EE]">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#0F2F61]/10 text-[#0F2F61]">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-[#262626] text-base leading-tight" style={HEADING}>{s.receptionTitle}</h2>
              <p className="text-xs text-[#9B9B9B] mt-0.5">{s.receptionSub}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {QUICK.map(({ type, icon: Icon }, i) => (
              <button
                key={type}
                onClick={() => setPending({ kind: "quick", type })}
                className={`flex items-center gap-2.5 bg-[#F7F7F5] hover:bg-[#EFEFEB] active:scale-[0.98] transition rounded-xl px-3 py-3 text-left ${i === QUICK.length - 1 ? "col-span-2" : ""}`}
              >
                <Icon className="w-4 h-4 text-[#0F2F61] shrink-0" />
                <span className="text-sm font-medium text-[#262626] leading-tight">{s.quick[type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "reception" && canOrder && <MyRequests ctx={ctx} refreshKey={sentCount} />}

      {view === "extras" && (
        <>
          {chips.length > 2 && (
            <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-[#F7F7F5]/95 backdrop-blur-sm">
              <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {chips.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setChip(c.key)}
                    className={`shrink-0 text-sm font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                      chip === c.key ? "bg-[#0F2F61] border-[#0F2F61] text-white" : "bg-white border-[#EDEDE9] text-[#262626]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chips.length === 1 && <p className="text-center text-sm text-[#6B6B6B] py-10">{s.noExtras}</p>}

          {!canOrder && chips.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-[#0F2F61]/30 px-5 py-5 flex gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#0F2F61]/10 text-[#0F2F61]"><QrCode className="w-5 h-5" /></div>
              <div>
                <h2 className="font-bold text-[#262626] text-base leading-tight" style={HEADING}>{s.scanTitle}</h2>
                <p className="text-sm text-[#6B6B6B] mt-1 leading-relaxed">{s.scanBody}</p>
              </div>
            </div>
          )}

          {/* Room service */}
          {menu.length > 0 && show("FOOD") && (
            <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0EE]">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-rose-50 text-rose-600">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-[#262626] text-base leading-tight" style={HEADING}>{s.cat.FOOD}</h2>
                  <p className="text-xs text-[#9B9B9B] mt-0.5">{s.menuSub}</p>
                </div>
              </div>
              <div className="px-5 py-3">
                <div className="py-2">
                    {menu.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F2] last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#262626]">{m.name}</p>
                          {m.description && <p className="text-xs text-[#6B6B6B] leading-snug mt-0.5">{m.description}</p>}
                          {m.price !== null && <p className="text-xs font-semibold text-[#0F2F61] mt-1">{km(m.price)}</p>}
                        </div>
                        {!canOrder ? null : cart[m.id] ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button aria-label="−" onClick={() => setCart((c) => ({ ...c, [m.id]: c[m.id] - 1 }))} className="w-9 h-9 rounded-full border border-[#0F2F61]/30 bg-white flex items-center justify-center text-[#0F2F61] active:scale-95 transition-transform"><Minus className="w-4 h-4" /></button>
                            <span className="w-4 text-center text-sm font-bold text-[#262626]">{cart[m.id]}</span>
                            <button aria-label="+" onClick={() => setCart((c) => ({ ...c, [m.id]: Math.min(c[m.id] + 1, 20) }))} className="w-9 h-9 rounded-full bg-[#0F2F61] flex items-center justify-center text-white active:scale-95 transition-transform"><Plus className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setCart((c) => ({ ...c, [m.id]: 1 }))} aria-label={s.addToOrder} title={s.addToOrder}
                            className="shrink-0 w-9 h-9 rounded-full border border-[#0F2F61]/30 bg-white flex items-center justify-center text-[#0F2F61] hover:bg-[#0F2F61]/5 active:scale-95 transition-transform">
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Every other category: one card each */}
          {groups.filter((c) => show(c)).map((c) => {
            const look = CATEGORY_LOOK[c];
            const Icon = look.icon;
            return (
              <ServiceListCard
                key={c}
                title={s.cat[c]}
                icon={<Icon className="w-5 h-5" />}
                tone={look.tone}
                items={services.filter((x) => x.kind === c)}
                action={ASKS_GUESTS.has(c) ? s.book : s.request}
                s={s}
                onPick={canOrder ? (item) => setPending({ kind: "item", item }) : undefined}
              />
            );
          })}

          {/* Floating cart above the tab bar */}
          {cartCount > 0 && !pending && (
            <div className="fixed left-4 right-4 bottom-[96px] z-40 flex justify-center">
              <button
                onClick={() => setPending({ kind: "order" })}
                className="w-full max-w-xl flex items-center justify-between gap-2 bg-[#FF6700] hover:bg-[#e05c00] text-white text-sm font-semibold px-4 py-3.5 rounded-2xl shadow-lg transition-colors"
              >
                <span className="whitespace-nowrap truncate">{s.orderToRoom} ({cartCount})</span>
                <span className="whitespace-nowrap">{km(cartTotal)}</span>
              </button>
            </div>
          )}
        </>
      )}

      {pending && (
        <RequestSheet
          ctx={ctx}
          pending={pending}
          cartItems={cartItems.map((m) => ({ id: m.id, name: m.name, qty: cart[m.id], price: m.price }))}
          cartTotal={cartTotal}
          onClose={() => setPending(null)}
          onDone={(msg) => {
            if (pending.kind === "order") setCart({});
            setSentCount((n) => n + 1);
            done(msg);
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-[60] flex justify-center pointer-events-none">
          <div className="bg-[#16803D] text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-md">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {toast}
          </div>
        </div>
      )}
    </>
  );
}

// ─── My requests (status for the guest, no login) ────────────────────────────

interface MyRequest { id: string; type: string; status: string; items: { name: string; qty: number }[] | null; createdAt: string; reply: string | null }

const STATUS_TONE: Record<string, string> = {
  NEW: "bg-orange-50 text-[#FF6700]", IN_PROGRESS: "bg-blue-50 text-blue-700", DONE: "bg-green-50 text-green-700", DECLINED: "bg-gray-100 text-gray-600",
};

function MyRequests({ ctx, refreshKey }: { ctx: GuestCtx; refreshKey: number }) {
  const s = t(ctx.lang);
  const [items, setItems] = useState<MyRequest[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const ids = readIds(ctx.slug);
      if (ids.length === 0) return;
      try {
        const res = await fetch(`/api/hotel/public/requests?slug=${encodeURIComponent(ctx.slug)}&ids=${ids.join(",")}`);
        if (res.ok && alive) setItems(await res.json());
      } catch {}
    }
    load();
    const timer = setInterval(load, 20000);
    return () => { alive = false; clearInterval(timer); };
  }, [ctx.slug, refreshKey]);

  if (items.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
      <p className="px-5 py-3.5 border-b border-[#F0F0EE] font-bold text-[#262626] text-base" style={HEADING}>{s.myRequests}</p>
      <ul className="divide-y divide-[#F5F5F2]">
        {items.map((r) => {
          const what = r.items?.length ? r.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.name}` : i.name)).join(", ") : s.quick[r.type] ?? r.type;
          const time = new Date(r.createdAt);
          return (
            <li key={r.id} className="px-5 py-3">
              <div className="flex items-center gap-2">
                <p className="flex-1 min-w-0 text-sm font-medium text-[#262626] truncate">{what}</p>
                <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE[r.status] ?? STATUS_TONE.NEW}`}>{s.status[r.status] ?? r.status}</span>
              </div>
              <p className="text-[11px] text-[#9B9B9B] mt-0.5">{String(time.getHours()).padStart(2, "0")}:{String(time.getMinutes()).padStart(2, "0")}</p>
              {r.reply && (
                <p className="mt-1.5 text-sm text-[#262626] bg-[#F7F7F5] rounded-lg px-3 py-2"><span className="text-xs font-semibold text-[#0F2F61]">{s.replyFrom}: </span>{r.reply}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Bottom tab bar (hotels) ──────────────────────────────────────────────────

export type HotelTab = "guide" | HotelView;

export function HotelTabBar({ tab, onChange, lang }: { tab: HotelTab; onChange: (t: HotelTab) => void; lang: string }) {
  const s = t(lang);
  const items: { key: HotelTab; label: string; icon: typeof BookOpen }[] = [
    { key: "guide", label: s.tabGuide, icon: BookOpen },
    { key: "reception", label: s.tabReception, icon: BellRing },
    { key: "extras", label: s.tabExtras, icon: ShoppingBag },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EDEDE9] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto flex">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${tab === key ? "text-[#FF6700]" : "text-[#8A8A85]"}`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function ServiceListCard({ title, icon, tone, items, action, onPick, s }: {
  s: Strings; title: string; icon: React.ReactNode; tone: string; items: HotelServiceItem[]; action: string; onPick?: (i: HotelServiceItem) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0EE]">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
        <h2 className="font-bold text-[#262626] text-base" style={HEADING}>{title}</h2>
      </div>
      <div className="px-5 py-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 py-3 border-b border-[#F5F5F2] last:border-b-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#262626]">{it.name}</p>
              {it.description && <p className="text-xs text-[#6B6B6B] leading-snug mt-0.5">{it.description}</p>}
              {it.price !== null && (
                <p className="text-xs font-semibold text-[#0F2F61] mt-1">
                  {it.price === 0 ? s.free : km(it.price)}{it.priceNote ? <span className="font-normal text-[#9B9B9B]"> · {it.priceNote}</span> : null}
                </p>
              )}
            </div>
            {onPick && (
              <button onClick={() => onPick(it)} className="shrink-0 h-9 text-xs font-semibold text-[#0F2F61] bg-white border border-[#0F2F61]/30 hover:bg-[#0F2F61]/5 rounded-full px-3.5 active:scale-95 transition-transform">
                {action}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestSheet({ ctx, pending, cartItems, cartTotal, onClose, onDone }: {
  ctx: GuestCtx;
  pending: Pending;
  cartItems: { id: string; name: string; qty: number; price: number | null }[];
  cartTotal: number;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const s = t(ctx.lang);
  const [room, setRoom] = useState(ctx.roomNumber ?? "");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const [guests, setGuests] = useState("2");
  const [email, setEmail] = useState("");
  useEffect(() => { try { setEmail(localStorage.getItem(EMAIL_KEY) ?? ""); } catch {} }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const title =
    pending.kind === "quick" ? s.quick[pending.type]
    : pending.kind === "order" ? s.orderToRoom
    : pending.item.name;
  const askWhen = (pending.kind === "quick" && pending.type === "WAKEUP") || (pending.kind === "item" && ASKS_WHEN.has(pending.item.kind));
  const askGuests = pending.kind === "item" && ASKS_GUESTS.has(pending.item.kind);

  async function submit() {
    if (!room.trim()) { setError(s.yourRoom); return; }
    setBusy(true);
    setError("");
    const type = pending.kind === "quick" ? pending.type : pending.kind === "order" ? "ORDER" : "BOOKING";
    const items =
      pending.kind === "order" ? cartItems.map((i) => ({ id: i.id, qty: i.qty }))
      : pending.kind === "quick" ? undefined
      : [{ id: pending.item.id, qty: 1 }];
    try {
      const res = await postJSON("/api/hotel/public/request", {
        slug: ctx.slug, token: ctx.token, lang: ctx.lang, roomNumber: room, type, items, note,
        scheduledFor: askWhen ? when : undefined, guests: askGuests ? guests : undefined, guestEmail: email.trim() || undefined,
      });
      if (res?.id) rememberRequest(ctx.slug, res.id);
      try { if (email.trim()) localStorage.setItem(EMAIL_KEY, email.trim()); } catch {}
      onDone(type === "ORDER" ? s.sentOrder : type === "BOOKING" ? s.sentBooking : s.sent);
    } catch {
      setError(s.error);
      setBusy(false);
    }
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="space-y-3">
        {pending.kind === "order" && (
          <div className="bg-[#F7F7F5] rounded-xl p-3 space-y-1.5">
            {cartItems.map((i) => (
              <div key={i.id} className="flex justify-between text-sm text-[#262626]">
                <span>{i.qty} × {i.name}</span>
                {i.price !== null && <span className="text-[#6B6B6B]">{km(i.price * i.qty)}</span>}
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold text-[#0F2F61] pt-1.5 border-t border-[#EDEDE9]">
              <span>{s.total}</span><span>{km(cartTotal)}</span>
            </div>
          </div>
        )}
        {pending.kind === "item" && pending.item.description && (
          <p className="text-sm text-[#6B6B6B]">{pending.item.description}</p>
        )}

        {ctx.roomNumber ? (
          <p className="inline-flex text-xs font-semibold bg-[#0F2F61]/10 text-[#0F2F61] px-2.5 py-1 rounded-full">{s.room} {ctx.roomNumber}</p>
        ) : (
          <label className="block">
            <span className="text-xs font-medium text-[#6B6B6B]">{s.yourRoom}</span>
            <input value={room} onChange={(e) => setRoom(e.target.value)} inputMode="numeric" className={`${inputCls} mt-1`} />
          </label>
        )}

        {askWhen && (
          <label className="block">
            <span className="text-xs font-medium text-[#6B6B6B]">{pending.kind === "quick" ? s.whenWake : s.when}</span>
            <input
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              type={pending.kind === "quick" ? "time" : "datetime-local"}
              className={`${inputCls} mt-1`}
            />
          </label>
        )}
        {askGuests && (
          <label className="block">
            <span className="text-xs font-medium text-[#6B6B6B]">{s.guests}</span>
            <input value={guests} onChange={(e) => setGuests(e.target.value)} type="number" min={1} max={50} className={`${inputCls} mt-1`} />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-medium text-[#6B6B6B]">{pending.kind === "quick" && pending.type === "ISSUE" ? s.issueNote : s.note}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`${inputCls} mt-1 resize-none`} />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[#6B6B6B]">{s.emailLabel}</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" className={`${inputCls} mt-1`} />
          <span className="block text-[11px] text-[#9B9B9B] mt-1">{s.emailHint}</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-[#FF6700] hover:bg-[#e05c00] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {s.send}
        </button>
      </div>
    </Sheet>
  );
}

// ─── Google review card (like the printed cards at a hotel reception) ────────

function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

export function GoogleReviewCard({ lang, url }: { lang: string; url: string }) {
  const s = t(lang);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] px-5 py-5 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <GoogleG />
        <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="w-5 h-5 fill-[#FBBC04] text-[#FBBC04]" />)}</span>
      </div>
      <h2 className="font-bold text-[#262626] text-lg" style={HEADING}>{s.reviewTitle}</h2>
      <p className="text-sm text-[#6B6B6B] leading-relaxed mt-1 mb-4">{s.reviewBody}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#0F2F61] hover:bg-[#0a2347] text-white text-sm font-semibold px-5 py-3 rounded-xl"
      >
        {s.reviewCta} <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export function roomLabel(lang: string) {
  return t(lang).room;
}
