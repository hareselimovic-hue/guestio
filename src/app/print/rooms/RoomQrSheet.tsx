"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Wifi, BellRing, UtensilsCrossed, MapPin } from "lucide-react";

const FEATURES = [
  { icon: Wifi, label: "Wi-Fi" },
  { icon: BellRing, label: "Reception" },
  { icon: UtensilsCrossed, label: "Room service" },
  { icon: MapPin, label: "Local tips" },
];

// Print-ready QR cards: hotel name, room, what the QR is for, the code. Two cards per A4 row.
export default function RoomQrSheet({ hotelName, rooms }: { hotelName: string; rooms: { id: string; roomNumber: string; path: string }[] }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="min-h-screen bg-canvas print:bg-white p-6 print:p-0" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`@page { size: A4; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="max-w-[190mm] mx-auto">
        <div className="flex items-center justify-between mb-5 print:hidden">
          <div>
            <p className="font-semibold text-ink">{hotelName} · QR cards</p>
            <p className="text-sm text-ink-2">{rooms.length} {rooms.length === 1 ? "card" : "cards"} · 2 per row on A4 · each card 9.2 × 12.8 cm · cut along the dashed lines</p>
          </div>
          <button onClick={() => window.print()} className="bg-navy text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Print</button>
        </div>

        {origin && (
          <div className="grid grid-cols-2 gap-[6mm]">
            {rooms.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-dashed border-[#CFCFCA] rounded-[4mm] overflow-hidden flex flex-col items-center text-center break-inside-avoid"
                style={{ height: "128mm" }}
              >
                <div className="w-full bg-navy text-white py-[4mm] px-[4mm]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Welcome to</p>
                  <p className="text-lg font-bold leading-tight truncate" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>{hotelName}</p>
                </div>

                <div className="flex-1 flex flex-col items-center px-[5mm] py-[4mm]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">Room</p>
                  <p className={`${r.roomNumber.length <= 5 ? "text-4xl" : r.roomNumber.length <= 9 ? "text-3xl" : "text-2xl"} font-bold text-navy leading-none mb-[3mm] whitespace-nowrap max-w-full overflow-hidden text-ellipsis`}>{r.roomNumber}</p>

                  <p className="text-base font-bold text-ink leading-snug" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>Your digital room guide</p>
                  <p className="text-[11px] text-ink-2 mb-[3mm]">Scan with your phone camera — no app needed</p>

                  <div className="p-[2mm] border-2 border-orange rounded-[3mm]">
                    <QRCodeSVG value={`${origin}${r.path}`} size={150} fgColor="#0F2F61" level="M" />
                  </div>

                  <div className="grid grid-cols-4 gap-1 w-full mt-[4mm]">
                    {FEATURES.map(({ icon: Icon, label }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <Icon className="w-4 h-4 text-orange" />
                        <span className="text-[9px] font-medium text-ink leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[8.5px] text-ink-3 mt-[3mm] leading-snug">
                    Zimmer-Guide · Oda rehberi · Guida della camera · Vodič za sobu
                  </p>
                </div>
                <p className="w-full text-[8px] text-ink-4 pb-[2mm]">Powered by SmartStay</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
