import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Building2, Users, Plus, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  const [properties, totalGuests] = await Promise.all([
    prisma.property.findMany({
      where: { userId: session!.user.id },
      include: { _count: { select: { guests: true, sections: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.guestLink.count({
      where: { property: { userId: session!.user.id } },
    }),
  ]);

  const firstName = session!.user.name?.split(" ")[0] ?? "tu";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#262626]">
          Dobrodošli, {firstName} 👋
        </h1>
        <p className="text-[#6B6B6B] mt-1">
          Upravljajte vašim nekretninama i gostima
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-[#EDEDE9]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-[#0F2F61]/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0F2F61]" />
            </div>
            <span className="text-sm text-[#6B6B6B] font-medium">Nekretnine</span>
          </div>
          <p className="text-3xl font-bold text-[#262626]">{properties.length}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#EDEDE9]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-[#FF6700]/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-[#FF6700]" />
            </div>
            <span className="text-sm text-[#6B6B6B] font-medium">Gost linkova</span>
          </div>
          <p className="text-3xl font-bold text-[#262626]">{totalGuests}</p>
        </div>
      </div>

      {/* Properties list */}
      <div className="bg-white rounded-xl border border-[#EDEDE9]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDEDE9]">
          <h2 className="font-semibold text-[#262626]">Vaše nekretnine</h2>
          <Link
            href="/dashboard/properties/new"
            className="flex items-center gap-1.5 text-sm font-medium text-[#FF6700] hover:text-[#e05c00] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova nekretnina
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 bg-[#EDEDE9] rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-[#6B6B6B]" />
            </div>
            <p className="text-[#262626] font-medium mb-1">Nema nekretnina</p>
            <p className="text-[#6B6B6B] text-sm mb-4">
              Kreirajte prvu nekretninu i počnite dijeliti vodiče s gostima
            </p>
            <Link
              href="/dashboard/properties/new"
              className="inline-flex items-center gap-2 bg-[#0F2F61] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a2347] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Kreiraj prvu nekretninu
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[#EDEDE9]">
            {properties.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/properties/${p.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[#F7F7F5] transition-colors group"
                >
                  <div>
                    <p className="font-medium text-[#262626] group-hover:text-[#0F2F61] transition-colors">
                      {p.name}
                    </p>
                    <p className="text-xs text-[#6B6B6B] mt-0.5">
                      {p._count.sections} sekcija · {p._count.guests} gostiju
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B6B6B] group-hover:text-[#0F2F61] transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
