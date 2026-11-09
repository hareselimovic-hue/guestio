"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, ArrowRight, Building2, Search, Check, AlertTriangle } from "lucide-react";

interface Property {
  id: string;
  name: string;
  internalName: string | null;
  _count: { sections: number; guests: number };
  thumb?: string | null;
  issues?: string[];
}

const LS_KEY = "smartstay_linked_properties";

export default function PropertiesList({ properties }: { properties: Property[] }) {
  const [query, setQuery] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const withIssues = properties.filter((p) => (p.issues?.length ?? 0) > 0).length;
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

  const filtered = (query.trim()
    ? properties.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          (p.internalName ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : properties
  ).filter((p) => !onlyIssues || (p.issues?.length ?? 0) > 0);

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
            href="/dashboard/properties/new?kind=apartment"
            className="flex items-center gap-1.5 text-sm font-medium text-[#FF6700] hover:text-[#e05c00] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New property
          </Link>
        </div>
      </div>

      {withIssues > 0 && (
        <div className="flex gap-2 px-4 sm:px-6 py-3 border-b border-[#EDEDE9]">
          {[{ v: false, label: `All · ${properties.length}` }, { v: true, label: `Needs attention · ${withIssues}` }].map((c) => (
            <button
              key={String(c.v)}
              onClick={() => setOnlyIssues(c.v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                onlyIssues === c.v ? "bg-[#0F2F61] border-[#0F2F61] text-white" : "bg-white border-[#EDEDE9] text-[#262626]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

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
            href="/dashboard/properties/new?kind=apartment"
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
                  className="pl-3 sm:pl-4 shrink-0 flex items-center justify-center h-full"
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
                  className="flex flex-1 min-w-0 items-center gap-3 px-3 sm:px-4 py-3 hover:bg-[#F7F7F5] active:bg-[#F7F7F5] transition-colors group"
                >
                  {p.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" loading="lazy" className="w-12 h-12 rounded-xl object-cover shrink-0 bg-[#EDEDE9]" />
                  ) : (
                    <span className="w-12 h-12 rounded-xl bg-[#0F2F61]/5 text-[#0F2F61] flex items-center justify-center shrink-0"><Building2 className="w-5 h-5" /></span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate transition-colors group-hover:text-[#0F2F61] ${isLinked ? "text-[#6B6B6B]" : "text-[#262626]"}`}>
                      {p.internalName || p.name}
                    </p>
                    {p.internalName && <p className="text-xs text-[#9B9B9B] truncate mt-0.5">{p.name}</p>}
                    {p.issues && p.issues.length > 0 ? (
                      <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 mt-1 max-w-full">
                        <AlertTriangle className="w-3 h-3 shrink-0" /><span className="truncate">{p.issues[0]}{p.issues.length > 1 ? ` +${p.issues.length - 1}` : ""}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-[#9B9B9B] mt-0.5">{p._count.sections} sections</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 text-[#BABAB5] group-hover:text-[#0F2F61] transition-colors" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
