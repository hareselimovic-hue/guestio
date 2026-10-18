import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { countryName, decryptGuests, formatDateBs, type RegisteredGuest } from "@/lib/guest-registration";
import DeleteRegistrationButton from "@/components/DeleteRegistrationButton";
import { ClipboardList, Users, ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sarajevo",
  });
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; period?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { property: propertyFilter, period = "upcoming" } = await searchParams;

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session!.user.id),
    getWorkspaceMemberUserIds(session!.user.id),
  ]);
  const accessWhere = propertyAccessWhere(session!.user.id, wsIds, memberUserIds);

  const properties = await prisma.property.findMany({
    where: accessWhere,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const registrations = await prisma.guestRegistration.findMany({
    where: {
      property: accessWhere,
      ...(propertyFilter ? { propertyId: propertyFilter } : {}),
      ...(period === "upcoming" ? { checkOut: { gte: today } } : period === "past" ? { checkOut: { lt: today } } : {}),
    },
    include: { property: { select: { name: true } } },
    orderBy: period === "upcoming" ? { checkIn: "asc" } : { checkIn: "desc" },
    take: 200,
  });

  const rows = registrations.map((r) => {
    let guests: RegisteredGuest[] = [];
    let decryptError = false;
    try { guests = decryptGuests(r.guestsEnc); } catch { decryptError = true; }
    return { ...r, guests, decryptError };
  });

  const th = "text-left px-3 py-2.5 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide whitespace-nowrap";
  const td = "px-3 py-2.5 text-[#262626] whitespace-nowrap";

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#262626] flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-[#0F2F61]" />
          Guest registrations
        </h1>
        <p className="text-[#6B6B6B] mt-1 text-sm">
          Guest details submitted through the guide link. Turn the form on per property on the property page.
        </p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3 mb-6">
        <label className="block">
          <span className="block text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1">Property</span>
          <select name="property" defaultValue={propertyFilter ?? ""} className="bg-white border border-[#EDEDE9] rounded-lg px-3 py-2 text-sm min-w-[200px]">
            <option value="">All properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1">Stay</span>
          <select name="period" defaultValue={period} className="bg-white border border-[#EDEDE9] rounded-lg px-3 py-2 text-sm">
            <option value="upcoming">Current & upcoming</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </select>
        </label>
        <button type="submit" className="bg-[#0F2F61] hover:bg-[#0a2347] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Filter
        </button>
      </form>

      {/* List */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EDEDE9] p-8 text-center">
          <ClipboardList className="w-8 h-8 text-[#EDEDE9] mx-auto mb-3" />
          <p className="text-[#6B6B6B] text-sm">No registrations yet.</p>
          <p className="text-[#BABAB5] text-xs mt-1">They will appear here as soon as a guest submits the form.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <details key={r.id} id={r.id} className="group bg-white rounded-xl border border-[#EDEDE9] overflow-hidden">
              <summary className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 cursor-pointer list-none hover:bg-[#F7F7F5] transition-colors">
                <span className="font-semibold text-[#262626]">{r.property.name}</span>
                <span className="text-sm text-[#0F2F61] font-medium">
                  {formatDateBs(iso(r.checkIn))} – {formatDateBs(iso(r.checkOut))}
                </span>
                <span className="inline-flex items-center gap-1 text-sm text-[#6B6B6B]">
                  <Users className="w-3.5 h-3.5" /> {r.guestCount} · {r.leadGuestName}
                </span>
                <span className="ml-auto flex items-center gap-2 text-xs text-[#BABAB5]">
                  Submitted {formatDateTime(r.createdAt)}
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>

              <div className="border-t border-[#EDEDE9]">
                {r.decryptError ? (
                  <p className="p-4 text-sm text-red-600">Guest details could not be decrypted.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#EDEDE9] bg-[#F7F7F5]">
                          <th className={th}>Ime</th>
                          <th className={th}>Prezime</th>
                          <th className={th}>Datum rođenja</th>
                          <th className={th}>Spol</th>
                          <th className={th}>Državljanstvo</th>
                          <th className={th}>Mjesto rođenja</th>
                          <th className={th}>Putna isprava</th>
                          <th className={th}>Broj isprave</th>
                          <th className={th}>Rok važenja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.guests.map((g, i) => (
                          <tr key={i} className="border-b border-[#EDEDE9] last:border-0">
                            <td className={td}>{g.firstName}</td>
                            <td className={td}>{g.lastName}</td>
                            <td className={td}>{formatDateBs(g.dateOfBirth)}</td>
                            <td className={td}>{g.sex === "M" ? "Muški" : "Ženski"}</td>
                            <td className={td}>{countryName(g.citizenship)}</td>
                            <td className={td}>{g.placeOfBirth}</td>
                            <td className={td}>{g.documentType === "PASSPORT" ? "Pasoš" : "Lična karta"}</td>
                            <td className={`${td} font-mono`}>{g.documentNumber}</td>
                            <td className={td}>{formatDateBs(g.documentExpiry)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end px-4 py-2.5 border-t border-[#EDEDE9] bg-[#FAFAF8]">
                  <DeleteRegistrationButton id={r.id} />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
