"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Home, LogOut, ChevronRight, Settings, ShieldCheck, CreditCard, BarChart2 } from "lucide-react";

interface SidebarProps {
  user: { id: string; name?: string | null; email: string };
  workspaceName: string | null;
}

const ADMIN_EMAIL = "hareselimovic@gmail.com";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
];

export default function Sidebar({ user, workspaceName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const NavContent = () => (
    <>
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {[...navItems, ...(user.email === ADMIN_EMAIL ? [{ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck }] : [])].map(({ href, label, icon: Icon }) => {
          const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? "bg-[#FF6700] text-white" : "text-[#8ba3c7] hover:bg-[#1a3d75] hover:text-white"}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-[#1a3d75]">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user.name ?? "User"}</p>
          {workspaceName && <p className="text-[#FF6700] text-xs truncate">{workspaceName}</p>}
          <p className="text-[#8ba3c7] text-xs truncate">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ba3c7] hover:bg-[#1a3d75] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );

  return (
    /* Desktop sidebar only — mobile uses BottomNav */
    <aside className="hidden md:flex w-64 bg-[#0F2F61] flex-col h-full shrink-0">
      <div className="px-6 py-6 border-b border-[#1a3d75]">
        <span className="text-white font-bold text-2xl tracking-tight">SmartStay</span>
        <p className="text-[#8ba3c7] text-xs mt-0.5">{workspaceName ?? "Digital guest guidebook"}</p>
      </div>
      <NavContent />
    </aside>
  );
}
