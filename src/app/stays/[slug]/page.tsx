import { notFound } from "next/navigation";
import { getStay } from "@/lib/stays";
import { STAY_PHOTOS } from "@/lib/stays-photos";
import BookingWidget from "./BookingWidget";
import Gallery from "./Gallery";
import MobileBookCta from "./MobileBookCta";

export default async function StayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stay = getStay(slug);
  if (!stay) notFound();
  const photos = STAY_PHOTOS[stay.slug] ?? [];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 lg:pb-0">
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <section>
          {photos.length ? (
            <Gallery photos={photos} name={stay.name} />
          ) : (
            <div className="h-72 rounded-3xl bg-[#0C4A47] sm:h-96" />
          )}
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
            {stay.name}
          </h1>
          <p className="mt-2 text-xl text-[#E23A2E]" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic" }}>{stay.tagline}</p>
          <p className="mt-4 flex flex-wrap gap-x-2 text-sm font-semibold text-[#0C4A47]">
            {stay.facts.map((f, i) => (
              <span key={f}>{i > 0 && <span className="mr-2 text-[#F6A96B]">●</span>}{f}</span>
            ))}
          </p>
          <div className="mt-6 space-y-3 text-lg leading-relaxed text-[#3A4A48]">
            {stay.description.map((p) => <p key={p}>{p}</p>)}
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {stay.highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 font-medium shadow-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#F6A96B]" />{h}
              </li>
            ))}
          </ul>

          <h2 className="mt-12 text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>What this place offers</h2>
          <div className="mt-5 grid gap-8 sm:grid-cols-3">
            {stay.amenities.map((g) => (
              <div key={g.title}>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#E23A2E]">{g.title}</h3>
                <ul className="mt-3 space-y-2 text-[#3A4A48]">
                  {g.items.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <h2 className="mt-12 text-2xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>Good to know</h2>
          <ul className="mt-4 space-y-2 text-[#3A4A48]">
            <li>Free cancellation up to {stay.freeCancellationDays} days before arrival.</li>
            <li>Prices are per night, in euros.</li>
            {stay.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
        <div id="booking" className="scroll-mt-4"><BookingWidget slug={stay.slug} maxGuests={stay.maxGuests} freeCancellationDays={stay.freeCancellationDays} /></div>
      </div>
      <MobileBookCta />
    </main>
  );
}
