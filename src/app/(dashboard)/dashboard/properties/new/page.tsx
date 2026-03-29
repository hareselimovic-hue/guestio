"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewPropertyPage() {
  const router = useRouter();
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

    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, internalName: internalName.trim() || undefined, address, customSlug: customSlug.trim() || undefined }),
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
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-[#0F2F61]/10 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-[#0F2F61]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#262626]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
            New property
          </h1>
          <p className="text-sm text-[#6B6B6B]">Create a digital guide for your guests</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#262626] font-medium">
            Property name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. Downtown Apartment"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border-[#EDEDE9] focus:border-[#0F2F61] h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="internalName" className="text-[#262626] font-medium">
            Internal name <span className="text-[#6B6B6B] font-normal">(optional, admin only)</span>
          </Label>
          <Input
            id="internalName"
            placeholder="e.g. apt-101, studio-bascarsija-2"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            className="border-[#EDEDE9] focus:border-[#0F2F61] h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-[#262626] font-medium">
            Address <span className="text-[#6B6B6B] font-normal">(optional)</span>
          </Label>
          <Input
            id="address"
            placeholder="e.g. 123 Main Street, New York"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="border-[#EDEDE9] focus:border-[#0F2F61] h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-[#262626] font-medium">
            Guest link URL <span className="text-[#6B6B6B] font-normal">(optional)</span>
          </Label>
          <div className="flex items-center border border-[#EDEDE9] rounded-lg overflow-hidden focus-within:border-[#0F2F61] h-11">
            <span className="px-3 text-sm text-[#6B6B6B] bg-[#F7F7F5] h-full flex items-center border-r border-[#EDEDE9] shrink-0">
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
            <p className="text-xs text-[#6B6B6B]">
              Guest link: <span className="font-medium text-[#0F2F61]">smartstay.vercel.app/g/{customSlug}/preview</span>
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
            className="bg-[#0F2F61] hover:bg-[#0a2347] text-white px-6 h-11"
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
    </div>
  );
}
