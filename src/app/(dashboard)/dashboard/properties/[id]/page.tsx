"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Share2, ExternalLink, Check, Building2, Pencil, QrCode, X, Download, MessageCircle, ChevronDown, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionEditor from "@/components/SectionEditor";
import { QRCodeCanvas } from "qrcode.react";

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
  ownerEmail: string | null;
  ownerPhone: string | null;
  bankAccount: string | null;
  sections: Section[];
}


export default function PropertyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [tab, setTab] = useState<"sections" | "owner">("sections");
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
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
  const [showQr, setShowQr] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Copy from another property
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [recentProps, setRecentProps] = useState<{ id: string; name: string; sections: { id: string; type: string; title: string; content: Record<string, unknown> }[] }[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShare(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function downloadQr() {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${property?.slug ?? "property"}.png`;
    a.click();
  }

  function shareWhatsApp() {
    if (!property) return;
    const url = `${window.location.origin}/g/${property.slug}/preview`;
    const text = encodeURIComponent(`Evo vašeg digitalnog vodiča za apartman: ${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setShowShare(false);
  }

  function shareViber() {
    if (!property) return;
    const url = `${window.location.origin}/g/${property.slug}/preview`;
    const text = encodeURIComponent(`Evo vašeg digitalnog vodiča za apartman: ${url}`);
    window.open(`viber://forward?text=${text}`, "_blank");
    setShowShare(false);
  }

  async function openCopyModal() {
    setShowCopyModal(true);
    setSelectedPropId(null);
    setSelectedTypes(new Set());
    if (recentProps.length === 0) {
      setLoadingRecent(true);
      const res = await fetch(`/api/properties/recent-with-sections?exclude=${property?.id ?? ""}`);
      const data = await res.json();
      setRecentProps(data);
      setLoadingRecent(false);
    }
  }

  const [markDirtyIds, setMarkDirtyIds] = useState<string[]>([]);

  function applyTemplate() {
    if (!property) return;
    const sourceProp = recentProps.find((p) => p.id === selectedPropId);
    if (!sourceProp) return;
    const affected: string[] = [];
    const updatedSections = property.sections.map((s) => {
      if (!selectedTypes.has(s.type)) return s;
      const sourceSection = sourceProp.sections.find((ss) => ss.type === s.type);
      if (!sourceSection) return s;
      affected.push(s.id);
      return { ...s, content: sourceSection.content };
    });
    setProperty({ ...property, sections: updatedSections });
    setMarkDirtyIds(affected);
    setShowCopyModal(false);
    setSelectedTypes(new Set());
  }

  useEffect(() => {
    fetch(`/api/properties/${id}`).then((r) => r.json()).then((prop) => {
      setProperty(prop);
      setOwnerName(prop.ownerName ?? "");
      setOwnerAddress(prop.ownerAddress ?? "");
      setOwnerEmail(prop.ownerEmail ?? "");
      setOwnerPhone(prop.ownerPhone ?? "");
      setBankAccount(prop.bankAccount ?? "");
      setNameValue(prop.name ?? "");
      setSlugValue(prop.slug ?? "");
      setInternalName(prop.internalName ?? "");
      setInternalNameValue(prop.internalName ?? "");
      setLoading(false);
    });
  }, [id]);

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
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
       <div className="flex items-start gap-3">
        <Link href="/dashboard" className="text-[#6B6B6B] hover:text-[#262626] transition-colors mt-0.5">
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
        {/* Desktop buttons — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {/* Share dropdown */}
          <div className="relative" ref={shareRef}>
            <button
              onClick={() => setShowShare((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              Share
              <ChevronDown className="w-3 h-3" />
            </button>
            {showShare && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#EDEDE9] rounded-xl shadow-lg z-10 overflow-hidden min-w-[160px]">
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#262626] hover:bg-[#F7F7F5] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
                <button
                  onClick={shareViber}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#262626] hover:bg-[#F7F7F5] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#7360F2"><path d="M11.398.002C8.865-.028 3.443.675 1.09 5.607c-1.17 2.434-1.126 5.608-1.085 7.507.042 1.9.168 5.462 2.31 7.754 1.964 2.093 4.9 2.64 6.193 2.73v2.553c0 .578.698.869 1.107.456l2.65-2.756h2.64c4.52 0 7.17-1.965 7.532-5.94.375-4.048.293-6.813-.002-8.932C21.935 4.55 19.397.032 11.398.002zm3.05 14.516a1.43 1.43 0 01-.818.415c-.085.007-.17.015-.25.015-.28-.001-.553-.07-.807-.2l-.001-.001c-1.12-.572-2.15-1.266-3.072-2.165-.852-.83-1.537-1.8-2.085-2.857C7.13 9 6.902 8.25 6.953 7.494a1.52 1.52 0 01.436-.93l.006-.007.462-.46c.302-.285.735-.3 1.022-.04.557.52.995 1.127 1.328 1.79.143.28.07.614-.171.832l-.397.36c-.19.172-.219.45-.073.658.29.412.627.797 1.008 1.13.39.34.816.63 1.27.866.21.113.47.082.647-.078l.393-.354c.22-.198.547-.258.829-.148a6.87 6.87 0 011.825 1.22c.278.28.27.721-.083 1.083l-.405.4zm.884-4.753c-.02 0-.04-.001-.059-.004a.283.283 0 01-.222-.326c.13-.749.015-1.53-.328-2.21a4.05 4.05 0 00-1.565-1.64 4.025 4.025 0 00-2.17-.546.284.284 0 01-.292-.274.283.283 0 01.274-.292c.88-.03 1.746.195 2.508.644a4.61 4.61 0 011.789 1.877 4.64 4.64 0 01.378 2.55.284.284 0 01-.313.22zm-1.403-.255a.282.282 0 01-.278-.237 2.24 2.24 0 00-.614-1.222 2.247 2.247 0 00-1.264-.604.283.283 0 01-.237-.322.283.283 0 01.322-.237c.6.088 1.143.37 1.554.817.411.447.65 1.025.706 1.617a.283.283 0 01-.236.322.282.282 0 01-.044.003l-.01.001-.899.065zm-2.832-.696c-.07-.148-.022-.328.124-.418.07-.043.148-.058.22-.045.072.013.14.054.186.12a.823.823 0 01.1.225c.017.067.013.14-.012.208a.274.274 0 01-.134.161.284.284 0 01-.384-.113l-.1-.138z"/></svg>
                  Viber
                </button>
              </div>
            )}
          </div>

          {/* QR button */}
          <button
            onClick={() => setShowQr(true)}
            className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] px-3 py-1.5 rounded-lg transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 shrink-0" />
            QR
          </button>

          {/* Preview */}
          <a
            href={`/g/${property.slug}/preview`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            Preview
          </a>
        </div>

       </div>{/* end flex items-start */}

       {/* Mobile buttons — shown below name, hidden on desktop */}
       <div className="flex sm:hidden items-center gap-2 mt-3 pl-8">
         <div className="relative" ref={shareRef}>
           <button
             onClick={() => setShowShare((v) => !v)}
             className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] px-3 py-1.5 rounded-lg transition-colors"
           >
             <MessageCircle className="w-3.5 h-3.5 shrink-0" />
             Share
             <ChevronDown className="w-3 h-3" />
           </button>
           {showShare && (
             <div className="absolute left-0 top-full mt-1 bg-white border border-[#EDEDE9] rounded-xl shadow-lg z-10 overflow-hidden min-w-[160px]">
               <button onClick={shareWhatsApp} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#262626] hover:bg-[#F7F7F5] transition-colors">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                 WhatsApp
               </button>
               <button onClick={shareViber} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#262626] hover:bg-[#F7F7F5] transition-colors">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="#7360F2"><path d="M11.398.002C8.865-.028 3.443.675 1.09 5.607c-1.17 2.434-1.126 5.608-1.085 7.507.042 1.9.168 5.462 2.31 7.754 1.964 2.093 4.9 2.64 6.193 2.73v2.553c0 .578.698.869 1.107.456l2.65-2.756h2.64c4.52 0 7.17-1.965 7.532-5.94.375-4.048.293-6.813-.002-8.932C21.935 4.55 19.397.032 11.398.002zm3.05 14.516a1.43 1.43 0 01-.818.415c-.085.007-.17.015-.25.015-.28-.001-.553-.07-.807-.2l-.001-.001c-1.12-.572-2.15-1.266-3.072-2.165-.852-.83-1.537-1.8-2.085-2.857C7.13 9 6.902 8.25 6.953 7.494a1.52 1.52 0 01.436-.93l.006-.007.462-.46c.302-.285.735-.3 1.022-.04.557.52.995 1.127 1.328 1.79.143.28.07.614-.171.832l-.397.36c-.19.172-.219.45-.073.658.29.412.627.797 1.008 1.13.39.34.816.63 1.27.866.21.113.47.082.647-.078l.393-.354c.22-.198.547-.258.829-.148a6.87 6.87 0 011.825 1.22c.278.28.27.721-.083 1.083l-.405.4zm.884-4.753c-.02 0-.04-.001-.059-.004a.283.283 0 01-.222-.326c.13-.749.015-1.53-.328-2.21a4.05 4.05 0 00-1.565-1.64 4.025 4.025 0 00-2.17-.546.284.284 0 01-.292-.274.283.283 0 01.274-.292c.88-.03 1.746.195 2.508.644a4.61 4.61 0 011.789 1.877 4.64 4.64 0 01.378 2.55.284.284 0 01-.313.22zm-1.403-.255a.282.282 0 01-.278-.237 2.24 2.24 0 00-.614-1.222 2.247 2.247 0 00-1.264-.604.283.283 0 01-.237-.322.283.283 0 01.322-.237c.6.088 1.143.37 1.554.817.411.447.65 1.025.706 1.617a.283.283 0 01-.236.322.282.282 0 01-.044.003l-.01.001-.899.065zm-2.832-.696c-.07-.148-.022-.328.124-.418.07-.043.148-.058.22-.045.072.013.14.054.186.12a.823.823 0 01.1.225c.017.067.013.14-.012.208a.274.274 0 01-.134.161.284.284 0 01-.384-.113l-.1-.138z"/></svg>
                 Viber
               </button>
             </div>
           )}
         </div>
         <button
           onClick={() => setShowQr(true)}
           className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] px-3 py-1.5 rounded-lg transition-colors"
         >
           <QrCode className="w-3.5 h-3.5 shrink-0" />
           QR
         </button>
         <a
           href={`/g/${property.slug}/preview`}
           target="_blank"
           className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#262626] border border-[#EDEDE9] px-3 py-1.5 rounded-lg transition-colors"
         >
           <ExternalLink className="w-3.5 h-3.5 shrink-0" />
           Preview
         </a>
       </div>

        {/* QR Modal */}
        {showQr && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
            <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between w-full">
                <h2 className="font-bold text-[#262626]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>QR kod</h2>
                <button onClick={() => setShowQr(false)} className="text-[#6B6B6B] hover:text-[#262626] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-[#6B6B6B] text-center">Skeniraj za pristup vodiču</p>
              <QRCodeCanvas
                id="qr-canvas"
                value={`${window.location.origin}/g/${property.slug}/preview`}
                size={220}
                bgColor="#ffffff"
                fgColor="#0F2F61"
                level="M"
              />
              <p className="text-xs text-[#BABAB5] font-mono break-all text-center">/g/{property.slug}/preview</p>
              <button
                onClick={downloadQr}
                className="flex items-center gap-2 bg-[#0F2F61] hover:bg-[#0a2347] text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors w-full justify-center"
              >
                <Download className="w-4 h-4" />
                Preuzmi PNG
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs + Copy button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-6">
        <div className="flex gap-1 bg-[#F7F7F5] p-1 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setTab("sections")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none justify-center sm:justify-start whitespace-nowrap ${
              tab === "sections"
                ? "bg-white text-[#262626] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#262626]"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            Guide sections
          </button>
          <button
            onClick={() => setTab("owner")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-1 sm:flex-none justify-center sm:justify-start whitespace-nowrap ${
              tab === "owner"
                ? "bg-white text-[#262626] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#262626]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            Owner
          </button>
        </div>
        {tab === "sections" && (
          <button
            onClick={openCopyModal}
            className="flex items-center justify-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#0F2F61] border border-[#EDEDE9] bg-white px-3 py-2 sm:py-1.5 rounded-lg transition-colors w-full sm:w-auto shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy from another property
          </button>
        )}
      </div>

      {/* Copy modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCopyModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDEDE9]">
              <h2 className="font-bold text-[#262626] text-sm">Copy sections</h2>
              <button onClick={() => setShowCopyModal(false)} className="text-[#6B6B6B] hover:text-[#262626]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {loadingRecent ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0F2F61]" />
                </div>
              ) : recentProps.length === 0 ? (
                <p className="text-sm text-[#6B6B6B] text-center py-4">No other properties found.</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-medium text-[#6B6B6B] mb-2">1. Select property</p>
                    <div className="space-y-1">
                      {recentProps.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPropId(p.id); setSelectedTypes(new Set()); }}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm border transition-colors ${
                            selectedPropId === p.id
                              ? "border-[#0F2F61] bg-[#0F2F61]/5 text-[#0F2F61] font-medium"
                              : "border-[#EDEDE9] text-[#262626] hover:border-[#0F2F61]/30"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedPropId && (() => {
                    const sourceProp = recentProps.find((p) => p.id === selectedPropId)!;
                    const available = sourceProp.sections.filter((ss) =>
                      property.sections.some((s) => s.type === ss.type)
                    );
                    return (
                      <div>
                        <p className="text-xs font-medium text-[#6B6B6B] mb-2">2. Select sections to copy</p>
                        {available.length === 0 ? (
                          <p className="text-xs text-[#BABAB5]">No compatible sections.</p>
                        ) : (
                          <div className="space-y-1">
                            {available.map((ss) => {
                              const checked = selectedTypes.has(ss.type);
                              return (
                                <label
                                  key={ss.type}
                                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#EDEDE9] cursor-pointer hover:border-[#0F2F61]/30 transition-colors"
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-[#0F2F61] border-[#0F2F61]" : "border-[#BABAB5]"}`}>
                                    {checked && <Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                                    setSelectedTypes((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(ss.type)) next.delete(ss.type); else next.add(ss.type);
                                      return next;
                                    });
                                  }} />
                                  <span className="text-sm text-[#262626]">{ss.title}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            {selectedTypes.size > 0 && (
              <div className="px-5 py-4 border-t border-[#EDEDE9]">
                <button
                  onClick={applyTemplate}
                  className="w-full bg-[#0F2F61] hover:bg-[#0a2347] text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  Copy selected ({selectedTypes.size})
                </button>
                <p className="text-xs text-[#BABAB5] text-center mt-2">Content will be copied. Click "Save changes" to confirm.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sections tab */}
      {tab === "sections" && (
        <SectionEditor
          sections={property.sections}
          propertyId={property.id}
          onUpdate={(sections) => setProperty({ ...property, sections })}
          markDirtyIds={markDirtyIds}
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
            <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Email</Label>
            <Input
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="e.g. owner@email.com"
              type="email"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#6B6B6B] mb-1.5 block">Phone number</Label>
            <Input
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="e.g. +387 61 123 456"
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
                body: JSON.stringify({ ownerName, ownerAddress, ownerEmail, ownerPhone, bankAccount }),
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

    </div>
  );
}
