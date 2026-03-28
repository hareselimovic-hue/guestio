"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import {
  Wifi, Key, ScrollText, MapPin, Star, Heart, Plus,
  ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Trash2,
  ImagePlus, X, Phone, Video, ParkingSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  WELCOME:     <Heart className="w-4 h-4" />,
  WIFI:        <Wifi className="w-4 h-4" />,
  CHECKIN:     <Key className="w-4 h-4" />,
  HOUSE_RULES: <ScrollText className="w-4 h-4" />,
  LOCATION:    <MapPin className="w-4 h-4" />,
  LOCAL_RECS:  <Star className="w-4 h-4" />,
  CONTACT:     <Phone className="w-4 h-4" />,
  PARKING:     <ParkingSquare className="w-4 h-4" />,
  CUSTOM:      <Plus className="w-4 h-4" />,
};

const SECTION_COLORS: Record<string, string> = {
  WELCOME:     "bg-pink-50 text-pink-600",
  WIFI:        "bg-blue-50 text-blue-600",
  CHECKIN:     "bg-amber-50 text-amber-600",
  HOUSE_RULES: "bg-purple-50 text-purple-600",
  LOCATION:    "bg-green-50 text-green-600",
  LOCAL_RECS:  "bg-orange-50 text-orange-600",
  CONTACT:     "bg-teal-50 text-teal-600",
  PARKING:     "bg-slate-50 text-slate-600",
  CUSTOM:      "bg-gray-50 text-gray-600",
};

interface Section {
  id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  isVisible: boolean;
  order: number;
}

interface SectionEditorProps {
  sections: Section[];
  propertyId?: string;
  onUpdate: (sections: Section[]) => void;
}

