import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Instrument_Serif } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["700", "800"] });
const serif = Instrument_Serif({ subsets: ["latin"], variable: "--font-serif", weight: "400", style: "italic" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });

// Stranica je namjerno isključena iz Googlea (da ne smeta SEO-u sarajevopropertymanagement.ba).
export const metadata: Metadata = {
  title: "Sarajevo Stays — book direct",
  description: "Book our apartments in Sarajevo directly.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function StaysLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${display.variable} ${serif.variable} ${body.variable} min-h-screen bg-[#FAF4E8] text-[#10201F]`}
      style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
    >
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <a href="/stays" aria-label="Sarajevo Stays">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stays/logo.png" alt="Sarajevo Stays" className="h-10 w-auto" />
        </a>
        <a href="mailto:info@sarajevopropertymanagement.ba" className="text-sm font-medium text-[#0C4A47] hover:underline">
          Questions? Write to us
        </a>
      </header>
      {children}
      <footer className="mx-auto mt-20 max-w-6xl px-5 pb-10 text-sm text-[#3A4A48]">
        <div className="border-t border-[#0C4A47]/15 pt-6">
          Sarajevo Stays · Sarajevo, Bosnia and Herzegovina · info@sarajevopropertymanagement.ba · +387 61 684 110
        </div>
      </footer>
    </div>
  );
}
