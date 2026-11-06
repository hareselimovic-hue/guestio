"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, quoteStay, type Calendar, type DayInfo } from "@/lib/stays-calc";

interface Quote {
  ok: boolean;
  reason?: string;
  nights?: number;
  subtotal?: number;
  promoPercent?: number;
  promoRejected?: boolean;
  discount?: number;
  total?: number;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const money = (n: number, cur: string) => `${cur === "EUR" ? "€" : cur + " "}${Number.isInteger(n) ? n : n.toFixed(2)}`;
const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default function BookingWidget({ slug, maxGuests, freeCancellationDays }: { slug: string; maxGuests: number; freeCancellationDays: number }) {
  const [cal, setCal] = useState<Calendar | null>(null);
  const [today, setToday] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [error, setError] = useState("");
  const [month, setMonth] = useState(""); // YYYY-MM
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [guests, setGuests] = useState(2);
  const [promo, setPromo] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    fetch(`/api/stays/calendar?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setCal(Object.fromEntries((d.days as DayInfo[]).map((x) => [x.date, x])));
        setToday(d.today);
        setCurrency(d.currency);
        setMonth(d.today.slice(0, 7));
      })
      .catch(() => setError("Availability is temporarily unavailable."));
  }, [slug]);

  async function requestQuote(code: string) {
    if (!checkIn || !checkOut) return;
    setLoadingQuote(true);
    try {
      const r = await fetch("/api/stays/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, checkIn, checkOut, promo: code }),
      });
      setQuote(await r.json());
    } catch {
      setQuote({ ok: false, reason: "Could not check availability. Please try again." });
    } finally {
      setLoadingQuote(false);
    }
  }

  useEffect(() => {
    setQuote(null);
    if (checkIn && checkOut) void requestQuote(promo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut]);

  // Može li se `day` odabrati kao odlazak (sve noći od dolaska do tog dana su slobodne)?
  function canCheckOut(day: string) {
    if (!cal || !checkIn || checkOut || day <= checkIn) return false;
    for (let d = checkIn; d < day; d = addDays(d, 1)) if (!cal[d]?.available) return false;
    return true;
  }

  function pick(day: string) {
    if (!cal) return;
    setMessage("");
    if (checkIn && !checkOut && canCheckOut(day)) {
      const q = quoteStay(cal, checkIn, day);
      if (!q.ok) return setMessage(q.reason);
      return setCheckOut(day);
    }
    if (cal[day]?.available) {
      setCheckIn(day);
      setCheckOut(null);
    }
  }

  const grid = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split("-").map(Number);
    const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
  }, [month]);

  const shiftMonth = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  };

  const lastMonth = cal ? Object.keys(cal).sort().at(-1)!.slice(0, 7) : "";
  const [my, mm] = (month || "2000-01").split("-").map(Number);

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-3xl bg-white p-5 shadow-[0_10px_40px_-12px_rgba(12,74,71,0.25)]">
        <h2 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>Check availability</h2>

        {error && <p className="mt-4 rounded-xl bg-[#E23A2E]/10 p-3 text-sm text-[#B42318]">{error}</p>}
        {!cal && !error && <p className="mt-6 text-sm text-[#3A4A48]">Loading calendar…</p>}

        {cal && (
          <>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => shiftMonth(-1)} disabled={month <= today.slice(0, 7)} className="h-9 w-9 rounded-full border border-[#0C4A47]/20 disabled:opacity-30" aria-label="Previous month">‹</button>
              <span className="font-bold">{MONTHS[mm - 1]} {my}</span>
              <button onClick={() => shiftMonth(1)} disabled={month >= lastMonth} className="h-9 w-9 rounded-full border border-[#0C4A47]/20 disabled:opacity-30" aria-label="Next month">›</button>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold uppercase text-[#7D8A87]">
              {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {grid.map((d, i) => {
                if (!d) return <div key={i} />;
                const info = cal[d];
                const selectable = d >= today && (info?.available || canCheckOut(d));
                const isStart = d === checkIn;
                const isEnd = d === checkOut;
                const inRange = checkIn && checkOut && d > checkIn && d < checkOut;
                return (
                  <button
                    key={d}
                    disabled={!selectable}
                    onClick={() => pick(d)}
                    className={[
                      "flex h-12 flex-col items-center justify-center text-sm transition",
                      isStart || isEnd ? "rounded-xl bg-[#0C4A47] font-bold text-white" : inRange ? "bg-[#F6A96B]/40" : "rounded-xl",
                      selectable && !isStart && !isEnd ? "hover:bg-[#F6A96B]/30" : "",
                      !selectable ? "text-[#B7BFBD] line-through decoration-[#B7BFBD]/60" : "",
                    ].join(" ")}
                  >
                    <span>{Number(d.slice(8))}</span>
                    {info?.available && info.price != null && !isEnd && <span className="text-[10px] opacity-70">{money(info.price, currency)}</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#7D8A87]">Prices are per night. Struck-through dates are not available.</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#FAF4E8] p-3"><div className="text-xs font-semibold uppercase text-[#7D8A87]">Check-in</div><div className="font-bold">{checkIn ? fmt(checkIn) : "Select"}</div></div>
              <div className="rounded-xl bg-[#FAF4E8] p-3"><div className="text-xs font-semibold uppercase text-[#7D8A87]">Check-out</div><div className="font-bold">{checkOut ? fmt(checkOut) : "Select"}</div></div>
            </div>
            {message && <p className="mt-3 text-sm text-[#B42318]">{message}</p>}

            <label className="mt-4 block text-sm font-semibold">
              Guests
              <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-[#0C4A47]/20 bg-white p-3">
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>)}
              </select>
            </label>

            <div className="mt-4 flex gap-2">
              <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code" className="min-w-0 flex-1 rounded-xl border border-[#0C4A47]/20 p-3 text-sm uppercase" />
              <button onClick={() => requestQuote(promo)} disabled={!checkIn || !checkOut || loadingQuote} className="rounded-xl border border-[#0C4A47] px-4 text-sm font-bold text-[#0C4A47] disabled:opacity-40">Apply</button>
            </div>
            {quote?.promoRejected && <p className="mt-2 text-sm text-[#B42318]">This promo code is not valid.</p>}
            {!!quote?.promoPercent && <p className="mt-2 text-sm font-semibold text-[#0C4A47]">Promo applied: {quote.promoPercent}% off</p>}

            {checkIn && checkOut && (
              <div className="mt-5 border-t border-[#0C4A47]/10 pt-4 text-sm">
                {loadingQuote && <p>Checking…</p>}
                {quote && !quote.ok && <p className="text-[#B42318]">{quote.reason}</p>}
                {quote?.ok && (
                  <>
                    <div className="flex justify-between"><span>{quote.nights} night{quote.nights! > 1 ? "s" : ""}</span><span>{money(quote.subtotal!, currency)}</span></div>
                    {!!quote.discount && <div className="flex justify-between text-[#0C4A47]"><span>Promo discount</span><span>−{money(quote.discount, currency)}</span></div>}
                    <div className="mt-2 flex justify-between text-lg font-extrabold"><span>Total</span><span>{money(quote.total!, currency)}</span></div>
                  </>
                )}
              </div>
            )}

            <button disabled className="mt-5 w-full cursor-not-allowed rounded-2xl bg-[#0C4A47] py-4 font-bold text-white opacity-50">
              Online payment opens soon
            </button>
            <p className="mt-3 text-center text-xs text-[#3A4A48]">
              Free cancellation up to {freeCancellationDays} days before arrival.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