export default function SectionEditor({ sections, propertyId, onUpdate }: SectionEditorProps) {
  const [openId, setOpenId] = useState<string | null>(sections[0]?.id ?? null);
  const [saving, setSaving] = useState<string | null>(null);

  async function saveSection(section: Section) {
    setSaving(section.id);
    await fetch(`/api/sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: section.title, content: section.content, isVisible: section.isVisible }),
    });
    setSaving(null);
  }

  function updateSection(id: string, changes: Partial<Section>) {
    onUpdate(sections.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }

  async function toggleVisibility(section: Section) {
    const updated = { ...section, isVisible: !section.isVisible };
    updateSection(section.id, { isVisible: updated.isVisible });
    await fetch(`/api/sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: updated.isVisible }),
    });
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div
          key={section.id}
          className={`bg-white border rounded-xl overflow-hidden transition-all ${
            section.isVisible ? "border-[#EDEDE9]" : "border-[#EDEDE9] opacity-60"
          }`}
        >
          {/* Section header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[#F7F7F5] transition-colors"
            onClick={() => setOpenId(openId === section.id ? null : section.id)}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${SECTION_COLORS[section.type] ?? "bg-gray-50 text-gray-600"}`}>
              {SECTION_ICONS[section.type]}
            </div>
            <span className="font-medium text-[#262626] text-sm flex-1">{section.title}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); toggleVisibility(section); }}
                className="p-1.5 rounded-lg hover:bg-[#EDEDE9] text-[#6B6B6B] transition-colors"
                title={section.isVisible ? "Hide section" : "Show section"}
              >
                {section.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              {openId === section.id
                ? <ChevronUp className="w-4 h-4 text-[#6B6B6B]" />
                : <ChevronDown className="w-4 h-4 text-[#6B6B6B]" />
              }
            </div>
          </div>

          {/* Section form */}
          {openId === section.id && (
            <div className="px-4 pb-4 pt-1 border-t border-[#F0F0EE]">
              <SectionForm
                section={section}
                onChange={(changes) => updateSection(section.id, changes)}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => saveSection(section)}
                  disabled={saving === section.id}
                  className="bg-[#0F2F61] hover:bg-[#0a2347] text-white h-8 text-xs px-4"
                >
                  {saving === section.id ? (
                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Saving...</>
                  ) : "Save"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionForm({
  section,
  onChange,
}: {
  section: Section;
  onChange: (changes: Partial<Section>) => void;
}) {
  const content = section.content as Record<string, unknown>;

  function setContent(updates: Record<string, unknown>) {
    onChange({ content: { ...content, ...updates } });
  }

  switch (section.type) {
    case "WELCOME":
      return <WelcomeForm content={content} setContent={setContent} onChange={onChange} section={section} />;

    case "WIFI":
      return (
        <div className="space-y-3 pt-3">
          <Field label="Network name (SSID)">
            <Input
              value={(content.network as string) ?? ""}
              onChange={(e) => setContent({ network: e.target.value })}
              placeholder="e.g. Apartment_WiFi"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </Field>
          <Field label="Password">
            <Input
              value={(content.password as string) ?? ""}
              onChange={(e) => setContent({ password: e.target.value })}
              placeholder="WiFi password"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </Field>
          <Field label="Note (optional)">
            <Input
              value={(content.note as string) ?? ""}
              onChange={(e) => setContent({ note: e.target.value })}
              placeholder="e.g. 2.4GHz network for smart TV"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </Field>
        </div>
      );

    case "CHECKIN":
      return <CheckinForm content={content} setContent={setContent} />;

    case "HOUSE_RULES":
      return (
        <div className="space-y-3 pt-3">
          <Label className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide">Rules</Label>
          <RulesList
            rules={(content.rules as string[]) ?? []}
            onChange={(rules) => setContent({ rules })}
          />
        </div>
      );

    case "LOCATION":
      return (
        <div className="space-y-3 pt-3">
          <Field label="Address">
            <Input
              value={(content.address as string) ?? ""}
              onChange={(e) => setContent({ address: e.target.value })}
              placeholder="e.g. 123 Main Street, New York"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </Field>
          <p className="text-xs text-[#6B6B6B] -mt-1">
            A "Open in Google Maps" button will be generated automatically from the address above.
          </p>
          <Field label="Directions">
            <Textarea
              value={(content.directions as string) ?? ""}
              onChange={(e) => setContent({ directions: e.target.value })}
              placeholder="Describe how to get here from the airport, city centre..."
              className="text-sm border-[#EDEDE9] resize-none"
              rows={3}
            />
          </Field>
        </div>
      );

    case "LOCAL_RECS":
      return (
        <div className="space-y-3 pt-3">
          <Label className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide">Recommended places</Label>
          <PlacesList
            places={(content.places as Place[]) ?? []}
            onChange={(places) => setContent({ places })}
          />
        </div>
      );

    case "CONTACT":
      return (
        <div className="space-y-3 pt-3">
          <Field label="Phone number">
            <Input
              value={(content.phone as string) ?? ""}
              onChange={(e) => setContent({ phone: e.target.value })}
              placeholder="e.g. +387 61 123 456"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </Field>
          <Field label="Label (optional)">
            <Input
              value={(content.label as string) ?? ""}
              onChange={(e) => setContent({ label: e.target.value })}
              placeholder="e.g. Host – Haris"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </Field>
          <p className="text-xs text-[#6B6B6B]">
            Guests will see buttons for Phone call, Viber and WhatsApp.
          </p>
        </div>
      );

    case "PARKING": {
      const available = (content.available as boolean) ?? false;
      return (
        <div className="space-y-3 pt-3">
          <Field label="Parking available">
            <div className="flex gap-2">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setContent({ available: val })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    available === val
                      ? "bg-[#0F2F61] text-white border-[#0F2F61]"
                      : "bg-white text-[#6B6B6B] border-[#EDEDE9] hover:border-[#0F2F61]"
                  }`}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </Field>
          {available && (
            <>
              <Field label="Parking type">
                <div className="flex gap-2 flex-wrap">
                  {["Garage", "Street", "Parking lot"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContent({ parkingType: type })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        (content.parkingType as string) === type
                          ? "bg-[#0F2F61] text-white border-[#0F2F61]"
                          : "bg-white text-[#6B6B6B] border-[#EDEDE9] hover:border-[#0F2F61]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Cost">
                <div className="flex gap-2">
                  {([false, true] as const).map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => setContent({ paid: val })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        (content.paid as boolean) === val
                          ? "bg-[#0F2F61] text-white border-[#0F2F61]"
                          : "bg-white text-[#6B6B6B] border-[#EDEDE9] hover:border-[#0F2F61]"
                      }`}
                    >
                      {val ? "Paid" : "Free"}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}
          <Field label="Notes (optional)">
            <Textarea
              value={(content.notes as string) ?? ""}
              onChange={(e) => setContent({ notes: e.target.value })}
              placeholder="e.g. Park in spot #12, code for gate is 1234..."
              className="text-sm border-[#EDEDE9] resize-none"
              rows={3}
            />
          </Field>
        </div>
      );
    }

    case "CUSTOM":
      return (
        <div className="space-y-3 pt-3">
          <Field label="Section title">
            <Input
              value={section.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Section name"
              className="h-9 text-sm border-[#EDEDE9]"
            />
          </Field>
          <Field label="Content">
            <Textarea
              value={(content.body as string) ?? ""}
              onChange={(e) => setContent({ body: e.target.value })}
              placeholder="Enter content..."
              className="text-sm border-[#EDEDE9] resize-none"
              rows={5}
            />
          </Field>
        </div>
      );

    default:
      return null;
  }
}

