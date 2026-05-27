"use client";

import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import Link from "next/link";

interface Props {
  daysLeft: number;
}

export default function SubscriptionExpiryPopup({ daysLeft }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (daysLeft <= 0 || daysLeft > 5) return;
    const today = new Date().toISOString().split("T")[0];
    const key = `sub_dismissed_${today}`;
    if (localStorage.getItem(key)) return;
    setVisible(true);
  }, [daysLeft]);

  function dismiss() {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(`sub_dismissed_${today}`, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-sm bg-white rounded-2xl shadow-2xl border border-[#EDEDE9] overflow-hidden">
        {/* Top bar */}
        <div className="bg-amber-50 border-b border-amber-100 px-5 py-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#262626] text-sm">
              {daysLeft === 1
                ? "Vaša pretplata ističe sutra"
                : `Vaša pretplata ističe za ${daysLeft} dana`}
            </p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              Nakon isteka nećete imati pristup dashboardu.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-[#9B9B9B] hover:text-[#262626] transition-colors shrink-0 p-0.5"
            aria-label="Zatvori"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex gap-3">
          <Link
            href="/dashboard/subscription"
            onClick={dismiss}
            className="flex-1 bg-[#0F2F61] hover:bg-[#0a2347] text-white text-sm font-semibold px-4 py-2.5 rounded-xl text-center transition-colors"
          >
            Pogledaj pretplatu
          </Link>
          <button
            onClick={dismiss}
            className="flex-1 bg-[#F7F7F5] hover:bg-[#EDEDE9] text-[#6B6B6B] text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            Podsjeti me sutra
          </button>
        </div>
      </div>
    </div>
  );
}
