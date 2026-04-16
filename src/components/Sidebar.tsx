"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Home, LogOut, ChevronRight, Menu, X, Settings, ShieldCheck, CreditCard } from "lucide-react";

interface SidebarProps {
  user: { id: string; name?: string | null; email: string };
}

const ADMIN_EMAIL = "hareselimovic@gmail.com";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/subscription", label: "Pretplata", icon: CreditCard },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((d) => { if (d?.workspace?.name) setWorkspaceName(d.workspace.name); });
  }, []);

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
              onClick={() => setOpen(false)}
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
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 bg-[#0F2F61] flex-col h-full shrink-0">
        <div className="px-6 py-6 border-b border-[#1a3d75]">
          <span className="text-white font-bold text-2xl tracking-tight">SmartStay</span>
          <p className="text-[#8ba3c7] text-xs mt-0.5">{workspaceName ?? "Digital guest guidebook"}</p>
        </div>
        <NavContent />
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0F2F61] flex items-center justify-between px-4 py-3 shadow-md">
        <div>
          <span className="text-white font-bold text-xl tracking-tight">SmartStay</span>
          {workspaceName && <p className="text-[#8ba3c7] text-xs leading-tight">{workspaceName}</p>}
        </div>
        <button onClick={() => setOpen(true)} className="text-white p-1">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* ── Mobile overlay menu ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <aside className="relative w-72 max-w-[85vw] bg-[#0F2F61] flex flex-col h-full shadow-xl">
            <div className="px-6 py-5 border-b border-[#1a3d75] flex items-center justify-between">
              <span className="text-white font-bold text-xl tracking-tight">SmartStay</span>
              <button onClick={() => setOpen(false)} className="text-[#8ba3c7] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
