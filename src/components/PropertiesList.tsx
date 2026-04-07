"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Building2, Search, Check } from "lucide-react";

interface Property {
  id: string;
  name: string;
  internalName: string | null;
  _count: { sections: number; guests: number };
}

const LS_KEY = "smartstay_linked_properties";

export default function PropertiesList({ properties }: { properties: Property[] }) {
  const [query, setQuery] = useState("");
  const [linked, setLinked] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
      setLinked(new Set(stored));
    } catch {}
  }, []);

  function toggleLinked(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLinked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const filtered = query.trim()
    ? properties.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.internalName ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : properties;

  return (
    <div className="bg-white rounded-xl border border-[#EDEDE9]">
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-[#EDEDE9] gap-3">
        <h2 className="font-semibold text-[#262626]">Your properties</h2>
        <div className="flex items-center gap-3">
          {properties.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#BABAB5]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 h-8 text-sm border border-[#EDEDE9] rounded-lg outline-none focus:border-[#0F2F61] transition-colors w-36 sm:w-48"
              />
            </div>
          )}
          <Link
            href="/dashboard/properties/new"
            className="flex items-center gap-1.5 text-sm font-medium text-[#FF6700] hover:text-[#e05c00] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New property
          </Link>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="w-14 h-14 bg-[#EDEDE9] rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-[#6B6B6B]" />
          </div>
          <p className="text-[#262626] font-medium mb-1">No properties yet</p>
          <p className="text-[#6B6B6B] text-sm mb-4">
            Create your first property and start sharing guides with guests
          </p>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-2 bg-[#0F2F61] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2347] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create first property
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-[#6B6B6B] text-sm">No properties match "{query}"</p>
        </div>
      ) : (
        <ul className="divide-y divide-[#EDEDE9]">
          {filtered.map((p) => {
            const isLinked = linked.has(p.id);
            return (
              <li key={p.id} className="flex items-center">
                <button
                  onClick={(e) => toggleLinked(p.id, e)}
                  title={isLinked ? "Linked on all platforms" : "Mark as linked"}
                  className="ml-4 shrink-0 flex items-center justify-center"
                >
                  <span
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isLinked
                        ? "bg-green-500 border-green-500"
                        : "border-[#EDEDE9] hover:border-[#BABAB5]"
                    }`}
                  >
                    {isLinked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                </button>
                <Link
                  href={`/dashboard/properties/${p.id}`}
                  className="flex flex-1 items-center justify-between px-4 py-4 hover:bg-[#F7F7F5] transition-colors group"
                >
                  <div>
                    <p className={`font-medium transition-colors group-hover:text-[#0F2F61] ${isLinked ? "text-[#6B6B6B]" : "text-[#262626]"}`}>
                      {p.name}
                    </p>
                    {p.internalName && (
                      <p className="text-xs text-[#6B6B6B] mt-0.5 italic">{p.internalName}</p>
                    )}
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      {p._count.sections} sections
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B6B6B] group-hover:text-[#0F2F61] transition-colors" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
