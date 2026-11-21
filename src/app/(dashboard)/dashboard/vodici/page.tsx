import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";
import { editorHref } from "@/lib/prospect-owner";

export const dynamic = "force-dynamic";

/** Admin: every open ready-made guide (outreach follow-ups + site requests), newest first. */
export default async function ProspectGuidesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) redirect("/dashboard");
  const rows = await prisma.property.findMany({
    where: { prospectToken: { not: null }, prospectClaimedAt: null, prospectExpiresAt: { gt: new Date() } },
    select: { id: true, name: true, kind: true, prospectToken: true, prospectEmail: true, prospectViews: true, internalName: true, createdAt: true, coverImage: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const fmt = (d: Date) => d.toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-ink mb-1">Pripremljeni vodiči</h1>
      <p className="text-sm text-ink-2 mb-6">
        Vodiči koje je napravio outreach agent (za follow-up) ili forma sa sajta. Otvori vodič da ga pregledaš i dopuniš.
        Izmjene se odmah vide na linku koji je poslan ili će biti poslan.
        {" "}<Link href="/dashboard/guide-requests" className="underline">Zahtjevi sa sajta →</Link>
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-2 italic">Trenutno nema otvorenih vodiča.</p>
      ) : (
        <ul className="divide-y divide-line border border-line rounded-xl bg-white">
          {rows.map((r) => (
            <li key={r.prospectToken}>
              <div className="flex items-center gap-3 p-3 hover:bg-canvas">
              <Link href={`/dashboard/vodici/${r.prospectToken}`} className="flex items-center gap-3 min-w-0 flex-1">
                {r.coverImage
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover flex-none" />
                  : <span className="w-12 h-12 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-semibold flex items-center justify-center flex-none">bez slike</span>}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink truncate">{r.name}{r.kind === "HOTEL" ? " · hotel" : ""}</span>
                  <span className="block text-xs text-ink-2 truncate">
                    {r.internalName?.startsWith("Sa sajta") ? "Sajt" : "Outreach"} · {r.prospectEmail} · {r.prospectViews} otvaranja
                  </span>
                </span>
                <span className="text-xs text-ink-2 whitespace-nowrap hidden sm:inline">{fmt(r.createdAt)}</span>
              </Link>
              <Link href={editorHref(r)} className="text-xs font-semibold text-white bg-navy px-3 py-2 rounded-lg whitespace-nowrap">Uredi</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