function CheckinForm({
  content,
  setContent,
}: {
  content: Record<string, unknown>;
  setContent: (u: Record<string, unknown>) => void;
}) {
  const checkInType = (content.checkInType as string) ?? "SELF";
  const videoUrl = (content.videoUrl as string) ?? "";
  const photoUrl = (content.photoUrl as string) ?? "";
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload-video",
        multipart: true,
      });
      setContent({ videoUrl: blob.url });
    } catch (err) {
      alert("Video upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setContent({ photoUrl: data.url });
      else alert(data.error ?? "Upload failed");
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="space-y-3 pt-3">
      {/* Check-in type toggle */}
      <Field label="Check-in type">
        <div className="flex gap-2">
          {(["SELF", "PERSONAL"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContent({ checkInType: type })}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                checkInType === type
                  ? "bg-[#0F2F61] text-white border-[#0F2F61]"
                  : "bg-white text-[#6B6B6B] border-[#EDEDE9] hover:border-[#0F2F61]"
              }`}
            >
              {type === "SELF" ? "Self check-in" : "Personal welcome"}
            </button>
          ))}
        </div>
      </Field>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Check-in time">
          <Input
            type="time"
            value={(content.checkIn as string) ?? "15:00"}
            onChange={(e) => setContent({ checkIn: e.target.value })}
            className="h-9 text-sm border-[#EDEDE9]"
          />
        </Field>
        <Field label="Check-out time">
          <Input
            type="time"
            value={(content.checkOut as string) ?? "11:00"}
            onChange={(e) => setContent({ checkOut: e.target.value })}
            className="h-9 text-sm border-[#EDEDE9]"
          />
        </Field>
      </div>

      {/* Instructions */}
      <Field label="Instructions">
        <Textarea
          value={(content.instructions as string) ?? ""}
          onChange={(e) => setContent({ instructions: e.target.value })}
          placeholder={
            checkInType === "SELF"
              ? "Describe the self check-in process step by step..."
              : "Describe how you will welcome guests personally..."
          }
          className="text-sm border-[#EDEDE9] resize-none"
          rows={4}
        />
      </Field>

      {/* Photo + Video upload — only for self check-in */}
      {checkInType === "SELF" && (
        <>
          <Field label="Instruction photo (optional)">
            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoUrl} alt="check-in" className="w-full max-h-48 object-cover rounded-xl" />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => photoRef.current?.click()}
                    className="text-xs font-medium text-[#0F2F61] bg-white border border-[#EDEDE9] px-3 py-1.5 rounded-lg hover:bg-[#F0F0EE] transition-colors"
                  >
                    Replace photo
                  </button>
                  <button
                    onClick={() => setContent({ photoUrl: "" })}
                    className="text-xs font-medium text-red-500 bg-white border border-[#EDEDE9] px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full h-20 border-2 border-dashed border-[#EDEDE9] rounded-xl flex flex-col items-center justify-center gap-2 text-[#6B6B6B] hover:border-[#0F2F61] hover:text-[#0F2F61] transition-colors"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-xs font-medium">Upload photo (JPG, PNG, max 5MB)</span>
                  </>
                )}
              </button>
            )}
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </Field>

          <Field label="Instruction video (optional)">
            {videoUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video src={videoUrl} controls className="w-full max-h-48 rounded-xl" />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-medium text-[#0F2F61] bg-white border border-[#EDEDE9] px-3 py-1.5 rounded-lg hover:bg-[#F0F0EE] transition-colors"
                  >
                    Replace video
                  </button>
                  <button
                    onClick={() => setContent({ videoUrl: "" })}
                    className="text-xs font-medium text-red-500 bg-white border border-[#EDEDE9] px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-20 border-2 border-dashed border-[#EDEDE9] rounded-xl flex flex-col items-center justify-center gap-2 text-[#6B6B6B] hover:border-[#0F2F61] hover:text-[#0F2F61] transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    <span className="text-xs font-medium">Upload video (MP4, MOV, max 100MB)</span>
                  </>
                )}
              </button>
            )}
            <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />
          </Field>
        </>
      )}
    </div>
  );
}

function WelcomeForm({
  content,
  setContent,
  onChange,
  section,
}: {
  content: Record<string, unknown>;
  setContent: (u: Record<string, unknown>) => void;
  onChange: (c: Partial<{ title: string; content: Record<string, unknown> }>) => void;
  section: { title: string };
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const imageUrl = (content.heroImage as string) ?? "";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const text = await res.text();
      let data: { url?: string; error?: string };
      try { data = JSON.parse(text); } catch { data = { error: text.slice(0, 200) }; }
      if (data.url) setContent({ heroImage: data.url });
      else alert("Upload error: " + (data.error ?? "Unknown"));
    } catch (e) {
      alert("Upload error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 pt-3">
      {/* Hero image upload */}
      <Field label="Hero image (background)">
        {imageUrl ? (
          <div className="relative rounded-xl overflow-hidden h-36">
            <img src={imageUrl} alt="hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-white text-[#262626] text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Change
              </button>
              <button
                onClick={() => setContent({ heroImage: "" })}
                className="bg-white text-red-500 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full h-24 border-2 border-dashed border-[#EDEDE9] rounded-xl flex flex-col items-center justify-center gap-2 text-[#6B6B6B] hover:border-[#0F2F61] hover:text-[#0F2F61] transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs font-medium">Add image (JPG, PNG, max 5MB)</span>
              </>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </Field>

      <Field label="Welcome title">
        <Input
          value={(content.welcomeTitle as string) ?? ""}
          onChange={(e) => setContent({ welcomeTitle: e.target.value })}
          placeholder="e.g. Welcome to our apartment!"
          className="h-9 text-sm border-[#EDEDE9]"
        />
      </Field>
      <Field label="Message to guests">
        <Textarea
          value={(content.message as string) ?? ""}
          onChange={(e) => setContent({ message: e.target.value })}
          placeholder="Write a warm welcome message for your guests..."
          className="text-sm border-[#EDEDE9] resize-none"
          rows={3}
        />
      </Field>
      <Field label="Host name">
        <Input
          value={(content.hostName as string) ?? ""}
          onChange={(e) => setContent({ hostName: e.target.value })}
          placeholder="e.g. Haris & Amina"
          className="h-9 text-sm border-[#EDEDE9]"
        />
      </Field>
      <Field label="Button text">
        <Input
          value={(content.ctaText as string) ?? ""}
          onChange={(e) => setContent({ ctaText: e.target.value })}
          placeholder="e.g. Explore the guide"
          className="h-9 text-sm border-[#EDEDE9]"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#6B6B6B]">{label}</Label>
      {children}
    </div>
  );
}

function RulesList({ rules, onChange }: { rules: string[]; onChange: (r: string[]) => void }) {
  const add = () => onChange([...rules, ""]);
  const remove = (i: number) => onChange(rules.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) => onChange(rules.map((r, idx) => (idx === i ? val : r)));

  return (
    <div className="space-y-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={rule}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Rule ${i + 1}`}
            className="h-9 text-sm border-[#EDEDE9]"
          />
          <button onClick={() => remove(i)} className="p-2 text-[#6B6B6B] hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-[#FF6700] hover:text-[#e05c00] font-medium transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add rule
      </button>
    </div>
  );
}

