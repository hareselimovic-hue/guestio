import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/features";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  NEW: ["Novo", "bg-gray-100 text-gray-700"],
  NEEDS_BROWSER: ["Čita se (browser)", "bg-blue-50 text-blue-700"],
  READY: ["Čeka odobrenje", "bg-orange/10 text-orange"],
  SENT: ["Poslano", "bg-green-50 text-green-700"],
  FAILED: ["Nije uspjelo", "bg-red-50 text-red-700"],
};

/** Admin: "Vodič iz linka" requests from smartstay.ba. */
export default async function GuideRequestsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.email !== ADMIN_EMAIL) redirect("/dashboard");
  const rows = await prisma.guideRequest.findMany({ where: { purpose: "PROSPECT" }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-ink mb-1">Vodiči iz linka</h1>
      <p className="text-sm text-ink-2 mb-6">Posjetioci sa smartstay.ba koji su ostavili link oglasa. Vodič im ide tek kad ga odobriš.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-2 italic">Još nema zahtjeva.</p>
      ) : (
        <ul className="divide-y divide-line border border-line rounded-xl bg-white">
          {rows.map((r) => {
            const [label, cls] = STATUS[r.status] ?? [r.status, "bg-gray-100"];
            return (
              <li key={r.id}>
                <Link href={`/dashboard/guide-requests/${r.id}`} className="flex items-center gap-3 p-4 hover:bg-canvas">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-md whitespace-nowrap ${cls}`}>{label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{r.email}</span>
                    <span className="block text-xs text-ink-2 truncate">{r.platform} · {r.url}</span>
                  </span>
                  <span className="text-xs text-ink-2 whitespace-nowrap">
                    {r.createdAt.toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
