import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserWorkspaceIds, getWorkspaceMemberUserIds, propertyAccessWhere } from "@/lib/workspace";
import { Building2, Eye, MessageCircle, ClipboardList, AlertTriangle, ArrowRight, CheckCircle2, Circle, Plus, MessageSquare } from "lucide-react";
import HotelOverview, { type HotelOverviewData } from "@/components/HotelOverview";
import { getRegistrationRecipients } from "@/lib/guest-registration";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Sarajevo" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** Start of today in Sarajevo (the server runs in UTC) */
function sarajevoMidnight() {
  const now = new Date();
  const [h, m, s] = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Europe/Sarajevo" })
    .format(now).split(":").map(Number);
  return new Date(now.getTime() - ((h % 24) * 3600 + m * 60 + s) * 1000 - now.getMilliseconds());
}

type SectionLite ={ type: string; content: unknown; isVisible: boolean; updatedAt: Date; _count: { translations: number } };

/** Gaps in an apartment guide a guest would notice */
function guideIssues(sections: SectionLite[]): string[] {
  const get = (type: string) => sections.find((s) => s.type === type);
  const c = (type: string) => ((get(type)?.content ?? {}) as Record<string, unknown>);
  const visible = (type: string) => !!get(type)?.isVisible;
  const issues: string[] = [];
  if (visible("WIFI") && (!c("WIFI").network || !c("WIFI").password)) issues.push("Wi-Fi details missing");
  if (visible("CHECKIN") && !c("CHECKIN").instructions) issues.push("no check-in instructions");
  if (visible("CONTACT") && !c("CONTACT").phone) issues.push("no contact phone");
  if (sections.every((s) => s._count.translations === 0)) issues.push("not translated (guests see English only)");
  return issues;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;
  const [wsIds, memberUserIds, account] = await Promise.all([
    getUserWorkspaceIds(userId),
    getWorkspaceMemberUserIds(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } }),
  ]);
  const accessWhere = propertyAccessWhere(userId, wsIds, memberUserIds);

  const properties = await prisma.property.findMany({
    where: accessWhere,
    select: {
      id: true, name: true, internalName: true, kind: true, previewViewCount: true, chatCount: true, reviewUrl: true, receptionEmail: true, workspaceId: true, userId: true,
      guests: { select: { viewCount: true } },
      sections: { select: { type: true, content: true, isVisible: true, updatedAt: true, _count: { select: { translations: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  // ── New account: onboarding checklist instead of empty numbers ──
  if (properties.length === 0) {
    const isHotel = account?.accountType === "HOTEL";
    const steps = [
      { done: false, title: isHotel ? "Create your hotel" : "Add your first apartment", text: "Name and address — the guide is created for you.", href: `/dashboard/properties/new?kind=${isHotel ? "hotel" : "apartment"}` },
      { done: false, title: "Fill in the guide", text: "Check-in, Wi-Fi, house rules, recommendations. It's translated automatically." },
      { done: false, title: isHotel ? "Add rooms and print the QR cards" : "Send the guest link", text: isHotel ? "Every room gets its own QR code for the door or desk." : "Paste it into your Airbnb / Booking automatic messages." },
    ];
    return (
      <div className="p-4 sm:p-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-[#262626]">Welcome, {firstName} 👋</h1>
        <p className="text-[#6B6B6B] mt-1 mb-6">Three steps and your guests have everything on their phone.</p>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-white border border-[#EDEDE9] rounded-xl p-4 flex gap-3">
              {s.done ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <Circle className="w-5 h-5 text-[#D5D5CF] shrink-0" />}
              <div className="flex-1">
                <p className="font-semibold text-[#262626]">{i + 1}. {s.title}</p>
                <p className="text-sm text-[#6B6B6B]">{s.text}</p>
                {s.href && (
                  <Link href={s.href} className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-white bg-[#FF6700] hover:bg-[#e05c00] px-4 py-2 rounded-lg">
                    <Plus className="w-4 h-4" /> {s.title}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const apartments = properties.filter((p) => p.kind !== "HOTEL");
  const hotels = properties.filter((p) => p.kind === "HOTEL");
  const now = Date.now();

  // ── Apartments ──
  const aptIds = apartments.map((p) => p.id);
  const [registrations7d, openTasks] = await Promise.all([
    aptIds.length ? prisma.guestRegistration.count({ where: { propertyId: { in: aptIds }, createdAt: { gte: new Date(now - 7 * DAY) } } }) : 0,
    wsIds.length ? prisma.task.count({ where: { workspaceId: { in: wsIds }, status: "IN_PROGRESS" } }) : 0,
  ]);
  const aptOpens = apartments.reduce((s, p) => s + p.previewViewCount + p.guests.reduce((g, l) => g + l.viewCount, 0), 0);
  const aptChats = apartments.reduce((s, p) => s + (p.chatCount ?? 0), 0);
  const attention = apartments
    .map((p) => ({ id: p.id, name: p.internalName || p.name, issues: guideIssues(p.sections) }))
    .filter((p) => p.issues.length > 0);
  const recent = apartments
    .map((p) => ({ id: p.id, name: p.name, internalName: p.internalName, at: Math.max(0, ...p.sections.map((s) => s.updatedAt.getTime())) }))
    .sort((a, b) => b.at - a.at)
    .slice(0, 4);

  // ── Hotels ──
  const hotelData: HotelOverviewData[] = await Promise.all(hotels.map(async (h) => {
    const since7 = new Date(now - 7 * DAY);
    const since30 = new Date(now - 30 * DAY);
    const startToday = sarajevoMidnight();
    const [counts, rooms, customRooms, opensToday, opens7d, open, orders30, announcements, defaultRecipients] = await Promise.all([
      prisma.guestRequest.groupBy({ by: ["status"], where: { propertyId: h.id, status: { in: ["NEW", "IN_PROGRESS"] } }, _count: true }),
      prisma.guestLink.count({ where: { propertyId: h.id, roomNumber: { not: null } } }),
      prisma.guestLink.count({ where: { propertyId: h.id, roomNumber: { not: null }, sectionOverrides: { some: {} } } }),
      prisma.guestLinkView.count({ where: { guestLink: { propertyId: h.id }, viewedAt: { gte: startToday } } }),
      prisma.guestLinkView.count({ where: { guestLink: { propertyId: h.id }, viewedAt: { gte: since7 } } }),
      prisma.guestRequest.findMany({ where: { propertyId: h.id, status: { in: ["NEW", "IN_PROGRESS"] } }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.guestRequest.findMany({ where: { propertyId: h.id, type: { in: ["ORDER", "BOOKING"] }, status: { not: "DECLINED" }, createdAt: { gte: since30 } }, select: { items: true, createdAt: true } }),
      prisma.announcement.findMany({ where: { propertyId: h.id, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, select: { id: true, message: true }, orderBy: { createdAt: "desc" } }),
      h.receptionEmail ? Promise.resolve([] as string[]) : getRegistrationRecipients(h),
    ]);
    type Item = { name: string; qty: number; price: number | null };
    const tally = new Map<string, number>();
    let ordered7d = 0;
    for (const o of orders30) {
      for (const i of (o.items as Item[] | null) ?? []) {
        tally.set(i.name, (tally.get(i.name) ?? 0) + i.qty);
        if (o.createdAt >= since7) ordered7d += (i.price ?? 0) * i.qty;
      }
    }
    return {
      id: h.id,
      name: h.name,
      newRequests: counts.find((c) => c.status === "NEW")?._count ?? 0,
      inProgress: counts.find((c) => c.status === "IN_PROGRESS")?._count ?? 0,
      rooms, customRooms, opensToday, opens7d,
      receptionEmail: h.receptionEmail, defaultRecipients,
      guideIssues: guideIssues(h.sections), hasReviewUrl: !!h.reviewUrl,
      ordered7d,
      openRequests: open.map((r) => ({
        id: r.id, roomNumber: r.roomNumber, type: r.type, status: r.status, createdAt: r.createdAt.toISOString(),
        summary: [((r.items as Item[] | null) ?? []).map((i) => `${i.qty}× ${i.name}`).join(", "), r.note ? `“${r.note}”` : ""].filter(Boolean).join(" · "),
      })),
      topExtras: [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
      announcements,
    };
  }));

  const tiles = [
    { icon: Building2, value: apartments.length, label: apartments.length === 1 ? "apartment" : "apartments", href: "/dashboard/apartments" },
    { icon: Eye, value: aptOpens.toLocaleString("de-DE"), label: "guide opens", sub: "all time", href: "/dashboard/analytics" },
    { icon: MessageCircle, value: aptChats.toLocaleString("de-DE"), label: "AI chat questions", sub: "answered for you", href: "/dashboard/analytics" },
    { icon: ClipboardList, value: registrations7d, label: "guest registrations", sub: "last 7 days", href: "/dashboard/registrations" },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#262626]">{greeting()}, {firstName} 👋</h1>
        <p className="text-[#6B6B6B] mt-1">Here&apos;s what&apos;s happening today.</p>
      </div>

      {hotelData.map((h) => <HotelOverview key={h.id} hotel={h} />)}

      {apartments.length > 0 && (
        <section>
          {hotels.length > 0 && <h2 className="text-lg font-semibold text-[#262626] mb-3">Apartments</h2>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {tiles.map(({ icon: Icon, value, label, sub, href }) => (
              <Link key={label} href={href} className="bg-white rounded-xl p-4 border border-[#EDEDE9] hover:border-[#0F2F61]/40 transition-colors">
                <Icon className="w-4 h-4 mb-2 text-[#0F2F61]" />
                <p className="text-2xl font-bold text-[#262626] leading-none">{value}</p>
                <p className="text-sm text-[#262626] mt-1">{label}</p>
                {sub && <p className="text-xs text-[#9B9B9B] mt-0.5">{sub}</p>}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#EDEDE9] min-w-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EE]">
                <p className="text-sm font-semibold text-[#262626] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Needs attention
                </p>
                {attention.length > 0 && <span className="text-xs text-[#9B9B9B]">{attention.length} of {apartments.length} guides</span>}
              </div>
              {attention.length === 0 && registrations7d === 0 && openTasks === 0 ? (
                <p className="px-4 py-6 text-sm text-[#9B9B9B] text-center">All guides look complete. Nice work!</p>
              ) : (
                <ul className="divide-y divide-[#F5F5F2]">
                  {registrations7d > 0 && (
                    <li><Link href="/dashboard/registrations" className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                      <ClipboardList className="w-4 h-4 text-[#FF6700] shrink-0" />
                      <span className="flex-1 text-sm text-[#262626]">{registrations7d} new guest registration{registrations7d === 1 ? "" : "s"} this week</span>
                      <ArrowRight className="w-4 h-4 text-[#BABAB5]" />
                    </Link></li>
                  )}
                  {openTasks > 0 && (
                    <li><Link href="/dashboard/team" className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                      <MessageSquare className="w-4 h-4 text-[#0F2F61] shrink-0" />
                      <span className="flex-1 text-sm text-[#262626]">{openTasks} open task{openTasks === 1 ? "" : "s"} in Team Channel</span>
                      <ArrowRight className="w-4 h-4 text-[#BABAB5]" />
                    </Link></li>
                  )}
                  {attention.slice(0, 6).map((p) => (
                    <li key={p.id}><Link href={`/dashboard/properties/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="flex-1 min-w-0 text-sm">
                        <span className="font-medium text-[#262626]">{p.name}</span>
                        <span className="text-[#6B6B6B]"> — {p.issues.join(", ")}</span>
                      </span>
                      <span className="text-xs font-semibold text-[#0F2F61] shrink-0">Fix →</span>
                    </Link></li>
                  ))}
                  {attention.length > 6 && <li className="px-4 py-2.5 text-xs text-[#9B9B9B]">+ {attention.length - 6} more — see Apartments</li>}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#EDEDE9]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0EE]">
                <p className="text-sm font-semibold text-[#262626]">Recently edited</p>
                <Link href="/dashboard/apartments" className="text-xs font-medium text-[#0F2F61] hover:underline">All apartments →</Link>
              </div>
              <ul className="divide-y divide-[#F5F5F2]">
                {recent.map((p) => (
                  <li key={p.id}><Link href={`/dashboard/properties/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAF8]">
                    <Building2 className="w-4 h-4 text-[#0F2F61] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-[#262626] truncate">{p.name}</span>
                      {p.internalName && <span className="block text-xs text-[#9B9B9B] truncate">{p.internalName}</span>}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#BABAB5]" />
                  </Link></li>
                ))}
              </ul>
              <div className="px-4 py-3 border-t border-[#F0F0EE]">
                <Link href="/dashboard/properties/new?kind=apartment" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FF6700] hover:text-[#e05c00]">
                  <Plus className="w-4 h-4" /> New apartment
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
