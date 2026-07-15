"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  ReceiptText,
  Settings,
} from "lucide-react";

const mobileMenu = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "User", href: "/admin/users", icon: Users },
  { label: "Packages", href: "/admin/packages", icon: Package },
  { label: "Transactions", href: "/admin/transactions", icon: ReceiptText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const MemberMobileNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {mobileMenu.map((item, index) => {
          const Icon = item.icon;
          const active = index === 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-3 text-xs ${
                active ? "text-blue-600" : "text-slate-500"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MemberMobileNav;
