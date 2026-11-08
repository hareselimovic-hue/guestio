"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import {
  BellRing, DoorOpen, UtensilsCrossed, Megaphone, Star, Loader2, Trash2, Download, Printer,
  ExternalLink, RefreshCw, Eye, EyeOff, Copy, Check, BookOpen, QrCode, X,
} from "lucide-react";
import SectionEditor, { SectionForm } from "@/components/SectionEditor";

interface HotelRef { id: string; name: string; slug: string; reviewUrl: string | null }

interface GuestRequest {
  id: string; roomNumber: string | null; type: string; status: string; note: string | null;
  scheduledFor: string | null; guests: number | null; lang: string | null; createdAt: string;
  guestEmail: string | null; staffReply: string | null;
  items: { name: string; qty: number; price: number | null }[] | null;
  property: { name: string };
}
interface Room { id: string; token: string; roomNumber: string; viewCount: number; customSections: number }
interface Service {
  id: string; kind: string; category: string | null; name: string; description: string | null;
  price: number | null; priceNote: string | null; active: boolean;
}
interface Announcement {
  id: string; message: string; translations: Record<string, string> | null; active: boolean;
  expiresAt: string | null; createdAt: string;
}

const TABS = [
  { key: "requests", label: "Requests", icon: BellRing },
  { key: "guide", label: "Hotel guide", icon: BookOpen },
  { key: "rooms", label: "Rooms", icon: DoorOpen },
  { key: "services", label: "Services", icon: UtensilsCrossed },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "review", label: "Google review", icon: Star },
] as const;

const TYPE_LABEL: Record<string, string> = {
  HOUSEKEEPING: "Room cleaning", TOWELS: "Fresh towels", ISSUE: "Something's not working",
  WAKEUP: "Wake-up call", OTHER: "Other request", ORDER: "Room service order", BOOKING: "Booking / extra",
};
const TYPE_TONE: Record<string, string> = {
  ISSUE: "bg-red-50 text-red-700", ORDER: "bg-rose-50 text-rose-700", BOOKING: "bg-emerald-50 text-emerald-700",
  WAKEUP: "bg-amber-50 text-amber-700",
};
const STATUS_LABEL: Record<string, string> = { NEW: "New", IN_PROGRESS: "In progress", DONE: "Done", DECLINED: "Declined" };

const km = (n: number) => `${n.toFixed(2).replace(".", ",")} KM`;
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  return fmtDateTime(iso);
}

const card = "bg-white border border-[#EDEDE9] rounded-2xl";
const input = "w-full border border-[#EDEDE9] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F2F61] bg-white";
const btnPrimary = "inline-flex items-center justify-center gap-1.5 bg-[#0F2F61] hover:bg-[#0a2347] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors";