type Place = { name: string; category: string; description: string; link?: string };

function PlacesList({ places, onChange }: { places: Place[]; onChange: (p: Place[]) => void }) {
  const add = () => onChange([...places, { name: "", category: "", description: "", link: "" }]);
  const remove = (i: number) => onChange(places.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Place, val: string) =>
    onChange(places.map((p, idx) => (idx === i ? { ...p, [field]: val } : p)));

  return (
    <div className="space-y-3">
      {places.map((place, i) => (
        <div key={i} className="bg-[#F7F7F5] rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={place.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Place name"
              className="h-8 text-sm border-[#EDEDE9] bg-white flex-1"
            />
            <Input
              value={place.category}
              onChange={(e) => update(i, "category", e.target.value)}
              placeholder="Category"
              className="h-8 text-sm border-[#EDEDE9] bg-white w-32"
            />
            <button onClick={() => remove(i)} className="p-1.5 text-[#6B6B6B] hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <Input
            value={place.description}
            onChange={(e) => update(i, "description", e.target.value)}
            placeholder="Short description..."
            className="h-8 text-sm border-[#EDEDE9] bg-white"
          />
          <Input
            value={place.link ?? ""}
            onChange={(e) => update(i, "link", e.target.value)}
            placeholder="Google Maps link (optional) — e.g. https://maps.app.goo.gl/..."
            className="h-8 text-sm border-[#EDEDE9] bg-white"
          />
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-sm text-[#FF6700] hover:text-[#e05c00] font-medium transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add place
      </button>
    </div>
  );
}
