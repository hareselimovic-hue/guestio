"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Share2, Users, ExternalLink, Copy, Check, Plus, Building2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionEditor from "@/components/SectionEditor";

interface Section {
  id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  isVisible: boolean;
  order: number;
}

interface Property {
  id: string;
  name: string;
  internalName: string | null;
  slug: string;
  address: string | null;
  ownerName: string | null;
  ownerAddress: string | null;
  bankAccount: string | null;
  sections: Section[];
}

interface GuestLink {
  id: string;
  token: string;
  guestName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  viewCount: number;
  createdAt: string;
}

export default function PropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [guests, setGuests] = useState<GuestLink[]>([]);
  const [tab, setTab] = useState<"sections" | "guests" | "owner">("sections");
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [ownerSaving, setOwnerSaving] = useState(false);
  const [ownerSaved, setOwnerSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugError, setSlugError] = useState("");
  const [internalName, setInternalName] = useState("");
  const [editingInternalName, setEditingInternalName] = useState(false);
  const [internalNameValue, setInternalNameValue] = useState("");
  const [loading, setLoading] = useState(true);

  // Guest form
  const [guestName, setGuestName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [creating, setCreating] = useState(false);

  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/properties/${id}`).then((r) => r.json()),
      fetch(`/api/properties/${id}/guests`).then((r) => r.json()),
    ]).then(([prop, g]) => {
      setProperty(prop);
      setGuests(g);
      setOwnerName(prop.ownerName ?? "");
      setOwnerAddress(prop.ownerAddress ?? "");
      setBankAccount(prop.bankAccount ?? "");
      setNameValue(prop.name ?? "");
      setSlugValue(prop.slug ?? "");
      setInternalName(prop.internalName ?? "");
      setInternalNameValue(prop.internalName ?? "");
      setLoading(false);
    });
  }, [id]);

  async function createGuestLink(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch(`/api/properties/${id}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestName, checkIn: checkIn || null, checkOut: checkOut || null }),
    });
    const guest = await res.json();
    setGuests([guest, ...guests]);
    setGuestName("");
    setCheckIn("");
    setCheckOut("");
    setCreating(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/g/${property!.slug}/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#0F2F61] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/dashboard" className="text-[#6B6B6B] hover:text-[#262626] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="text-xl font-bold text-[#262626] border border-[#0F2F61] rounded-lg px-2 py-0.5 outline-none flex-1"
                style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
              />
              <button
                onClick={async () => {
                  if (!nameValue.trim()) return;
                  await fetch(`/api/properties/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: nameValue.trim() }),
                  });
                  setProperty({ ...property, name: nameValue.trim() });
                  setEditingName(false);
                }}
                className="text-xs font-medium text-white bg-[#0F2F61] px-2.5 py-1 rounded-lg shrink-0"
              >Save</button>
              <button onClick={() => { setEditingName(false); setNameValue(property.name); }} className="text-xs text-[#6B6B6B] shrink-0">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 group text-left">
              <h1
                className="text-xl font-bold text-[#262626] group-hover:text-[#0F2F61] transition-colors"
                style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
              >
                {property.name}
              </h1>
              <Pencil className="w-3.5 h-3.5 text-[#BABAB5] group-hover:text-[#0F2F61] transition-colors opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          )}
          {/* Internal name — editable inline */}
          {editingInternalName ? (
            <div className="flex items-center gap-2 mt-0.5">
              <input
                autoFocus
                value={internalNameValue}
                onChange={(e) => setInternalNameValue(e.target.value)}
                placeholder="Internal name..."
                className="text-xs border border-[#0F2F61] rounded px-2 py-0.5 outline-none text-[#6B6B6B] w-40"
              />
              <button
                onClick={async () => {
                  await fetch(`/api/properties/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ internalName: internalNameValue || null }),
                  });
                  setInternalName(internalNameValue);
                  setProperty({ ...property, internalName: internalNameValue || null });
                  setEditingInternalName(false);
                }}
                className="text-xs font-medium text-white bg-[#0F2F61] px-2 py-0.5 rounded"
              >Save</button>
              <button onClick={() => { setEditingInternalName(false); setInternalNameValue(internalName); }} className="text-xs text-[#6B6B6B]">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingInternalName(true)}
              className="flex items-center gap-1 mt-0.5 group"
            >
              {internalName ? (
                <span className="text-xs text-[#6B6B6B] italic group-hover:text-[#0F2F61] transition-colors">{internalName}</span>
              ) : (
                <span className="text-xs text-[#BABAB5] group-hover:text-[#6B6B6B] transition-colors italic">+ internal name</span>
              )}
              <Pencil className="w-2.5 h-2.5 text-[#BABAB5] group-hover:text-[#6B6B6B] transition-colors opacity-0 group-hover:opacity-100" />
            </button>
          )}
          {property.address && (
            <p className="text-sm text-[#6B6B6B] mt-0.5">{property.address}</p>
          )}
          {/* Slug / guest link */}
          {editingSlug ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center border border-[#0F2F61] rounded-lg overflow-hidden h-7 text-xs">
                <span className="px-2 text-[#6B6B6B] bg-[#F7F7F5] h-full flex items-center border-r border-[#EDEDE9]">/g/</span>
                <input
                  autoFocus
                  value={slugValue}
                  onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  className="px-2 h-full outline-none text-[#262626] w-40"
                />
              </div>
              <button
                onClick={async () => {
                  setSlugError("");
                  const res = await fetch(`/api/properties/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ slug: slugValue }),
                  });
                  if (!res.ok) {
                    const d = await res.json();
                    setSlugError(d.error ?? "Error");
                  } else {
                    setProperty({ ...property, slug: slugValue });
                    setEditingSlug(false);
                  }
                }}
                className="text-xs font-medium text-white bg-[#0F2F61] px-2.5 py-1 rounded-lg"
              >Save</button>
              <button onClick={() => { setEditingSlug(false); setSlugValue(property.slug); setSlugError(""); }} className="text-xs text-[#6B6B6B]">Cancel</button>
              {slugError && <span className="text-xs text-red-500">{slugError}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-[#6B6B6B]">/g/{property.slug}/preview</span>
              <button onClick={() => setEditingSlug(true)} className="text-[#6B6B6B] hover:text-[#0F2F61] transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <a
          href={`/g/${property.slug}/preview`}
          target="_blank"
          className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] px-3 py-1.5 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Preview
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F7F7F5] p-1 rounded-xl mb-6 w-full sm:w-fit overflow-x-auto">
        <button
          onClick={() => setTab("sections")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            tab === "sections"
              ? "bg-white text-[#262626] shadow-sm"
              : "text-[#6B6B6B] hover:text-[#262626]"
          }`}
        >
          <Share2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline sm:inline">Guide sections</span>
          <span className="xs:hidden sm:hidden">Sections</span>
        </button>
        <button
          onClick={() => setTab("guests")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            tab === "guests"
              ? "bg-white text-[#262626] shadow-sm"
              : "text-[#6B6B6B] hover:text-[#262626]"
          }`}
        >
          <Users className="w-3.5 h-3.5 shrink-0" />
          Guests
          {guests.length > 0 && (
            <span className="bg-[#0F2F61] text-white text-xs px-1.5 py-0.5 rounded-full">
              {guests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("owner")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            tab === "owner"
              ? "bg-white text-[#262626] shadow-sm"
              : "text-[#6B6B6B] hover:text-[#262626]"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          Owner
        </button>
      </div>

      {/* Sections tab */}
      {tab === "sections" && (
        <SectionEditor
          sections={property.sections}
          propertyId={property.id}
          onUpdate={(sections) => setProperty({ ...property, sections })}
        />
      )}

      {/* Owner Info tab */}
      {tab === "owner" && (
        <div className="bg-white border border-[#EDEDE9] rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-[#6B6B6B] mb-4">
              This information is private and only visible to you — never shown to guests.
            </p>
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Owner name</Label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. John Smith"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Address</Label>
            <Input
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
              placeholder="e.g. 123 Main Street, Sarajevo"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Bank account number</Label>
            <Input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="e.g. BA39 1234 5678 9012 3456"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </div>
          <Button
            onClick={async () => {
              setOwnerSaving(true);
              await fetch(`/api/properties/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ownerName, ownerAddress, bankAccount }),
              });
              setOwnerSaving(false);
              setOwnerSaved(true);
              setTimeout(() => setOwnerSaved(false), 2000);
            }}
            disabled={ownerSaving}
            className="bg-[#0F2F61] hover:bg-[#0a2347] text-white h-9 text-sm w-full"
          >
            {ownerSaved ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Saved</> : ownerSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      )}

      {/* Guests tab */}
      {tab === "guests" && (
        <div className="space-y-5">
          {/* Create guest link form */}
          <div className="bg-white border border-[#EDEDE9] rounded-xl p-5">
            <h3
              className="font-semibold text-[#262626] mb-4"
              style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
            >
              Generate guest link
            </h3>
            <form onSubmit={createGuestLink} className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">
                  Guest name (optional)
                </Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="h-9 text-sm border-[#EDEDE9]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Check-in</Label>
                  <Input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="h-9 text-sm border-[#EDEDE9]"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Check-out</Label>
                  <Input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="h-9 text-sm border-[#EDEDE9]"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={creating}
                className="bg-[#FF6700] hover:bg-[#e05c00] text-white h-9 text-sm w-full"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {creating ? "Creating..." : "Generate link"}
              </Button>
            </form>
          </div>

          {/* Guest links list */}
          {guests.length === 0 ? (
            <div className="text-center py-10 text-[#6B6B6B] text-sm">
              No guest links created yet.
            </div>
          ) : (
            <div className="space-y-2">
              {guests.map((guest) => (
                <div
                  key={guest.id}
                  className="bg-white border border-[#EDEDE9] rounded-xl px-4 py-3.5 flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#262626]">
                      {guest.guestName ?? "Anonymous guest"}
                    </p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      {guest.checkIn
                        ? `${new Date(guest.checkIn).toLocaleDateString("en")} → ${guest.checkOut ? new Date(guest.checkOut).toLocaleDateString("en") : "?"}`
                        : "No dates"
                      }
                      {" · "}
                      {guest.viewCount} views
                    </p>
                  </div>
                  <button
                    onClick={() => copyLink(guest.token)}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#EDEDE9] text-[#6B6B6B] hover:text-[#0F2F61] hover:border-[#0F2F61] transition-colors"
                  >
                    {copied === guest.token ? (
                      <><Check className="w-3 h-3 text-green-500" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy link</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
