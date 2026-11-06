"use client";

import { useCallback, useEffect, useState } from "react";
import type { StayPhoto } from "@/lib/stays-photos";

export default function Gallery({ photos, name }: { photos: StayPhoto[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((n: number) => setOpen((i) => (i === null ? i : (i + n + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  if (!photos.length) return null;
  const side = photos.slice(1, 5);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <button onClick={() => setOpen(0)} className="relative col-span-4 h-72 overflow-hidden rounded-2xl sm:col-span-2 sm:row-span-2 sm:h-[26rem]" aria-label="Open photo 1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[0].src} alt={`${name} — ${photos[0].alt}`} className="h-full w-full object-cover" fetchPriority="high" />
        </button>
        {side.map((p, i) => (
          <button key={p.src} onClick={() => setOpen(i + 1)} className="relative hidden h-[12.75rem] overflow-hidden rounded-2xl sm:block" aria-label={`Open photo ${i + 2}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={`${name} — ${p.alt}`} className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
            {i === side.length - 1 && photos.length > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-[#0C4A47]/60 text-lg font-bold text-white">+{photos.length - 5} photos</span>
            )}
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(0)} className="mt-3 rounded-full border border-[#0C4A47] px-4 py-2 text-sm font-bold text-[#0C4A47] hover:bg-[#0C4A47] hover:text-white">
        Show all {photos.length} photos
      </button>

      {open !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0b1413]/95" role="dialog" aria-modal="true" onClick={close}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm">{open + 1} / {photos.length}</span>
            <button onClick={close} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">Close</button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-2 pb-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => step(-1)} className="absolute left-2 z-10 h-11 w-11 rounded-full bg-white/15 text-2xl text-white" aria-label="Previous photo">‹</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[open].src} alt={`${name} — ${photos[open].alt}`} className="max-h-[80vh] max-w-full rounded-xl object-contain" />
            <button onClick={() => step(1)} className="absolute right-2 z-10 h-11 w-11 rounded-full bg-white/15 text-2xl text-white" aria-label="Next photo">›</button>
          </div>
        </div>
      )}
    </>
  );
}
