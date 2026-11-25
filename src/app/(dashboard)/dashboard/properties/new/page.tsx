"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Link2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GuideWizard from "@/components/onboarding/GuideWizard";

type Method = "choose" | "link" | "manual";

export default function NewPropertyPage() {
  const router = useRouter();
  // Apartments: "From listing link" (wizard) or "Manually" (the form below). Hotels keep the form.
  const [method, setMethod] = useState<Method>("choose");
  const [apartments, setApartments] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("kind") === "hotel") { setMethod("manual"); return; }
    fetch("/api/properties").then((r) => (r.ok ? r.json() : [])).then((list: { id: string; name: string; kind?: string }[]) => {
      setApartments(list.filter((p) => p.kind !== "HOTEL").map((p) => ({ id: p.id, name: p.name })));
    }).catch(() => {});
  }, []);
  const [name, setName] = useState("");
  const [internalName, setInternalName] = useState("");
  const [address, setAddress] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    // ?kind=apartment|hotel from the Apartments / Hotel pages (default: the account type)
    const kindParam = new URLSearchParams(window.location.search).get("kind");
    const kind = kindParam === "hotel" ? "HOTEL" : kindParam === "apartment" ? "APARTMENT" : undefined;

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, internalName: internalName.trim() || undefined, address, customSlug: customSlug.trim() || undefined, kind }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create property.");
      setLoading(false);
      return;
    }

    const property = await res.json();
    router.push(`/dashboard/properties/${property.id}`);
  }

  return (
    <div className="p-4 sm:p-8 max-w-xl">
      <button
        type="button"
        onClick={() => (method === "choose" || new URLSearchParams(window.location.search).get("kind") === "hotel" ? router.back() : setMethod("choose"))}
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {method === "choose" && (
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-ink mb-1" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>New property</h1>
          <p className="text-sm text-ink-2 mb-5">How do you want to create the guide?</p>
          <button type="button" onClick={() => setMethod("link")}
            className="flex w-full items-start gap-3 rounded-2xl border-2 border-orange bg-orange-tint p-4 text-left hover:bg-orange-soft/40">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange text-white"><Link2 className="h-5 w-5" /></span>
            <span>
              <span className="flex items-center gap-2 font-semibold text-ink">From listing link <span className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">Recommended</span></span>
              <span className="mt-0.5 block text-sm text-ink-2">Paste your Airbnb or Booking link. Name, photos, address, house rules and nearby places are filled in for you.</span>
            </span>
          </button>
          <button type="button" onClick={() => setMethod("manual")}
            className="flex w-full items-start gap-3 rounded-2xl border-2 border-line bg-white p-4 text-left hover:border-ink-2/30">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-ink-2"><PencilLine className="h-5 w-5" /></span>
            <span>
              <span className="block font-semibold text-ink">Manually</span>
              <span className="mt-0.5 block text-sm text-ink-2">An empty guide: name, address and link, you fill in the rest.</span>
            </span>
          </button>
        </div>
      )}

      {method === "link" && (
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-7">
          <GuideWizard mode="app" lang="en" sessionEmail="" copySources={apartments} />
        </div>
      )}

      {method === "manual" && (<>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-navy/10 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-navy" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-ink" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
            New property
          </h1>
          <p className="text-sm text-ink-2">Create a digital guide for your guests</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-ink font-medium">
            Property name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. Downtown Apartment"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border-line focus:border-navy h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="internalName" className="text-ink font-medium">
            Internal name <span className="text-ink-2 font-normal">(optional, admin only)</span>
          </Label>
          <Input
            id="internalName"
            placeholder="e.g. apt-101, studio-bascarsija-2"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            className="border-line focus:border-navy h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-ink font-medium">
            Address <span className="text-ink-2 font-normal">(optional)</span>
          </Label>
          <Input
            id="address"
            placeholder="e.g. 123 Main Street, New York"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border-line focus:border-navy h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-ink font-medium">
            Guest link URL <span className="text-ink-2 font-normal">(optional)</span>
          </Label>
          <div className="flex items-center border border-line rounded-lg overflow-hidden focus-within:border-navy h-11">
            <span className="px-3 text-sm text-ink-2 bg-canvas h-full flex items-center border-r border-line shrink-0">
              /g/
            </span>
            <Input
              id="slug"
              placeholder="studio-bascarsija"
              value={customSlug}
              onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="border-0 focus-visible:ring-0 h-full rounded-none"
            />
          </div>
          {customSlug && (
            <p className="text-xs text-ink-2">
              Guest link: <span className="font-medium text-navy">{typeof window !== "undefined" ? window.location.host : "app.smartstay.ba"}/g/{customSlug}/preview</span>
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="bg-navy hover:bg-navy-dark text-white px-6 h-11"
          >
            {loading ? "Creating..." : "Create property"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-11"
          >
            Cancel
          </Button>
        </div>
      </form>
      </>)}
    </div>
  );
}
