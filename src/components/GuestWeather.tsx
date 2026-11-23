"use client";

import { useEffect, useState } from "react";

/**
 * Current weather (one line under the headline) for the guest guide's Home screen (Open-Meteo: free, no key).
 * Location: coordinates from the guide's map link; otherwise /api/guide/geo (short Google Maps links, address with town).
 * Renders nothing until it has data (or if anything fails) — the guide never depends on it.
 */

interface Weather {
  temp: number;
  code: number;
  isDay: boolean;
  offset: number; // seconds from UTC at the property
  days: { date: string; code: number; max: number; min: number }[];
}

const T: Record<string, { now: string; today: string; desc: (c: number) => string }> = {
  EN: { now: "Now", today: "Today", desc: (c) => group(c, ["Clear", "Partly cloudy", "Cloudy", "Fog", "Drizzle", "Rain", "Snow", "Showers", "Snow showers", "Thunderstorm"]) },
  BS: { now: "Sada", today: "Danas", desc: (c) => group(c, ["Vedro", "Djelimično oblačno", "Oblačno", "Magla", "Rosulja", "Kiša", "Snijeg", "Pljuskovi", "Snježni pljuskovi", "Grmljavina"]) },
  DE: { now: "Jetzt", today: "Heute", desc: (c) => group(c, ["Klar", "Teilweise bewölkt", "Bewölkt", "Nebel", "Nieselregen", "Regen", "Schnee", "Schauer", "Schneeschauer", "Gewitter"]) },
  TR: { now: "Şimdi", today: "Bugün", desc: (c) => group(c, ["Açık", "Parçalı bulutlu", "Bulutlu", "Sis", "Çisenti", "Yağmur", "Kar", "Sağanak", "Kar sağanağı", "Fırtına"]) },
  IT: { now: "Ora", today: "Oggi", desc: (c) => group(c, ["Sereno", "Parzialmente nuvoloso", "Nuvoloso", "Nebbia", "Pioviggine", "Pioggia", "Neve", "Rovesci", "Rovesci di neve", "Temporale"]) },
};
const LOCALE: Record<string, string> = { EN: "en-GB", BS: "bs-BA", DE: "de-DE", TR: "tr-TR", IT: "it-IT" };

/** WMO weather code → index into the description list */
function groupIndex(c: number) {
  if (c === 0) return 0;
  if (c <= 2) return 1;
  if (c === 3) return 2;
  if (c <= 48) return 3;
  if (c <= 57) return 4;
  if (c <= 67) return 5;
  if (c <= 77) return 6;
  if (c <= 82) return 7;
  if (c <= 86) return 8;
  return 9;
}
function group(c: number, words: string[]) { return words[groupIndex(c)]; }
function icon(c: number, isDay = true) {
  return [isDay ? "☀️" : "🌙", isDay ? "⛅" : "☁️", "☁️", "🌫️", "🌦️", "🌧️", "🌨️", "🌦️", "🌨️", "⛈️"][groupIndex(c)];
}

/** Coordinates from a Google Maps link (?q=lat,lng · @lat,lng · /place/…/@lat,lng) */
export function coordsFromMapUrl(url: string | undefined | null): [number, number] | null {
  if (!url) return null;
  const m = url.match(/[?&](?:q|query|ll)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/) ?? url.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

/** Server works out the location (resolves short Google Maps links, or a full address with the town) */
async function locate(slug: string): Promise<[number, number] | null> {
  const r = await fetch(`/api/guide/geo?slug=${encodeURIComponent(slug)}`);
  if (!r.ok) return null;
  const d = await r.json();
  return typeof d.lat === "number" && typeof d.lng === "number" ? [d.lat, d.lng] : null;
}

const CACHE_MIN = 30;

export default function GuestWeather({ slug, mapUrl, lang }: { slug: string; mapUrl?: string | null; lang: string }) {
  const [w, setW] = useState<Weather | null>(null);

  useEffect(() => {
    let alive = true;
    const key = `smartstay_weather_${slug}`;
    (async () => {
      try {
        const cached = JSON.parse(sessionStorage.getItem(key) ?? "null");
        if (cached && Date.now() - cached.at < CACHE_MIN * 60_000) { setW(cached.w); return; }
      } catch {}
      try {
        const coords = coordsFromMapUrl(mapUrl) ?? (await locate(slug));
        if (!coords) return;
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords[0]}&longitude=${coords[1]}` +
          "&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3",
        );
        if (!r.ok) return;
        const d = await r.json();
        const next: Weather = {
          temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, isDay: d.current.is_day === 1,
          offset: d.utc_offset_seconds ?? 0,
          days: d.daily.time.map((date: string, i: number) => ({
            date, code: d.daily.weather_code[i], max: Math.round(d.daily.temperature_2m_max[i]), min: Math.round(d.daily.temperature_2m_min[i]),
          })),
        };
        if (!alive) return;
        setW(next);
        try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), w: next })); } catch {}
      } catch { /* no weather — fine */ }
    })();
    return () => { alive = false; };
  }, [slug, mapUrl]);

  if (!w) return null;
  const t = T[lang] ?? T.EN;

  return (
    <p className="self-center inline-flex items-center gap-1.5 mt-3 text-[13px] text-white/85">
      <span className="text-[11px] uppercase tracking-wide font-semibold text-white/60">{t.now}</span>
      <span className="text-base leading-none">{icon(w.code, w.isDay)}</span>
      <span className="font-semibold text-white">{w.temp}°C</span>
      <span className="text-white/50">·</span>
      <span>{t.desc(w.code)}</span>
    </p>
  );
}
