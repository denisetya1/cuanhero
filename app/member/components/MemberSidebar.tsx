"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Package,
  ReceiptText,
  CreditCard,
  Settings,
  Bot,
  Server,
} from "lucide-react";

const menu = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Packages", href: "/admin/packages", icon: Package },
  { label: "Transactions", href: "/admin/transactions", icon: ReceiptText },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Robot EA", href: "/admin/ea", icon: Bot },
  { label: "Server", href: "/admin/server", icon: Server },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const MemberSidebar = () => {
  return (
    <aside className="sticky top-0 hidden h-screen w-70 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-20 items-center gap-3 px-6">
        <img src="/logo.svg" alt="CuanHero" className="h-10" />
        <div>
          <h1 className="text-xl font-bold">
            Cuan<span className="text-blue-600">Hero</span>
          </h1>
          <p className="text-xs text-slate-500">Admin Panel</p>
        </div>
      </div>

      <nav className="px-4">
        <p className="mb-3 px-3 text-xs font-semibold uppercase text-slate-400">
          Menu
        </p>

        <div className="space-y-1">
          {menu.map((item, index) => {
            const Icon = item.icon;
            const active = index === 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
};

export default MemberSidebar;
