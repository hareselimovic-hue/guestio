"use client";

import { useState } from "react";
import {
  Wifi, Key, ScrollText, MapPin, Star, Heart, Plus,
  Copy, Check, Phone, Calendar
} from "lucide-react";

const SECTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  WELCOME:     { icon: <Heart className="w-5 h-5" />,      color: "text-pink-600",   bg: "bg-pink-50" },
  WIFI:        { icon: <Wifi className="w-5 h-5" />,       color: "text-blue-600",   bg: "bg-blue-50" },
  CHECKIN:     { icon: <Key className="w-5 h-5" />,        color: "text-amber-600",  bg: "bg-amber-50" },
  HOUSE_RULES: { icon: <ScrollText className="w-5 h-5" />, color: "text-purple-600", bg: "bg-purple-50" },
  LOCATION:    { icon: <MapPin className="w-5 h-5" />,     color: "text-green-600",  bg: "bg-green-50" },
  LOCAL_RECS:  { icon: <Star className="w-5 h-5" />,       color: "text-orange-600", bg: "bg-orange-50" },
  CUSTOM:      { icon: <Plus className="w-5 h-5" />,       color: "text-gray-600",   bg: "bg-gray-50" },
};

interface Section {
  id: string;
  type: string;
  title: string;
  content: unknown;
}

interface Props {
  property: { id: string; name: string; slug: string };
  guestName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  sections?: Section[];
}

export default function GuestView({ property, guestName, checkIn, checkOut, sections = [] }: Props) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("bs", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#F7F7F5]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-[#0F2F61] text-white">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <p className="text-[#8ba3c7] text-xs font-medium uppercase tracking-widest mb-1">
            Vaš digitalni vodič
          </p>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
          >
            {property.name}
          </h1>

          {/* Guest personalization */}
          {(guestName || checkIn) && (
            <div className="mt-4 bg-white/10 rounded-xl px-4 py-3 space-y-1.5">
              {guestName && (
                <p className="text-sm font-medium">
                  Dobrodošli, <span className="text-[#FF6700]">{guestName}</span>! 👋
                </p>
              )}
              {(checkIn || checkOut) && (
                <div className="flex items-center gap-2 text-xs text-[#8ba3c7]">
                  <Calendar className="w-3.5 h-3.5" />
                  {checkIn && formatDate(checkIn)}
                  {checkIn && checkOut && " → "}
                  {checkOut && formatDate(checkOut)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section tabs */}
        {sections.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-1 px-4 overflow-x-auto pb-0 scrollbar-hide">
              {sections.map((s) => {
                const meta = SECTION_META[s.type];
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0 ${
                      activeSection === s.id
                        ? "bg-[#F7F7F5] text-[#262626]"
                        : "text-[#8ba3c7] hover:text-white"
                    }`}
                  >
                    {meta?.icon}
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Section content */}
      <div className="max-w-2xl mx-auto px-5 py-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className={activeSection === section.id ? "block" : "hidden"}
          >
            <SectionContent section={section} />
          </div>
        ))}

        {sections.length === 0 && (
          <div className="text-center py-16 text-[#6B6B6B]">
            <p className="text-lg font-medium">Vodič se priprema</p>
            <p className="text-sm mt-1">Domaćin još uvijek dodaje informacije.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto px-5 pb-8 text-center">
        <p className="text-xs text-[#6B6B6B]">
          Powered by <span className="font-semibold text-[#0F2F61]">Guestio</span>
        </p>
      </div>
    </div>
  );
}

function SectionContent({ section }: { section: Section }) {
  const content = section.content as Record<string, unknown>;
  const meta = SECTION_META[section.type];

  const card = (children: React.ReactNode) => (
    <div className="bg-white rounded-2xl shadow-sm border border-[#EDEDE9] overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#F0F0EE]">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meta?.bg} ${meta?.color}`}>
          {meta?.icon}
        </div>
        <h2
          className="font-bold text-[#262626]"
          style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}
        >
          {section.title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );

  switch (section.type) {
    case "WELCOME":
      return card(
        <div className="space-y-3">
          {content.welcomeTitle && (
            <h3 className="text-lg font-bold text-[#262626]" style={{ fontFamily: "Plus Jakarta Sans Variable, sans-serif" }}>
              {content.welcomeTitle as string}
            </h3>
          )}
          {content.message && (
            <p className="text-[#262626] leading-relaxed whitespace-pre-wrap">
              {content.message as string}
            </p>
          )}
          {content.hostName && (
            <p className="text-sm text-[#6B6B6B] mt-2">— {content.hostName as string}</p>
          )}
        </div>
      );

    case "WIFI":
      return card(
        <div className="space-y-3">
          <WifiField label="Mreža" value={(content.network as string) ?? ""} />
          <WifiField label="Lozinka" value={(content.password as string) ?? ""} copyable />
          {content.note && (
            <p className="text-sm text-[#6B6B6B] pt-1 border-t border-[#F0F0EE]">
              {content.note as string}
            </p>
          )}
        </div>
      );

    case "CHECKIN":
      return card(
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F7F7F5] rounded-xl p-3 text-center">
              <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">Check-in</p>
              <p className="text-2xl font-bold text-[#0F2F61]">{(content.checkIn as string) ?? "15:00"}</p>
            </div>
            <div className="bg-[#F7F7F5] rounded-xl p-3 text-center">
              <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">Check-out</p>
              <p className="text-2xl font-bold text-[#0F2F61]">{(content.checkOut as string) ?? "11:00"}</p>
            </div>
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
      return card(
        <ul className="space-y-2">
          {rules.length === 0 && <li className="text-sm text-[#6B6B6B]">Nema definisanih pravila.</li>}
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[#262626]">
              <span className="w-5 h-5 bg-[#0F2F61]/10 text-[#0F2F61] rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ul>
      );
    }

    case "LOCATION":
      return card(
        <div className="space-y-4">
          {content.mapUrl && (
            <div className="rounded-xl overflow-hidden aspect-video">
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
      return card(
        <div className="space-y-3">
          {places.length === 0 && <p className="text-sm text-[#6B6B6B]">Nema preporuka još.</p>}
          {places.map((place, i) => (
            <div key={i} className="bg-[#F7F7F5] rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm text-[#262626]">{place.name}</p>
                {place.category && (
                  <span className="text-xs bg-[#FF6700]/10 text-[#FF6700] px-2 py-0.5 rounded-full font-medium shrink-0">
                    {place.category}
                  </span>
                )}
              </div>
              {place.description && (
                <p className="text-xs text-[#6B6B6B] leading-relaxed">{place.description}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "CUSTOM":
      return card(
        <p className="text-sm text-[#262626] leading-relaxed whitespace-pre-wrap">
          {(content.body as string) ?? ""}
        </p>
      );

    default:
      return null;
  }
}

function WifiField({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
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
        <p className="font-semibold text-[#262626] mt-0.5 text-sm">{value || "—"}</p>
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
