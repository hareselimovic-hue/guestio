"use client";

import { useRef } from "react";
import {
  Wifi, Key, ScrollText, MapPin, Star, Heart, Plus,
  Copy, Check, Phone, ChevronDown
} from "lucide-react";
import { useState } from "react";

const SECTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  WELCOME:     { icon: <Heart className="w-5 h-5" />,      color: "text-pink-600",   bg: "bg-pink-50",   label: "Dobrodošlica" },
  WIFI:        { icon: <Wifi className="w-5 h-5" />,       color: "text-blue-600",   bg: "bg-blue-50",   label: "WiFi" },
  CHECKIN:     { icon: <Key className="w-5 h-5" />,        color: "text-amber-600",  bg: "bg-amber-50",  label: "Check-in" },
  HOUSE_RULES: { icon: <ScrollText className="w-5 h-5" />, color: "text-purple-600", bg: "bg-purple-50", label: "Pravila" },
  LOCATION:    { icon: <MapPin className="w-5 h-5" />,     color: "text-green-600",  bg: "bg-green-50",  label: "Lokacija" },
  LOCAL_RECS:  { icon: <Star className="w-5 h-5" />,       color: "text-orange-600", bg: "bg-orange-50", label: "Preporuke" },
  CUSTOM:      { icon: <Plus className="w-5 h-5" />,       color: "text-gray-600",   bg: "bg-gray-50",   label: "Info" },
};

interface Section {
  id: string;
  type: string;
  title: string;
  content: unknown;
}

interface Props {
  property: { id: string; name: string; slug: string };
  sections: Section[];
  guestName: string | null;
  checkIn: string | null;
  checkOut: string | null;
}

