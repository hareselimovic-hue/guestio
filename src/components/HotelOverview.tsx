"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, DoorOpen, Eye, Wallet, Megaphone, ArrowRight, TrendingUp, AlertTriangle, Mail } from "lucide-react";
import { ReceptionEmailForm } from "@/components/ReceptionEmail";

export interface HotelOverviewData {
  id: string;
  name: string;
  newRequests: number;
  inProgress: number;
  rooms: number;
  customRooms: number;
  opensToday: number;
  opens7d: number;
  receptionEmail: string | null;
  defaultRecipients: string[];
  guideIssues: string[];
  hasReviewUrl: boolean;
  ordered7d: number;
  openRequests: { id: string; roomNumber: string | null; type: string; status: string; summary: string; createdAt: string }[];
  topExtras: { name: string; count: number }[];
  announcements: { id: string; message: string }[];
}

const TYPE_LABEL: Record<string, string> = {
  HOUSEKEEPING: "Room cleaning", TOWELS: "Fresh towels", ISSUE: "Something's not working",
  WAKEUP: "Wake-up call", OTHER: "Other request", ORDER: "Room service", BOOKING: "Booking / extra",
};

const km = (n: number) => `${Math.round(n).toLocaleString("de-DE")} KM`;
function ago(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} h`;
  return `${Math.floor(min / 1440)} d`;
}

export default function HotelOverview({ hotel }: { hotel: HotelOverviewData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const base = `/dashboard/hotel?property=${hotel.id}`;

  async function setStatus(id: string, status: string) {
    setBusy(id);
    await fetch(`/api/hotel/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(null);
    router.refresh();
  }
  async function turnOff(id: string) {
    setBusy(id);
    await fetch(`/api/hotel/${hotel.id}/announcements`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active: false }) });
    setBusy(null);
    router.refresh();
  }

  const tiles = [
    { icon: BellRing, value: hotel.newRequests, label: "new requests", sub: hotel.inProgress ? `${hotel.inProgress} in progress` : "nothing in progress", href: `${base}&tab=requests`, hot: hotel.newRequests > 0 },
    { icon: DoorOpen, value: hotel.rooms, label: "rooms", sub: hotel.customRooms ? `${hotel.customRooms} with own info` : "all follow the hotel guide", href: `${base}&tab=rooms` },
    { icon: Eye, value: hotel.opensToday, label: "guide opens today", sub: `${hotel.opens7d} in 7 days (room QR)`, href: "/dashboard/analytics" },
    { icon: Wallet, value: km(hotel.ordered7d), label: "ordered", sub: "extras & room service · 7 days", href: `${base}&tab=requests` },
  ];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-[#262626] min-w-0 truncate">{hotel.name}</h2>
        <div className="flex gap-2 shrink-0">
          <Link href={`${base}&tab=announcements`} className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-[#FF6700] hover:bg-[#e05c00] px-3 py-1.5 rounded-lg">
            <Megaphone className="w-4 h-4" /> <span className="hidden sm:inline">New announcement</span><span className="sm:hidden">Announce</span>
          </Link>
          <Link href={base} className="inline-flex items-center gap-1 text-sm font-medium text-[#0F2F61] border border-[#EDEDE9] bg-white px-3 py-1.5 rounded-lg">
            <span className="hidden sm:inline">Open hotel</span><span className="sm:hidden">Open</span> <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {tiles.map(({ icon: Icon, value, label, sub, href, hot }) => (
          <Link key={label} href={href} className={`bg-white rounded-xl p-4 border hover:border-[#0F2F61]/40 transition-colors ${hot ? "border-[#FF6700] border-2" : "border-[#EDEDE9]"}`}>
            <Icon className={`w-4 h-4 mb-2 ${hot ? "text-[#FF6700]" : "text-[#0F2F61]"}`} />
            <p className="text-2xl font-bold text-[#262626] leading-none">{value}</p>
            <p className="text-sm text-[#262626] mt-1">{label}</p>
            <p className="text-xs text-[#9B9B9B] mt-0.5">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Needs attention: reception email (fill in right here) + gaps in the hotel guide */}
      {(!hotel.receptionEmail || hotel.guideIssues.length > 0 || hotel.rooms === 0 || !hotel.hasReviewUrl) && (
        <div className="bg-white rounded-xl border border-[#EDEDE9] mb-4">
          <p className="px-4 py-3 border-b border-[#F0F0EE] text-sm font-semibold text-[#262626] flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Needs attention
          </p>
          <ul className="divide-y divide-[#F5F5F2]">
            {!hotel.receptionEmail && (
              <li className="px-4 py-3">
                <p className="text-sm text-[#262626] flex items-center gap-1.5 mb-0.5"><Mail className="w-4 h-4 text-[#FF6700]" /> <span className="font-medium">Add your reception email</span></p>
                <p className="text-xs text-[#6B6B6B] mb-2">
                  Guest requests are emailed here. Right now they go to {hotel.defaultRecipients.join(", ") || "your account email"}.
                </p>
                <ReceptionEmailForm hotelId={hotel.id} initial={null} />
              </li>
            )}
            {hotel.guideIssues.length > 0 && (
              <li><Link href={`${base}&tab=guide`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="flex-1 text-sm"><span className="font-medium text-[#262626]">Hotel guide</span><span className="text-[#6B6B6B]"> — {hotel.guideIssues.join(", ")}</span></span>
                <span className="text-xs font-semibold text-[#0F2F61] shrink-0">Fix →</span>
              </Link></li>
            )}
            {hotel.rooms === 0 && (
              <li><Link href={`${base}&tab=rooms`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                <DoorOpen className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="flex-1 text-sm text-[#262626]">Add your rooms and print the QR cards</span>
                <span className="text-xs font-semibold text-[#0F2F61] shrink-0">Add →</span>
              </Link></li>
            )}
            {!hotel.hasReviewUrl && (
              <li><Link href={`${base}&tab=review`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                <span className="w-4 text-center text-sm shrink-0">★</span>
                <span className="flex-1 text-sm text-[#262626]">Add your Google review link <span className="text-[#9B9B9B]">— guests see “Rate us on Google”</span></span>
                <span className="text-xs font-semibold text-[#0F2F61] shrink-0">Add →</span>
              </Link></li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#EDEDE9] min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EE]">
            <p className="text-sm font-semibold text-[#262626]">Waiting for you</p>
            <Link href={`${base}&tab=requests`} className="text-xs font-medium text-[#0F2F61] hover:underline">All requests →</Link>
          </div>
          {hotel.openRequests.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[#9B9B9B] text-center">All caught up — no open requests.</p>
          ) : (
            <ul className="divide-y divide-[#F5F5F2]">
              {hotel.openRequests.map((r) => (
                <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-12 shrink-0 text-lg font-bold text-[#0F2F61]">{r.roomNumber ?? "—"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#262626] truncate">
                      {TYPE_LABEL[r.type] ?? r.type}
                      {r.status === "IN_PROGRESS" && <span className="text-xs text-amber-600 font-medium"> · in progress</span>}
                    </p>
                    <p className="text-xs text-[#6B6B6B] truncate">{r.summary || "—"} · {ago(r.createdAt)}</p>
                  </div>
                  {r.status === "NEW" && (
                    <button disabled={busy === r.id} onClick={() => setStatus(r.id, "IN_PROGRESS")} className="text-xs font-semibold bg-[#0F2F61] text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50">Take</button>
                  )}
                  <button disabled={busy === r.id} onClick={() => setStatus(r.id, "DONE")} className="text-xs font-semibold bg-green-600 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50">Done</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          <div className="bg-white rounded-xl border border-[#EDEDE9] px-4 py-3">
            <p className="text-sm font-semibold text-[#262626] mb-2 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-[#0F2F61]" /> Most requested · 30 days</p>
            {hotel.topExtras.length === 0 ? (
              <p className="text-sm text-[#9B9B9B]">No orders yet.</p>
            ) : (
              <ol className="space-y-1">
                {hotel.topExtras.map((x, i) => (
                  <li key={x.name} className="flex justify-between text-sm"><span className="text-[#262626]">{i + 1}. {x.name}</span><span className="text-[#6B6B6B]">{x.count}×</span></li>
                ))}
              </ol>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[#EDEDE9] px-4 py-3">
            <p className="text-sm font-semibold text-[#262626] mb-2 flex items-center gap-1.5"><Megaphone className="w-4 h-4 text-[#FF6700]" /> Live announcement</p>
            {hotel.announcements.length === 0 ? (
              <p className="text-sm text-[#9B9B9B]">Nothing shown to guests right now.</p>
            ) : hotel.announcements.map((a) => (
              <div key={a.id} className="flex items-start gap-2 py-1">
                <p className="text-sm text-[#262626] flex-1">“{a.message}”</p>
                <button disabled={busy === a.id} onClick={() => turnOff(a.id)} className="text-xs text-[#6B6B6B] border border-[#EDEDE9] rounded-lg px-2 py-1 shrink-0 hover:text-[#262626]">Turn off</button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
