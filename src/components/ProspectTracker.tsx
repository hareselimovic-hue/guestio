"use client";

import { useEffect } from "react";

/** Send one funnel step for an outreach guide (fire-and-forget; survives navigation) */
export function trackProspect(token: string, type: "view" | "claim_page" | "register_start") {
  try {
    fetch(`/api/prospects/event/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }), keepalive: true,
    }).catch(() => {});
  } catch {}
}

/**
 * On the ready-made outreach guide: counts a "real" view only when someone scrolls, taps or types —
 * link scanners in mail systems load the page but never interact, so they don't count.
 */
export default function ProspectTracker({ token }: { token: string }) {
  useEffect(() => {
    const key = `smartstay_prospect_view_${token}`;
    try { if (sessionStorage.getItem(key)) return; } catch {}
    const events = ["pointerdown", "touchstart", "scroll", "keydown", "wheel"] as const;
    const fire = () => {
      events.forEach((e) => window.removeEventListener(e, fire, true));
      try { sessionStorage.setItem(key, "1"); } catch {}
      trackProspect(token, "view");
    };
    events.forEach((e) => window.addEventListener(e, fire, { capture: true, passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, fire, true));
  }, [token]);
  return null;
}
