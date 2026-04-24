import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { BarChart2, Eye, Link2, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "upravo";
  if (diff < 3600) return `prije ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `prije ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `prije ${Math.floor(diff / 86400)} dana`;
  return date.toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("hr-HR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const [wsIds, memberUserIds] = await Promise.all([
    getUserWorkspaceIds(session!.user.id),
    getWorkspaceMemberUserIds(session!.user.id),
  ]);
  const accessWhere = propertyAccessWhere(session!.user.id, wsIds, memberUserIds);

  const properties = await prisma.property.findMany({
    where: accessWhere,
    select: {
      id: true,
      name: true,
      slug: true,
      guests: {
        select: {
          id: true,
          token: true,
          guestName: true,
          viewCount: true,
          createdAt: true,
          views: {
            select: { viewedAt: true },
            orderBy: { viewedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Aggregate stats
  const totalLinks = properties.reduce((sum, p) => sum + p.guests.length, 0);
  const totalViews = properties.reduce((sum, p) => sum + p.guests.reduce((s, g) => s + g.viewCount, 0), 0);

  // Recent views (last 50, across all properties)
  const allViews: { viewedAt: Date; propertyName: string; token: string; guestName: string | null }[] = [];
  for (const property of properties) {
    for (const guest of property.guests) {
      for (const view of guest.views) {
        allViews.push({
          viewedAt: view.viewedAt,
          propertyName: property.name,
          token: guest.token,
          guestName: guest.guestName,
        });
      }
    }
  }
  allViews.sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime());
  const recentViews = allViews.slice(0, 50);

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626] flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-[#0F2F61]" />
          Analytics
        </h1>
        <p className="text-[#6B6B6B] mt-1 text-sm">Pregled otvaranja guest linkova po apartmanu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#EDEDE9]">
          <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">Apartmani</p>
          <p className="text-3xl font-bold text-[#262626]">{properties.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#EDEDE9]">
          <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">Guest linkovi</p>
          <p className="text-3xl font-bold text-[#262626]">{totalLinks}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-[#EDEDE9] col-span-2 sm:col-span-1">
          <p className="text-xs text-[#6B6B6B] font-medium uppercase tracking-wide mb-1">Ukupno otvaranja</p>
          <p className="text-3xl font-bold text-[#FF6700]">{totalViews}</p>
        </div>
      </div>

      {/* Per-property breakdown */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#262626] mb-3">Po apartmanu</h2>
        <div className="bg-white rounded-xl border border-[#EDEDE9] overflow-hidden">
          {properties.length === 0 ? (
            <p className="text-[#6B6B6B] text-sm p-6">Nema apartmana.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDEDE9] bg-[#F7F7F5]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Apartman</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Linkovi</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Otvaranja</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide hidden sm:table-cell">Zadnje otvaranje</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const views = property.guests.reduce((s, g) => s + g.viewCount, 0);
                  const lastView = property.guests
                    .flatMap((g) => g.views.map((v) => v.viewedAt))
                    .sort((a, b) => b.getTime() - a.getTime())[0];
                  return (
                    <tr key={property.id} className="border-b border-[#EDEDE9] last:border-0 hover:bg-[#F7F7F5] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#262626]">{property.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[#6B6B6B]">
                          <Link2 className="w-3.5 h-3.5" />
                          {property.guests.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 font-semibold ${views > 0 ? "text-[#FF6700]" : "text-[#BABAB5]"}`}>
                          <Eye className="w-3.5 h-3.5" />
                          {views}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B6B6B] hidden sm:table-cell">
                        {lastView ? timeAgo(lastView) : <span className="text-[#BABAB5]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent views feed */}
      <div>
        <h2 className="text-base font-semibold text-[#262626] mb-3">Zadnja otvaranja</h2>
        {recentViews.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#EDEDE9] p-8 text-center">
            <Eye className="w-8 h-8 text-[#EDEDE9] mx-auto mb-3" />
            <p className="text-[#6B6B6B] text-sm">Još nema otvaranja.</p>
            <p className="text-[#BABAB5] text-xs mt-1">Pojavit će se ovdje čim gost otvori link.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#EDEDE9] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EDEDE9] bg-[#F7F7F5]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Apartman</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide hidden sm:table-cell">Link</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">Otvoreno</th>
                </tr>
              </thead>
              <tbody>
                {recentViews.map((view, i) => (
                  <tr key={i} className="border-b border-[#EDEDE9] last:border-0 hover:bg-[#F7F7F5] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-[#262626]">{view.propertyName}</span>
                      {view.guestName && (
                        <span className="text-[#6B6B6B] text-xs ml-2">· {view.guestName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <a
                        href={`/g/${view.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0F2F61] font-mono text-xs hover:underline flex items-center gap-1"
                      >
                        {view.token.slice(0, 8)}…
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[#6B6B6B] text-xs">
                      <span title={formatDateTime(view.viewedAt)}>{timeAgo(view.viewedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