export default function GuestView({ property, sections, guestName, checkIn, checkOut }: Props) {
  const sectionsRef = useRef<HTMLDivElement>(null);

  const welcomeSection = sections.find((s) => s.type === "WELCOME");
  const otherSections = sections.filter((s) => s.type !== "WELCOME");

  const welcomeContent = (welcomeSection?.content ?? {}) as Record<string, unknown>;
  const heroImage = (welcomeContent.heroImage as string) ?? "";
  const welcomeTitle = (welcomeContent.welcomeTitle as string) ?? property.name;
  const ctaText = (welcomeContent.ctaText as string) || "Istražite vodič";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("bs", { day: "numeric", month: "long" });

  function scrollToSections() {
    sectionsRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── HERO ── */}
      <div
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: heroImage
            ? `url(${heroImage}) center/cover no-repeat`
            : "linear-gradient(135deg, #0F2F61 0%, #1a4a8a 100%)",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-lg">
          {/* Property badge */}
          <div className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full mb-6 tracking-wide">
            {property.name}
          </div>

          {/* Welcome message */}
          <h1
            className="text-4xl font-bold text-white mb-3 leading-tight"
            style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
          >
            {guestName
              ? <>Dobrodošli,<br /><span className="text-[#FF6700]">{guestName}</span>!</>
              : welcomeTitle
            }
          </h1>

          {/* Dates */}
          {(checkIn || checkOut) && (
            <div className="flex items-center justify-center gap-2 text-white/80 text-sm mb-2">
              <span>{checkIn && formatDate(checkIn)}</span>
              {checkIn && checkOut && <span className="text-white/40">→</span>}
              <span>{checkOut && formatDate(checkOut)}</span>
            </div>
          )}

          {/* Subtitle from welcome message */}
          {welcomeContent.message && (
            <p className="text-white/80 text-sm leading-relaxed mt-3 mb-2">
              {welcomeContent.message as string}
            </p>
          )}

          {welcomeContent.hostName && (
            <p className="text-white/60 text-xs mt-2">— {welcomeContent.hostName as string}</p>
          )}

          {/* CTA button */}
          {otherSections.length > 0 && (
            <button
              onClick={scrollToSections}
              className="mt-8 inline-flex items-center gap-2 bg-[#FF6700] hover:bg-[#e05c00] text-white font-semibold px-6 py-3 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
            >
              {ctaText}
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scroll indicator */}
        {otherSections.length > 0 && (
          <button
            onClick={scrollToSections}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 hover:text-white/80 transition-colors animate-bounce"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ── SECTION CARDS ── */}
      <div ref={sectionsRef} className="max-w-2xl mx-auto px-4 py-10 space-y-4">
        {otherSections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}

        {otherSections.length === 0 && (
          <div className="text-center py-16 text-[#6B6B6B]">
            <p className="text-lg font-medium">Vodič se priprema</p>
            <p className="text-sm mt-1">Domaćin još uvijek dodaje informacije.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-10 text-center">
        <p className="text-xs text-[#6B6B6B]">
          Powered by{" "}
          <span className="font-semibold text-[#0F2F61]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
            Guestio
          </span>
        </p>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const content = section.content as Record<string, unknown>;
  const meta = SECTION_META[section.type] ?? SECTION_META.CUSTOM;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0EE]">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
          {meta.icon}
        </div>
        <h2
          className="font-bold text-[#262626] text-base"
          style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
        >
          {section.title}
        </h2>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        <SectionBody type={section.type} content={content} />
      </div>
    </div>
  );
}

function SectionBody({ type, content }: { type: string; content: Record<string, unknown> }) {
  switch (type) {
    case "WIFI":
      return (
        <div className="space-y-3">
          <WifiRow label="Mreža" value={(content.network as string) ?? ""} />
          <WifiRow label="Lozinka" value={(content.password as string) ?? ""} copyable />
          {content.note && (
            <p className="text-sm text-[#6B6B6B] pt-2 border-t border-[#F0F0EE]">
              {content.note as string}
            </p>
          )}
        </div>
      );

    case "CHECKIN":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TimeBox label="Check-in" value={(content.checkIn as string) ?? "15:00"} />
            <TimeBox label="Check-out" value={(content.checkOut as string) ?? "11:00"} />
          </div>
          {content.instructions && (
            <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap">
              {content.instructions as string}
            </p>
          )}
          {content.contact && (
            <a
              href={`tel:${content.contact}`}
              className="flex items-center gap-2 text-sm font-medium text-[#0F2F61] bg-[#0F2F61]/5 px-4 py-2.5 rounded-xl hover:bg-[#0F2F61]/10 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {content.contact as string}
            </a>
          )}
        </div>
      );

    case "HOUSE_RULES": {
      const rules = (content.rules as string[]) ?? [];
      return (
        <ul className="space-y-2.5">
          {rules.length === 0 && <li className="text-sm text-[#6B6B6B]">Nema definisanih pravila.</li>}
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[#262626]">
              <span className="w-6 h-6 bg-[#0F2F61]/10 text-[#0F2F61] rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "LOCATION":
      return (
        <div className="space-y-4">
          {content.mapUrl && (
            <div className="rounded-xl overflow-hidden" style={{ height: 220 }}>
              <iframe
                src={content.mapUrl as string}
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
              />
            </div>
          )}
          {content.address && (
            <div className="flex items-start gap-2.5 text-sm text-[#262626]">
              <MapPin className="w-4 h-4 text-[#6B6B6B] shrink-0 mt-0.5" />
              {content.address as string}
            </div>
          )}
          {content.directions && (
            <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap border-t border-[#F0F0EE] pt-3">
              {content.directions as string}
            </p>
          )}
        </div>
      );

    case "LOCAL_RECS": {
      const places = (content.places as Array<{ name: string; category: string; description: string }>) ?? [];
      return (
        <div className="space-y-3">
          {places.length === 0 && <p className="text-sm text-[#6B6B6B]">Nema preporuka još.</p>}
          {places.map((place, i) => (
            <div key={i} className="flex gap-3 p-3 bg-[#F7F7F5] rounded-xl">
              <div className="w-8 h-8 bg-[#FF6700]/10 rounded-lg flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-[#FF6700]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm text-[#262626]">{place.name}</p>
                  {place.category && (
                    <span className="text-xs bg-[#FF6700]/10 text-[#FF6700] px-2 py-0.5 rounded-full font-medium">
                      {place.category}
                    </span>
                  )}
                </div>
                {place.description && (
                  <p className="text-xs text-[#6B6B6B] mt-0.5 leading-relaxed">{place.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    default:
      return (
        <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap">
          {(content.body as string) ?? ""}
        </p>
      );
  }
}

function WifiRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center justify-between bg-[#F7F7F5] rounded-xl px-4 py-3">
      <div>
        <p className="text-xs text-[#6B6B6B] font-medium">{label}</p>
        <p className="font-semibold text-[#262626] mt-0.5 text-sm tracking-wide">{value || "—"}</p>
      </div>
      {copyable && value && (
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs font-medium text-[#0F2F61] bg-white border border-[#EDEDE9] px-3 py-1.5 rounded-lg hover:bg-[#F0F0EE] transition-colors"
        >
          {copied ? <><Check className="w-3 h-3 text-green-500" /> Kopirano</> : <><Copy className="w-3 h-3" /> Kopiraj</>}
        </button>
      )}
    </div>
  );
}

function TimeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F7F7F5] rounded-xl p-4 text-center">
      <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#0F2F61]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
        {value}
      </p>
    </div>
  );
}
