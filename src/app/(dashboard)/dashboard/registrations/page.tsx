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
    where: { AND: [accessWhere, { prospectToken: null }] },
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

  const th = "text-left px-3 py-2.5 text-xs font-semibold text-ink-2 uppercase tracking-wide whitespace-nowrap";
  const td = "px-3 py-2.5 text-ink whitespace-nowrap";

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-navy" />
          Guest registrations
        </h1>
        <p className="text-ink-2 mt-1 text-sm">
          Guest details submitted through the guide link. Turn the form on per property on the property page.
        </p>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-end gap-3 mb-6">
        <label className="block">
          <span className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Property</span>
          <select name="property" defaultValue={propertyFilter ?? ""} className="bg-white border border-line rounded-lg px-3 py-2 text-sm min-w-[200px]">
            <option value="">All properties</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Stay</span>
          <select name="period" defaultValue={period} className="bg-white border border-line rounded-lg px-3 py-2 text-sm">
            <option value="upcoming">Current & upcoming</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </select>
        </label>
        <button type="submit" className="bg-navy hover:bg-navy-dark text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Filter
        </button>
      </form>

      {/* List */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-line p-8 text-center">
          <ClipboardList className="w-8 h-8 text-line mx-auto mb-3" />
          <p className="text-ink-2 text-sm">No registrations yet.</p>
          <p className="text-ink-4 text-xs mt-1">They will appear here as soon as a guest submits the form.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <details key={r.id} id={r.id} className="group bg-white rounded-xl border border-line overflow-hidden">
              <summary className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 cursor-pointer list-none hover:bg-canvas transition-colors">
                <span className="font-semibold text-ink">{r.property.name}</span>
                <span className="text-sm text-navy font-medium">
                  {formatDateBs(iso(r.checkIn))} – {formatDateBs(iso(r.checkOut))}
                </span>
                <span className="inline-flex items-center gap-1 text-sm text-ink-2">
                  <Users className="w-3.5 h-3.5" /> {r.guestCount} · {r.leadGuestName}
                </span>
                <span className="ml-auto flex items-center gap-2 text-xs text-ink-4">
                  Submitted {formatDateTime(r.createdAt)}
                  <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>

              <div className="border-t border-line">
                {r.decryptError ? (
                  <p className="p-4 text-sm text-red-600">Guest details could not be decrypted.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line bg-canvas">
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
                          <tr key={i} className="border-b border-line last:border-0">
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
                <div className="flex justify-end px-4 py-2.5 border-t border-line bg-canvas-2">
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
