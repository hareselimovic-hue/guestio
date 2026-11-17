import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { CHAT_TOPICS } from "@/lib/chat-topics";
import ResolveQuestionButton from "@/components/ResolveQuestionButton";
import { BarChart2, Eye, MessageCircle, CheckCircle2, HelpCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const PERIOD_DAYS = 30;
// Dated opens and saved AI questions exist from this day on (older data was only a running total)
const TRACKING_SINCE = new Date("2026-11-17T00:00:00Z");

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;
  const [wsIds, memberUserIds] = await Promise.all([getUserWorkspaceIds(userId), getWorkspaceMemberUserIds(userId)]);

  const properties = await prisma.property.findMany({
    where: propertyAccessWhere(userId, wsIds, memberUserIds),
    select: { id: true, name: true, internalName: true, kind: true, guests: { select: { id: true } } },
  });
  const ids = properties.map((p) => p.id);
  const since = new Date(Date.now() - PERIOD_DAYS * DAY);

  const linkToProperty = new Map<string, string>();
  for (const p of properties) for (const g of p.guests) linkToProperty.set(g.id, p.id);

  const [pageViews, linkViews, questions] = ids.length
    ? await Promise.all([
        prisma.propertyView.groupBy({ by: ["propertyId"], where: { propertyId: { in: ids }, viewedAt: { gte: since } }, _count: true, _max: { viewedAt: true } }),
        linkToProperty.size
          ? prisma.guestLinkView.groupBy({ by: ["guestLinkId"], where: { guestLinkId: { in: [...linkToProperty.keys()] }, viewedAt: { gte: since } }, _count: true, _max: { viewedAt: true } })
          : Promise.resolve([] as { guestLinkId: string; _count: number; _max: { viewedAt: Date | null } }[]),
        prisma.chatQuestion.findMany({
          where: { propertyId: { in: ids }, createdAt: { gte: since } },
          select: { id: true, propertyId: true, question: true, answered: true, topic: true, resolvedAt: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 3000,
        }),
      ])
    : [[], [], []];

  // ── per property ──
  type Row = { id: string; name: string; kind: string; opens: number; questions: number; unanswered: number; last: Date | null };
  const rows = new Map<string, Row>(properties.map((p) => [p.id, { id: p.id, name: p.internalName || p.name, kind: p.kind, opens: 0, questions: 0, unanswered: 0, last: null }]));
  const bumpLast = (r: Row, d: Date | null) => { if (d && (!r.last || d > r.last)) r.last = d; };
  for (const v of pageViews) { const r = rows.get(v.propertyId)!; r.opens += v._count; bumpLast(r, v._max.viewedAt); }
  for (const v of linkViews) { const r = rows.get(linkToProperty.get(v.guestLinkId)!); if (r) { r.opens += v._count; bumpLast(r, v._max.viewedAt); } }
  for (const q of questions) { const r = rows.get(q.propertyId)!; r.questions++; if (!q.answered) r.unanswered++; }
  const table = [...rows.values()].sort((a, b) => b.opens - a.opens || b.questions - a.questions || a.name.localeCompare(b.name));

  // ── totals ──
  const totalOpens = table.reduce((s, r) => s + r.opens, 0);
  const totalQuestions = questions.length;
  const answeredPct = totalQuestions ? Math.round((questions.filter((q) => q.answered).length / totalQuestions) * 100) : null;
  const open = questions.filter((q) => !q.answered && !q.resolvedAt);

  // ── topics ──
  const topicMap = new Map<string, { count: number; examples: string[] }>();
  for (const q of questions) {
    const key = q.topic && CHAT_TOPICS[q.topic] ? q.topic : "OTHER";
    const t = topicMap.get(key) ?? { count: 0, examples: [] };
    t.count++;
    if (t.examples.length < 2 && !t.examples.includes(q.question)) t.examples.push(q.question);
    topicMap.set(key, t);
  }
  const topics = [...topicMap.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxTopic = topics[0]?.[1].count ?? 1;

  const propById = new Map(properties.map((p) => [p.id, p]));
  const addHref = (q: { id: string; propertyId: string; question: string }) => {
    const p = propById.get(q.propertyId)!;
    return p.kind === "HOTEL"
      ? `/dashboard/hotel?property=${p.id}&tab=guide`
      : `/dashboard/properties/${p.id}?open=AI_CONTEXT&qid=${q.id}&ask=${encodeURIComponent(q.question.slice(0, 300))}`;
  };

  const trackingNote = Date.now() - TRACKING_SINCE.getTime() < PERIOD_DAYS * DAY
    ? `Counting since ${TRACKING_SINCE.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  const tiles = [
    { icon: Eye, label: "Guide opens", value: totalOpens.toLocaleString("de-DE") },
    { icon: MessageCircle, label: "Questions to the AI", value: totalQuestions.toLocaleString("de-DE") },
    { icon: CheckCircle2, label: "Answered by the AI", value: answeredPct === null ? "—" : `${answeredPct}%` },
    { icon: HelpCircle, label: "Waiting for an answer in the guide", value: open.length.toLocaleString("de-DE"), warn: open.length > 0 },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-navy" />
          Analytics
        </h1>
        <p className="text-ink-2 mt-1 text-sm">
          Last {PERIOD_DAYS} days{trackingNote ? ` · ${trackingNote}` : ""}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {tiles.map(({ icon: Icon, label, value, warn }) => (
          <div key={label} className={`bg-white rounded-xl p-4 border ${warn ? "border-orange/40" : "border-line"}`}>
            <Icon className={`w-4 h-4 mb-2 ${warn ? "text-orange" : "text-navy"}`} />
            <p className="text-2xl font-bold text-ink leading-none">{value}</p>
            <p className="text-sm text-ink-2 mt-1.5 leading-snug">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* AI didn't know */}
        <section className="bg-white rounded-xl border border-line min-w-0">
          <div className="px-4 py-3 border-b border-line-2">
            <h2 className="text-sm font-semibold text-ink">The AI didn&apos;t know</h2>
            <p className="text-xs text-ink-3 mt-0.5">Add the answer to the guide once — the assistant will know it from then on.</p>
          </div>
          {open.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-3 text-center">
              {totalQuestions ? "Nothing waiting — the assistant could answer every question." : "No questions yet. They will appear here as guests use the AI assistant."}
            </p>
          ) : (
            <ul className="divide-y divide-line-3">
              {open.slice(0, 20).map((q) => (
                <li key={q.id} className="px-4 py-3">
                  <p className="text-sm text-ink">&ldquo;{q.question}&rdquo;</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-ink-3 mr-auto truncate max-w-[60%]">
                      {propById.get(q.propertyId)?.internalName || propById.get(q.propertyId)?.name} · {timeAgo(q.createdAt)}
                    </span>
                    <Link href={addHref(q)} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-navy hover:bg-navy-dark px-2.5 py-1.5 rounded-lg">
                      Add to guide <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <ResolveQuestionButton id={q.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {open.length > 20 && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line-2">+{open.length - 20} more</p>}
        </section>

        {/* What guests ask */}
        <section className="bg-white rounded-xl border border-line min-w-0">
          <div className="px-4 py-3 border-b border-line-2">
            <h2 className="text-sm font-semibold text-ink">What guests ask</h2>
            <p className="text-xs text-ink-3 mt-0.5">Questions to the AI assistant, grouped by topic (any language).</p>
          </div>
          {topics.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-3 text-center">No questions yet.</p>
          ) : (
            <ul className="px-4 py-3 space-y-3">
              {topics.map(([key, t]) => (
                <li key={key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{CHAT_TOPICS[key]}</span>
                    <span className="text-xs text-ink-2 tabular-nums">{t.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-canvas mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-navy" style={{ width: `${Math.max(6, Math.round((t.count / maxTopic) * 100))}%` }} />
                  </div>
                  <p className="text-xs text-ink-3 mt-1 line-clamp-1">{t.examples.map((e) => `“${e}”`).join(" · ")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* By property */}
      <section>
        <h2 className="text-base font-semibold text-ink mb-3">By property</h2>
        <div className="bg-white rounded-xl border border-line overflow-hidden">
          {table.length === 0 ? (
            <p className="text-ink-2 text-sm p-6">No properties yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Property</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Opens</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">AI questions</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden sm:table-cell">Unanswered</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden md:table-cell">Last opened</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-canvas transition-colors">
                    <td className="px-4 py-3 font-medium text-ink max-w-[180px] sm:max-w-none truncate">
                      <Link href={r.kind === "HOTEL" ? `/dashboard/hotel?property=${r.id}` : `/dashboard/properties/${r.id}`} className="hover:text-navy">{r.name}</Link>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${r.opens ? "text-ink font-semibold" : "text-ink-4"}`}>{r.opens}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${r.questions ? "text-ink" : "text-ink-4"}`}>{r.questions}</td>
                    <td className={`px-4 py-3 text-right tabular-nums hidden sm:table-cell ${r.unanswered ? "text-orange font-semibold" : "text-ink-4"}`}>{r.unanswered}</td>
                    <td className="px-4 py-3 text-ink-2 hidden md:table-cell">{r.last ? timeAgo(r.last) : <span className="text-ink-4">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
