"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import {
  Home,
  Building2,
  Users,
  LogOut,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  user: {
    id: string;
    name?: string | null;
    email: string;
  };
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/dashboard/guests", label: "Guests", icon: Users },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-[#0F2F61] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#1a3d75]">
        <span className="text-white font-bold text-2xl tracking-tight">
          Guestio
        </span>
        <p className="text-[#8ba3c7] text-xs mt-0.5">Digital guest guidebook</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group
                ${isActive
                  ? "bg-[#FF6700] text-white"
                  : "text-[#8ba3c7] hover:bg-[#1a3d75] hover:text-white"
                }
              `}
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
          <p className="text-white text-sm font-medium truncate">
            {user.name ?? "User"}
          </p>
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
    </aside>
  );
}