export default function HotelDashboard({ hotels, current, initialTab }: { hotels: HotelRef[]; current: HotelRef; initialTab: string }) {
  const router = useRouter();
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : "requests");

  function go(next: { property?: string; tab?: string }) {
    const p = next.property ?? current.id;
    const t = next.tab ?? tab;
    if (next.tab) setTab(next.tab);
    router.replace(`/dashboard/hotel?property=${p}&tab=${t}`, { scroll: false });
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[#262626]">Hotel</h1>
          {hotels.length > 1 ? (
            <select value={current.id} onChange={(e) => go({ property: e.target.value })} className="mt-1 text-sm border border-[#EDEDE9] rounded-lg px-2 py-1 bg-white">
              {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          ) : (
            <p className="text-sm text-[#6B6B6B] mt-0.5 truncate">{current.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <a href={`/g/${current.slug}/preview`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] bg-white px-3 py-1.5 rounded-lg">
            <ExternalLink className="w-3.5 h-3.5" /> Guest view
          </a>
          <Link href={`/dashboard/properties/${current.id}`} className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] bg-white px-3 py-1.5 rounded-lg">
            Property settings
          </Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 border-b border-[#EDEDE9]">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => go({ tab: key })}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === key ? "border-[#FF6700] text-[#262626]" : "border-transparent text-[#6B6B6B] hover:text-[#262626]"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "requests" && <RequestsTab propertyId={current.id} />}
      {tab === "guide" && <GuideTab key={current.id} propertyId={current.id} />}
      {tab === "rooms" && <RoomsTab hotel={current} />}
      {tab === "services" && <ServicesTab propertyId={current.id} />}
      {tab === "announcements" && <AnnouncementsTab propertyId={current.id} slug={current.slug} />}
      {tab === "review" && <ReviewTab hotel={current} />}
    </div>
  );
}

// ─── Requests ────────────────────────────────────────────────────────────────

function RequestsTab({ propertyId }: { propertyId: string }) {
  const [items, setItems] = useState<GuestRequest[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/hotel/requests?propertyId=${propertyId}${showAll ? "" : "&open=1"}`);
    if (res.ok) setItems(await res.json());
  }, [propertyId, showAll]);

  // New requests appear without reloading the page
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    await fetch(`/api/hotel/requests/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reply: replies[id] ?? "" }),
    });
    setReplies((r) => { const n = { ...r }; delete n[id]; return n; });
    setBusy(null);
    load();
  }

  if (!items) return <Spinner />;
  const fresh = items.filter((r) => r.status === "NEW").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#6B6B6B]">
          {fresh > 0 ? <span className="font-semibold text-[#FF6700]">{fresh} new</span> : "No new requests"}
          <span className="text-[#BABAB5]"> · refreshes automatically</span>
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-[#6B6B6B]">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show finished
          </label>
          <button onClick={load} className="text-[#6B6B6B] hover:text-[#262626]" aria-label="Refresh"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm text-[#6B6B6B]`}>
          Guest requests from the guide (reception, room service, bookings) show up here.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const total = r.items?.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0) ?? 0;
            const finished = r.status === "DONE" || r.status === "DECLINED";
            return (
              <div key={r.id} className={`${card} p-4 flex gap-4 ${r.status === "NEW" ? "border-[#FF6700] border-2" : ""} ${finished ? "opacity-60" : ""}`}>
                <div className="w-16 shrink-0 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-[#9B9B9B] font-semibold">Room</p>
                  <p className="text-2xl font-bold text-[#0F2F61] leading-tight break-words">{r.roomNumber ?? "—"}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_TONE[r.type] ?? "bg-blue-50 text-blue-700"}`}>{TYPE_LABEL[r.type] ?? r.type}</span>
                    <span className="text-xs text-[#9B9B9B]">{ago(r.createdAt)}</span>
                    {r.lang && r.lang !== "EN" && <span className="text-[10px] font-semibold text-[#9B9B9B] border border-[#EDEDE9] rounded px-1">{r.lang}</span>}
                    {finished && <span className="text-xs text-[#6B6B6B]">· {STATUS_LABEL[r.status]}</span>}
                  </div>
                  {r.items && r.items.length > 0 && (
                    <ul className="mt-2 text-sm text-[#262626] space-y-0.5">
                      {r.items.map((i, idx) => <li key={idx}>{i.qty} × {i.name}{i.price ? <span className="text-[#9B9B9B]"> · {km(i.price * i.qty)}</span> : null}</li>)}
                      {total > 0 && <li className="font-semibold text-[#0F2F61]">Total {km(total)}</li>}
                    </ul>
                  )}
                  {(r.scheduledFor || r.guests) && (
                    <p className="text-sm text-[#262626] mt-1">
                      {r.scheduledFor && <>🕐 {r.scheduledFor.replace("T", " ")}</>}{r.scheduledFor && r.guests ? " · " : ""}{r.guests ? `${r.guests} guests` : ""}
                    </p>
                  )}
                  {r.note && <p className="text-sm text-[#262626] mt-1 bg-[#F7F7F5] rounded-lg px-2.5 py-1.5 whitespace-pre-wrap">“{r.note}”</p>}
                  {r.staffReply && <p className="text-xs text-[#0F2F61] mt-1.5">↳ Your reply: {r.staffReply}</p>}
                  {r.guestEmail && !finished && <p className="text-xs text-[#6B6B6B] mt-1.5">✉ The guest gets an email when you take it and when it&apos;s done.</p>}
                  {!finished && (
                    <input
                      value={replies[r.id] ?? ""}
                      onChange={(e) => setReplies((x) => ({ ...x, [r.id]: e.target.value }))}
                      maxLength={300}
                      placeholder="Reply to the guest (optional) — e.g. “Transfer confirmed for 07:30” · translated automatically"
                      className="mt-3 w-full border border-[#EDEDE9] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0F2F61]"
                    />
                  )}
                  {!finished && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {r.status === "NEW" && (
                        <button disabled={busy === r.id} onClick={() => setStatus(r.id, "IN_PROGRESS")} className="text-xs font-semibold bg-[#0F2F61] text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Take it</button>
                      )}
                      <button disabled={busy === r.id} onClick={() => setStatus(r.id, "DONE")} className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">Done</button>
                      <button disabled={busy === r.id} onClick={() => setStatus(r.id, "DECLINED")} className="text-xs text-[#6B6B6B] hover:text-red-500 px-2">Decline</button>
                      {r.status === "IN_PROGRESS" && <span className="text-xs text-amber-600 font-medium self-center">In progress</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Guide (same section editor as apartments) ───────────────────────────────

type GuideSection = { id: string; type: string; title: string; content: Record<string, unknown>; isVisible: boolean; order: number };

function GuideTab({ propertyId }: { propertyId: string }) {
  const [sections, setSections] = useState<GuideSection[] | null>(null);
  useEffect(() => {
    fetch(`/api/properties/${propertyId}`).then((r) => r.json()).then((p) => setSections(p.sections ?? []));
  }, [propertyId]);

  if (!sections) return <Spinner />;
  return (
    <div>
      <p className="text-sm text-[#6B6B6B] mb-4">
        The general guide for the whole hotel: check-in, Wi-Fi, location, house rules, recommendations… Every room shows this, unless you change a section for a specific room under Rooms.
        For check-in choose <strong>Personal welcome</strong> (reception).
      </p>
      <SectionEditor sections={sections} propertyId={propertyId} onUpdate={setSections} />
    </div>
  );
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

function RoomsTab({ hotel }: { hotel: HotelRef }) {
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [qrRoom, setQrRoom] = useState<Room | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/hotel/${hotel.id}/rooms`);
    if (res.ok) setRooms((await res.json()).rooms);
  }, [hotel.id]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setBusy(true); setMsg("");
    const res = await fetch(`/api/hotel/${hotel.id}/rooms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rooms: value }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(d.error ?? "Error"); return; }
    setMsg(`${d.created} room${d.created === 1 ? "" : "s"} added${d.skipped ? `, ${d.skipped} already existed` : ""}. New rooms follow the hotel guide.`);
    setValue("");
    load();
  }

  async function remove(r: Room) {
    if (!confirm(`Delete room ${r.roomNumber}? Its QR code will stop working.`)) return;
    await fetch(`/api/hotel/${hotel.id}/rooms?id=${r.id}`, { method: "DELETE" });
    load();
  }

  if (editing && rooms) {
    return <RoomEditor hotel={hotel} roomId={editing} rooms={rooms} onBack={() => { setEditing(null); load(); }} onQr={setQrRoom} qrRoom={qrRoom} closeQr={() => setQrRoom(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className={`${card} p-5`}>
        <p className="font-semibold text-[#262626]">Add rooms</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5 mb-3">
          A new room automatically shows everything from the <strong>Hotel guide</strong>. Open a room only to change what&apos;s different there (e.g. Wi-Fi or parking).
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 101-110, 201-210, Suite A" className={input} />
          <button onClick={add} disabled={busy || !value.trim()} className={btnPrimary}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Add
          </button>
        </div>
        {msg && <p className="text-sm text-[#0F2F61] mt-2">{msg}</p>}
      </div>

      {!rooms ? <Spinner /> : rooms.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-[#6B6B6B]">{rooms.length} rooms</p>
            <a href={`/print/rooms?property=${hotel.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F2F61] hover:underline">
              <Printer className="w-4 h-4" /> Print all QR cards
            </a>
          </div>
          <div className={`${card} divide-y divide-[#F5F5F2]`}>
            {rooms.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setEditing(r.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left group">
                  <span className="w-14 shrink-0 text-lg font-bold text-[#0F2F61]">{r.roomNumber}</span>
                  <span className="min-w-0">
                    {r.customSections > 0
                      ? <span className="text-xs font-semibold text-[#FF6700] bg-orange-50 px-2 py-0.5 rounded-full">{r.customSections} custom section{r.customSections === 1 ? "" : "s"}</span>
                      : <span className="text-xs text-[#9B9B9B]">Same as hotel guide</span>}
                    <span className="block text-[11px] text-[#BABAB5] mt-0.5">{r.viewCount} opens</span>
                  </span>
                </button>
                <button onClick={() => setEditing(r.id)} className="text-xs font-semibold text-[#0F2F61] border border-[#0F2F61]/30 rounded-lg px-2.5 py-1.5 hover:bg-[#0F2F61]/5">Edit</button>
                <button onClick={() => setQrRoom(r)} title="QR code" className="p-1.5 rounded-lg border border-[#EDEDE9] text-[#6B6B6B] hover:text-[#0F2F61]"><QrCode className="w-4 h-4" /></button>
                <a href={`/g/${hotel.slug}/${r.token}`} target="_blank" title="Open as guest" className="p-1.5 rounded-lg border border-[#EDEDE9] text-[#6B6B6B] hover:text-[#0F2F61]"><ExternalLink className="w-4 h-4" /></a>
                <button onClick={() => remove(r)} title="Delete" className="p-1.5 rounded-lg border border-[#EDEDE9] text-[#6B6B6B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {qrRoom && <QrModal hotel={hotel} room={qrRoom} onClose={() => setQrRoom(null)} />}
    </div>
  );
}

function QrModal({ hotel, room, onClose }: { hotel: HotelRef; room: Room; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/g/${hotel.slug}/${room.token}`;
  function download() {
    const canvas = document.getElementById(`qr-${room.id}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `QR-room-${room.roomNumber}.png`;
    a.click();
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between w-full">
          <p className="font-bold text-[#262626]">Room {room.roomNumber}</p>
          <button onClick={onClose} className="text-[#6B6B6B] hover:text-[#262626]"><X className="w-5 h-5" /></button>
        </div>
        <QRCodeCanvas id={`qr-${room.id}`} value={url} size={200} fgColor="#0F2F61" level="M" marginSize={2} />
        <a href={`/print/rooms?property=${hotel.id}&room=${room.id}`} target="_blank" className={`${btnPrimary} w-full`}>
          <Printer className="w-4 h-4" /> Print QR card
        </a>
        <div className="grid grid-cols-2 gap-2 w-full">
          <button onClick={download} className="flex items-center justify-center gap-1.5 text-sm text-[#262626] border border-[#EDEDE9] rounded-lg py-2"><Download className="w-4 h-4" /> PNG</button>
          <button
            onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="flex items-center justify-center gap-1.5 text-sm text-[#262626] border border-[#EDEDE9] rounded-lg py-2"
          >
            {copied ? <><Check className="w-4 h-4 text-green-600" /> Copied</> : <><Copy className="w-4 h-4" /> Link</>}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RoomDetail {
  hotel: { id: string; name: string; slug: string };
  room: { id: string; token: string; roomNumber: string };
  sections: GuideSection[];
  overrides: Record<string, Record<string, unknown>>;
}

function RoomEditor({ hotel, roomId, rooms, onBack, onQr, qrRoom, closeQr }: {
  hotel: HotelRef; roomId: string; rooms: Room[]; onBack: () => void;
  onQr: (r: Room) => void; qrRoom: Room | null; closeQr: () => void;
}) {
  const [data, setData] = useState<RoomDetail | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [applyFor, setApplyFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/hotel/${hotel.id}/rooms/${roomId}`);
    if (res.ok) setData(await res.json());
  }, [hotel.id, roomId]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <Spinner />;
  const room = rooms.find((r) => r.id === roomId);
  const visible = data.sections.filter((s) => s.isVisible);

  async function save(sectionId: string) {
    setBusy(sectionId); setNote("");
    await fetch(`/api/hotel/${hotel.id}/rooms/${roomId}/sections/${sectionId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: drafts[sectionId] }),
    });
    setDrafts((d) => { const n = { ...d }; delete n[sectionId]; return n; });
    setBusy(null);
    setNote("Saved — this section is now specific to this room (translated automatically).");
    load();
  }
  async function reset(sectionId: string) {
    if (!confirm("Use the hotel guide version again for this section?")) return;
    setBusy(sectionId);
    await fetch(`/api/hotel/${hotel.id}/rooms/${roomId}/sections/${sectionId}`, { method: "DELETE" });
    setDrafts((d) => { const n = { ...d }; delete n[sectionId]; return n; });
    setBusy(null);
    load();
  }

  return (
    <div>
      <button onClick={onBack} className="text-sm text-[#6B6B6B] hover:text-[#262626] mb-3">← All rooms</button>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#262626]">Room {data.room.roomNumber}</h2>
          <p className="text-sm text-[#6B6B6B]">
            Everything follows the <strong>Hotel guide</strong>. Change a section here only if it&apos;s different in this room — the rest keeps updating from the hotel.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {room && <button onClick={() => onQr(room)} className="inline-flex items-center gap-1.5 text-sm text-[#262626] border border-[#EDEDE9] bg-white px-3 py-1.5 rounded-lg"><QrCode className="w-4 h-4" /> QR</button>}
          <a href={`/g/${hotel.slug}/${data.room.token}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-[#262626] border border-[#EDEDE9] bg-white px-3 py-1.5 rounded-lg"><ExternalLink className="w-4 h-4" /> Open as guest</a>
        </div>
      </div>
      {note && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">{note}</p>}

      <div className="space-y-2">
        {visible.map((s) => {
          const custom = !!data.overrides[s.id];
          const content = drafts[s.id] ?? data.overrides[s.id] ?? s.content;
          const dirty = !!drafts[s.id];
          const open = openId === s.id;
          return (
            <div key={s.id} className={`bg-white border rounded-xl overflow-hidden ${custom ? "border-[#FF6700]/50" : "border-[#EDEDE9]"}`}>
              <button onClick={() => setOpenId(open ? null : s.id)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#F7F7F5]">
                <span className="font-medium text-[#262626] text-sm flex-1">{s.title}</span>
                {custom
                  ? <span className="text-[11px] font-semibold text-[#FF6700] bg-orange-50 px-2 py-0.5 rounded-full">Custom for this room</span>
                  : <span className="text-[11px] text-[#9B9B9B] bg-[#F7F7F5] px-2 py-0.5 rounded-full">Same as hotel</span>}
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 border-t border-[#F0F0EE]">
                  {!custom && !dirty && (
                    <p className="text-xs text-[#6B6B6B] bg-[#F7F7F5] rounded-lg px-3 py-2 my-2">
                      Showing the hotel guide version. Edit below to make it different for room {data.room.roomNumber} only.
                    </p>
                  )}
                  <SectionForm
                    section={{ ...s, content }}
                    onChange={(changes) => { if (changes.content) setDrafts((d) => ({ ...d, [s.id]: changes.content as Record<string, unknown> })); }}
                  />
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button onClick={() => save(s.id)} disabled={!dirty || busy === s.id} className={btnPrimary}>
                      {busy === s.id && <Loader2 className="w-4 h-4 animate-spin" />} Save for this room
                    </button>
                    {custom && (
                      <>
                        <button onClick={() => setApplyFor(s.id)} className="text-sm font-medium text-[#0F2F61] border border-[#0F2F61]/30 rounded-lg px-3 py-2">Apply to other rooms…</button>
                        <button onClick={() => reset(s.id)} className="text-sm text-[#6B6B6B] hover:text-red-500 px-2">Reset to hotel guide</button>
                      </>
                    )}
                    {dirty && <button onClick={() => setDrafts((d) => { const n = { ...d }; delete n[s.id]; return n; })} className="text-sm text-[#6B6B6B] px-2">Cancel</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {applyFor && (
        <ApplyModal
          hotelId={hotel.id}
          roomId={roomId}
          sectionId={applyFor}
          sectionTitle={data.sections.find((s) => s.id === applyFor)?.title ?? ""}
          rooms={rooms.filter((r) => r.id !== roomId)}
          onClose={(applied) => { setApplyFor(null); if (applied) setNote(`Applied to ${applied} room${applied === 1 ? "" : "s"}.`); }}
        />
      )}
      {qrRoom && <QrModal hotel={hotel} room={qrRoom} onClose={closeQr} />}
    </div>
  );
}

function ApplyModal({ hotelId, roomId, sectionId, sectionTitle, rooms, onClose }: {
  hotelId: string; roomId: string; sectionId: string; sectionTitle: string; rooms: Room[]; onClose: (applied?: number) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function apply() {
    setBusy(true);
    const res = await fetch(`/api/hotel/${hotelId}/rooms/${roomId}/sections/${sectionId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomIds: [...picked] }),
    });
    const d = await res.json();
    setBusy(false);
    onClose(d.applied ?? 0);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => onClose()}>
      <div className="bg-white rounded-2xl p-5 shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <p className="font-bold text-[#262626]">Apply “{sectionTitle}” to other rooms</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5 mb-3">The selected rooms get this room&apos;s version of the section.</p>
        <div className="flex gap-3 text-xs mb-2">
          <button onClick={() => setPicked(new Set(rooms.map((r) => r.id)))} className="text-[#0F2F61] font-medium">Select all</button>
          <button onClick={() => setPicked(new Set())} className="text-[#6B6B6B]">None</button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-64 overflow-y-auto">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              className={`text-sm font-semibold rounded-lg py-2 border ${picked.has(r.id) ? "bg-[#0F2F61] text-white border-[#0F2F61]" : "bg-white text-[#262626] border-[#EDEDE9]"}`}
            >
              {r.roomNumber}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => onClose()} className="text-sm text-[#6B6B6B] px-3">Cancel</button>
          <button onClick={apply} disabled={busy || picked.size === 0} className={btnPrimary}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Apply to {picked.size} room{picked.size === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Services ────────────────────────────────────────────────────────────────

// Fixed categories; the category decides how guests order (see HotelGuest.tsx)
const CATEGORIES: { key: string; label: string; how: string }[] = [
  { key: "FOOD", label: "Food & drink", how: "Guests add items to a cart and order to the room — breakfast, meals, drinks." },
  { key: "STAY", label: "Your stay", how: "One tap + note — late check-out, early check-in, extra bed, baby cot." },
  { key: "TRANSPORT", label: "Transport", how: "Guest picks date & time — airport transfer, parking, car rental." },
  { key: "WELLNESS", label: "Wellness & bookings", how: "Guest picks date, time and number of guests — spa, sauna, restaurant table." },
  { key: "TOURS", label: "Tours & experiences", how: "Guest picks date and number of guests — city tour, day trips." },
  { key: "OCCASIONS", label: "Special occasions", how: "One tap + note — flowers, cake, sparkling wine in the room." },
  { key: "OTHER", label: "Other", how: "One tap + note." },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

function ServicesTab({ propertyId }: { propertyId: string }) {
  const [items, setItems] = useState<Service[] | null>(null);
  const [form, setForm] = useState({ kind: "FOOD", name: "", description: "", price: "", priceNote: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/hotel/${propertyId}/services`);
    if (res.ok) setItems(await res.json());
  }, [propertyId]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setBusy(true); setError("");
    const res = await fetch(`/api/hotel/${propertyId}/services`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error ?? "Error"); return; }
    setForm({ ...form, name: "", description: "", price: "", priceNote: "" }); // keep the category for the next item
    load();
  }
  async function toggle(s: Service) {
    await fetch(`/api/hotel/${propertyId}/services`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, active: !s.active }) });
    load();
  }
  async function remove(s: Service) {
    if (!confirm(`Delete “${s.name}”?`)) return;
    await fetch(`/api/hotel/${propertyId}/services?id=${s.id}`, { method: "DELETE" });
    load();
  }

  if (!items) return <Spinner />;
  const how = CATEGORIES.find((c) => c.key === form.kind)?.how;
  const used = CATEGORIES.filter((c) => items.some((i) => i.kind === c.key));

  return (
    <div className="space-y-6">
      <div className={`${card} p-5`}>
        <p className="font-semibold text-[#262626]">Add a service</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5 mb-3">
          Everything guests can order or book. Guests see it under <strong>Extras</strong>, one tab per category. Write names and descriptions in English.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={`${input} sm:col-span-2`}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name, e.g. Airport transfer" className={`${input} sm:col-span-4`} />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description (optional)" className={`${input} sm:col-span-6`} />
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price KM (empty = on request, 0 = free)" inputMode="decimal" className={`${input} sm:col-span-3`} />
          <input value={form.priceNote} onChange={(e) => setForm({ ...form, priceNote: e.target.value })} placeholder="Price note, e.g. per person" className={`${input} sm:col-span-3`} />
        </div>
        {how && <p className="text-xs text-[#6B6B6B] mt-2">{how}</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <button onClick={add} disabled={busy || !form.name.trim()} className={`${btnPrimary} mt-3`}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Add service
        </button>
      </div>

      {items.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm text-[#6B6B6B]`}>No services yet. Start with breakfast or an airport transfer.</div>
      ) : used.map((c) => (
        <div key={c.key} className={`${card} overflow-hidden`}>
          <p className="px-5 py-3 border-b border-[#F0F0EE] font-semibold text-[#262626]">{c.label}</p>
          <ul className="divide-y divide-[#F5F5F2]">
            {items.filter((i) => i.kind === c.key).map((s) => (
              <li key={s.id} className={`flex items-center gap-3 px-5 py-3 ${s.active ? "" : "opacity-50"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#262626]">{s.name}</p>
                  {s.description && <p className="text-xs text-[#6B6B6B] truncate">{s.description}</p>}
                </div>
                <p className="text-sm text-[#0F2F61] font-medium shrink-0">
                  {s.price === null ? "—" : s.price === 0 ? "Free" : km(s.price)}
                  {s.priceNote && <span className="text-xs text-[#9B9B9B] font-normal"> {s.priceNote}</span>}
                </p>
                <button onClick={() => toggle(s)} title={s.active ? "Hide from guests" : "Show to guests"} className="text-[#6B6B6B] hover:text-[#0F2F61]">
                  {s.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(s)} title="Delete" className="text-[#6B6B6B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── Announcements ───────────────────────────────────────────────────────────

const DURATIONS = [
  { label: "Until I turn it off", hours: 0 },
  { label: "3 hours", hours: 3 },
  { label: "12 hours", hours: 12 },
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "7 days", hours: 168 },
];

function AnnouncementsTab({ propertyId, slug }: { propertyId: string; slug: string }) {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [message, setMessage] = useState("");
  const [hours, setHours] = useState(0);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/hotel/${propertyId}/announcements`);
    if (res.ok) setItems(await res.json());
  }, [propertyId]);
  useEffect(() => { load(); }, [load]);

  async function publish() {
    setBusy(true);
    await fetch(`/api/hotel/${propertyId}/announcements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, hours }) });
    setBusy(false);
    setMessage("");
    load();
  }
  async function toggle(a: Announcement, active: boolean) {
    await fetch(`/api/hotel/${propertyId}/announcements`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, active }) });
    load();
  }
  async function remove(a: Announcement) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/hotel/${propertyId}/announcements?id=${a.id}`, { method: "DELETE" });
    load();
  }

  const isLive = (a: Announcement) => a.active && (!a.expiresAt || new Date(a.expiresAt) > new Date());

  return (
    <div className="space-y-6">
      <div className={`${card} p-5`}>
        <p className="font-semibold text-[#262626]">New announcement</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5 mb-3">
          Shown as an orange bar at the top of the guide for every guest. Write it in Bosnian or English — it&apos;s translated automatically to EN, DE, TR and IT.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="npr. Večeras od 20h live muzika u lobby baru — dobrodošli!"
          className={`${input} resize-none`}
        />
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={`${input} sm:w-56`}>
            {DURATIONS.map((d) => <option key={d.hours} value={d.hours}>Visible: {d.label}</option>)}
          </select>
          <button onClick={publish} disabled={busy || !message.trim()} className={btnPrimary}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Translating…</> : <><Megaphone className="w-4 h-4" /> Publish to guests</>}
          </button>
        </div>
      </div>

      {!items ? <Spinner /> : items.length > 0 && (
        <div className="space-y-2">
          {items.map((a) => {
            const live = isLive(a);
            return (
              <div key={a.id} className={`${card} p-4`}>
                <div className="flex items-start gap-3">
                  <Megaphone className={`w-4 h-4 mt-0.5 shrink-0 ${live ? "text-[#FF6700]" : "text-[#BABAB5]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${live ? "text-[#262626]" : "text-[#9B9B9B]"}`}>{a.message}</p>
                    <p className="text-xs text-[#9B9B9B] mt-1">
                      {live ? <span className="text-green-600 font-semibold">Live</span> : a.active ? "Expired" : "Off"}
                      {" · "}{fmtDateTime(a.createdAt)}
                      {a.expiresAt && live && <> · until {fmtDateTime(a.expiresAt)}</>}
                      {a.translations && (
                        <button onClick={() => setOpen(open === a.id ? null : a.id)} className="ml-2 text-[#0F2F61] hover:underline">
                          {open === a.id ? "hide translations" : "translations"}
                        </button>
                      )}
                    </p>
                    {open === a.id && a.translations && (
                      <div className="mt-2 space-y-1 bg-[#F7F7F5] rounded-lg p-2.5">
                        {Object.entries(a.translations).map(([l, text]) => (
                          <p key={l} className="text-xs text-[#262626]"><span className="font-semibold text-[#9B9B9B] w-6 inline-block">{l}</span> {text}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {live
                      ? <button onClick={() => toggle(a, false)} className="text-xs font-medium text-[#6B6B6B] border border-[#EDEDE9] rounded-lg px-2.5 py-1 hover:text-[#262626]">Turn off</button>
                      : <button onClick={() => toggle(a, true)} className="text-xs font-medium text-[#0F2F61] border border-[#0F2F61]/30 rounded-lg px-2.5 py-1">Show again</button>}
                    <button onClick={() => remove(a)} title="Delete" className="text-[#6B6B6B] hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
          <a href={`/g/${slug}/preview`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-[#0F2F61] hover:underline mt-1">
            <ExternalLink className="w-3.5 h-3.5" /> See it as a guest
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Feedback ────────────────────────────────────────────────────────────────

function ReviewTab({ hotel }: { hotel: HotelRef }) {
  const [reviewUrl, setReviewUrl] = useState(hotel.reviewUrl ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function saveUrl() {
    const url = reviewUrl.trim();
    if (url && !/^https?:\/\//.test(url)) { setError("Paste the full link, starting with https://"); return; }
    setError("");
    await fetch(`/api/properties/${hotel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewUrl: url }) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className={`${card} p-5`}>
        <p className="font-semibold text-[#262626]">Google review link</p>
        <p className="text-sm text-[#6B6B6B] mt-0.5 mb-3">
          Guests see a <strong>“Rate us on Google”</strong> card at the bottom of the guide — like the review cards at a reception desk.
          Without a link the card is hidden.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} placeholder="https://g.page/r/…/review" className={input} />
          <button onClick={saveUrl} className={btnPrimary}>{saved ? <><Check className="w-4 h-4" /> Saved</> : "Save"}</button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <p className="text-xs text-[#9B9B9B] mt-3">
          Where to find it: Google Business Profile → <em>Ask for reviews</em> (or <em>Get more reviews</em>) → copy the link.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#0F2F61]" /></div>;
}
