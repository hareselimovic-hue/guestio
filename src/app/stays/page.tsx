import Link from "next/link";
import { STAYS } from "@/lib/stays";
import { STAY_PHOTOS } from "@/lib/stays-photos";

export default function StaysIndex() {
  return (
    <main className="mx-auto max-w-6xl px-5">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl" style={{ fontFamily: "var(--font-display)" }}>
        Stay with us in <em className="font-normal text-[#E23A2E]" style={{ fontFamily: "var(--font-serif)" }}>Sarajevo</em>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-[#3A4A48]">Book direct. Best price, instant confirmation, free cancellation.</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {STAYS.map((s) => {
          const cover = STAY_PHOTOS[s.slug]?.[0];
          return (
            <Link key={s.slug} href={`/stays/${s.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#0C4A47]">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.src} alt={s.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                )}
              </div>
              <h2 className="mt-3 text-xl font-bold group-hover:underline" style={{ fontFamily: "var(--font-display)" }}>{s.name}</h2>
              <p className="text-[#3A4A48]">{s.tagline}</p>
              <p className="mt-1 text-sm font-semibold text-[#0C4A47]">{s.facts.join(" · ")}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
