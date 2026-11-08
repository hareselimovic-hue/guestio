"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, BarChart2, Settings, MoreHorizontal, CreditCard, ShieldCheck, X, HelpCircle, MessageSquare, ClipboardList, Hotel, Building2 } from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface BottomNavProps {
  user: { id: string; name?: string | null; email: string };
  showHotel?: boolean;
  showApartments?: boolean;
}

const ADMIN_EMAIL = "hareselimovic@gmail.com";

const mainItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/team", label: "Team", icon: MessageSquare },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function BottomNav({ user, showHotel = false, showApartments = true }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  // Hidden while typing: on phones the keyboard is open and the bar would sit on top of the field
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
    const onIn = (e: FocusEvent) => { if (isField(e.target)) setTyping(true); };
    const onOut = () => setTimeout(() => setTyping(isField(document.activeElement)), 0);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => { document.removeEventListener("focusin", onIn); document.removeEventListener("focusout", onOut); };
  }, []);

  const isAdmin = user.email === ADMIN_EMAIL;
  // Second slot: Hotel for hotels, otherwise Apartments; Analytics (and Apartments, if both) live in "More"
  const barItems = [
    mainItems[0],
    showHotel ? { href: "/dashboard/hotel", label: "Hotel", icon: Hotel } : { href: "/dashboard/apartments", label: "Apartments", icon: Building2 },
    ...mainItems.slice(2),
  ];

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F2F61] border-t border-[#1a3d75] items-stretch h-16 ${typing ? "hidden" : "flex"}`}>
        {barItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors
                ${isActive ? "text-[#FF6700]" : "text-[#8ba3c7]"}`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setShowMore(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors
            ${showMore ? "text-[#FF6700]" : "text-[#8ba3c7]"}`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* More drawer */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMore(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-[#EDEDE9] rounded-full" />
            </div>

            {/* User info */}
            <div className="px-5 py-3 border-b border-[#EDEDE9]">
              <p className="font-semibold text-[#262626] text-sm">{user.name ?? "User"}</p>
              <p className="text-[#6B6B6B] text-xs">{user.email}</p>
            </div>

            {/* Extra nav items */}
            <div className="px-3 py-2">
              {showHotel && showApartments && (
                <Link
                  href="/dashboard/apartments"
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#262626] hover:bg-[#F7F7F5] transition-colors"
                >
                  <Building2 className="w-5 h-5 text-[#6B6B6B]" />
                  Apartments
                </Link>
              )}

              <Link
                href="/dashboard/analytics"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#262626] hover:bg-[#F7F7F5] transition-colors"
              >
                <BarChart2 className="w-5 h-5 text-[#6B6B6B]" />
                Analytics
              </Link>

              <Link
                href="/dashboard/registrations"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#262626] hover:bg-[#F7F7F5] transition-colors"
              >
                <ClipboardList className="w-5 h-5 text-[#6B6B6B]" />
                Guest registrations
              </Link>

              <Link
                href="/dashboard/subscription"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#262626] hover:bg-[#F7F7F5] transition-colors"
              >
                <CreditCard className="w-5 h-5 text-[#6B6B6B]" />
                Subscription
              </Link>

              <Link
                href="/help"
                target="_blank"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#262626] hover:bg-[#F7F7F5] transition-colors"
              >
                <HelpCircle className="w-5 h-5 text-[#6B6B6B]" />
                Help
              </Link>

              {isAdmin && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#262626] hover:bg-[#F7F7F5] transition-colors"
                >
                  <ShieldCheck className="w-5 h-5 text-[#6B6B6B]" />
                  Admin
                </Link>
              )}
            </div>

            {/* Sign out */}
            <div className="px-3 pb-3 border-t border-[#EDEDE9] pt-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="w-5 h-5" />
                Sign out
              </button>
            </div>

            {/* Safe area spacer */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </div>
      )}
    </>
  );
}
