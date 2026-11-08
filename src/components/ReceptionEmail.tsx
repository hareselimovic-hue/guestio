"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Hotel, Loader2 } from "lucide-react";

/** Reception email of one hotel — where guest requests are emailed */
export function ReceptionEmailForm({ hotelId, initial, onSaved }: { hotelId: string; initial: string | null; onSaved?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const email = value.trim();
    if (email && !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) { setError("Enter a valid email address."); return; }
    setBusy(true); setError("");
    const res = await fetch(`/api/properties/${hotelId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receptionEmail: email || null }),
    });
    setBusy(false);
    if (!res.ok) { setError("Could not save."); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="reception@yourhotel.com"
          className="flex-1 border border-[#EDEDE9] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#0F2F61] bg-white"
        />
        <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-1.5 bg-[#0F2F61] hover:bg-[#0a2347] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </form>
  );
}

interface HotelSetting { id: string; name: string; receptionEmail: string | null; defaultRecipients: string[] }

/** Settings page card — only shown to users who manage a hotel */
export default function HotelSettingsCard() {
  const [hotels, setHotels] = useState<HotelSetting[] | null>(null);
  useEffect(() => {
    fetch("/api/hotel/settings").then((r) => (r.ok ? r.json() : [])).then(setHotels).catch(() => setHotels([]));
  }, []);
  if (!hotels || hotels.length === 0) return null;

  return (
    <div className="bg-white border border-[#EDEDE9] rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Hotel className="w-4 h-4 text-[#0F2F61]" />
        <h2 className="font-semibold text-[#262626]">Hotel · Reception email</h2>
      </div>
      <p className="text-sm text-[#6B6B6B] mb-4">
        Guest requests from the guide (towels, cleaning, room service, bookings) are emailed here. They also always appear under Hotel → Requests.
      </p>
      <div className="space-y-4">
        {hotels.map((h) => (
          <div key={h.id}>
            {hotels.length > 1 && <p className="text-sm font-medium text-[#262626] mb-1.5">{h.name}</p>}
            <ReceptionEmailForm hotelId={h.id} initial={h.receptionEmail} />
            {!h.receptionEmail && (
              <p className="text-xs text-[#9B9B9B] mt-1">Not set — requests currently go to {h.defaultRecipients.join(", ") || "your account email"}.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
