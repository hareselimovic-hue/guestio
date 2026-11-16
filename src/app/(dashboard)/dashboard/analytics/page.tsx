import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { BarChart2, Eye, Link2, ExternalLink, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
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
      previewViewCount: true,
      chatCount: true,
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
  const totalViews = properties.reduce((sum, p) =>
    sum + p.previewViewCount + p.guests.reduce((s, g) => s + g.viewCount, 0), 0);
  const totalChats = properties.reduce((sum, p) => sum + (p.chatCount ?? 0), 0);

  // Recent views (last 50, across all properties)
  const allViews: { viewedAt: Date; propertyName: string; slug: string; token: string; guestName: string | null }[] = [];
  for (const property of properties) {
    for (const guest of property.guests) {
      for (const view of guest.views) {
        allViews.push({
          viewedAt: view.viewedAt,
          propertyName: property.name,
          slug: property.slug,
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
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-navy" />
          Analytics
        </h1>
        <p className="text-ink-2 mt-1 text-sm">Guest link opens and AI chat usage per property</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-line">
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">Properties</p>
          <p className="text-3xl font-bold text-ink">{properties.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-line">
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">Guest links</p>
          <p className="text-3xl font-bold text-ink">{totalLinks}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-line col-span-2 sm:col-span-1">
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">Total opens</p>
          <p className="text-3xl font-bold text-orange">{totalViews}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-line col-span-2 sm:col-span-1">
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">AI chat messages</p>
          <p className="text-3xl font-bold text-violet-600">{totalChats}</p>
        </div>
      </div>

      {/* Per-property breakdown */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-ink mb-3">By property</h2>
        <div className="bg-white rounded-xl border border-line overflow-hidden">
          {properties.length === 0 ? (
            <p className="text-ink-2 text-sm p-6">No properties yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Property</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Links</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Opens</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden sm:table-cell">AI chat</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden sm:table-cell">Last opened</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const views = property.previewViewCount + property.guests.reduce((s, g) => s + g.viewCount, 0);
                  const lastView = property.guests
                    .flatMap((g) => g.views.map((v) => v.viewedAt))
                    .sort((a, b) => b.getTime() - a.getTime())[0];
                  return (
                    <tr key={property.id} className="border-b border-line last:border-0 hover:bg-canvas transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{property.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-ink-2">
                          <Link2 className="w-3.5 h-3.5" />
                          {property.guests.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 font-semibold ${views > 0 ? "text-orange" : "text-ink-4"}`}>
                          <Eye className="w-3.5 h-3.5" />
                          {views}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className={`inline-flex items-center gap-1 font-semibold ${(property.chatCount ?? 0) > 0 ? "text-violet-600" : "text-ink-4"}`}>
                          <MessageCircle className="w-3.5 h-3.5" />
                          {property.chatCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-2 hidden sm:table-cell">
                        {lastView ? timeAgo(lastView) : <span className="text-ink-4">—</span>}
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
        <h2 className="text-base font-semibold text-ink mb-3">Recent opens</h2>
        {recentViews.length === 0 ? (
          <div className="bg-white rounded-xl border border-line p-8 text-center">
            <Eye className="w-8 h-8 text-line mx-auto mb-3" />
            <p className="text-ink-2 text-sm">No opens yet.</p>
            <p className="text-ink-4 text-xs mt-1">This will appear here as soon as a guest opens a link.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden sm:table-cell">Link</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Opened</th>
                </tr>
              </thead>
              <tbody>
                {recentViews.map((view, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-canvas transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink">{view.propertyName}</span>
                      {view.guestName && (
                        <span className="text-ink-2 text-xs ml-2">· {view.guestName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <a
                        href={`/g/${view.slug}/${view.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy font-mono text-xs hover:underline flex items-center gap-1"
                      >
                        {view.token.slice(0, 8)}…
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-ink-2 text-xs">
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
