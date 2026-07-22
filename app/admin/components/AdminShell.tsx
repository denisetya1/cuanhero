"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Package,
  Server,
  ShieldAlert,
  Settings,
  ShoppingCart,
  Sun,
  Activity,
  Users,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAccessProvider } from "./AdminAccessContext";

type AdminShellProps = {
  children: ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
};

const menu = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Trading Accounts", href: "/admin/trading-accounts", icon: Activity },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Deployment Queue", href: "/admin/deployment-queue", icon: ListTodo },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Packages", href: "/admin/packages", icon: Package },
  { label: "EA Robot", href: "/admin/ea", icon: Bot },
  { label: "Server", href: "/admin/server", icon: Server },
  { label: "Health Reports", href: "/admin/health-reports", icon: ShieldAlert },
  { label: "Pages", href: "/admin/pages", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const queryClient = new QueryClient();
const ADMIN_THEME_KEY = "cuanhero-admin-theme";

type AdminTheme = "light" | "dark";

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name || email || "Admin";
  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export default function AdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [theme, setTheme] = useState<AdminTheme>("dark");
  const [themeReady, setThemeReady] = useState(false);

  // Radix dialog/popover menggunakan portal di luar AdminShell. Pasang class
  // pada root document agar seluruh portal admin ikut memakai theme admin.
  useEffect(() => {
    const savedTheme = window.localStorage.getItem(ADMIN_THEME_KEY);
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
    const frame = window.requestAnimationFrame(() => {
      setTheme(initialTheme);
      setThemeReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    const root = document.documentElement;
    const isDark = theme === "dark";

    root.classList.toggle("admin-dark", isDark);
    root.classList.toggle("admin-light", !isDark);
    root.classList.toggle("dark", isDark);
    window.localStorage.setItem(ADMIN_THEME_KEY, theme);

    return () => {
      root.classList.remove("admin-dark", "admin-light", "dark");
    };
  }, [theme, themeReady]);

  const userName = user.name || "Admin";
  const initials = getInitials(user.name, user.email);
  const roleLabel =
    user.role === "SUPER_ADMIN"
      ? "Super Admin"
      : user.role === "ADMIN"
        ? "Admin"
        : "Member";

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/admin/login";
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-20 items-center border-b border-slate-200 px-4 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link href="/admin" className="flex min-w-0 items-center gap-3">
          <Image
            src="/images/logo.png"
            alt="CuanHero"
            width={160}
            height={56}
            className={collapsed ? "h-9 w-9 object-contain" : "h-auto w-36"}
            priority
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                Console
              </p>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="hidden rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 lg:block"
            aria-label="Minimize sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {!collapsed && (
          <p className="mb-3 px-3 text-xs font-semibold uppercase text-slate-400">
            Menu
          </p>
        )}

        <div className="space-y-1">
          {menu.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-xl px-3 py-3 text-sm font-medium transition ${
                  collapsed ? "justify-center" : "gap-3"
                } ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={`flex w-full items-center rounded-xl px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <QueryClientProvider client={queryClient}>
    <AdminAccessProvider role={user.role}>
    <div
      className={`${theme === "dark" ? "admin-dark dark" : "admin-light"} min-h-screen bg-slate-50 text-slate-950`}
    >
      <aside
        className={`fixed left-0 top-0 z-30 hidden h-screen border-r border-slate-200 bg-white transition-all duration-200 lg:block ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        {sidebar}
      </aside>

      <div
        className={`min-h-screen transition-all duration-200 ${
          collapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 md:h-20 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {collapsed && (
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm lg:inline-flex"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              <div>
                <h2 className="text-lg font-bold text-gray-900 md:text-xl">
                  Admin Dashboard
                </h2>
                <p className="hidden text-xs text-gray-500 md:block">
                  Manage CuanHero operations from one panel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setTheme((current) =>
                    current === "dark" ? "light" : "dark",
                  )
                }
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-gray-700 shadow-sm transition hover:bg-slate-50"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <button
                type="button"
                className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-gray-700 shadow-sm"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  0
                </span>
              </button>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                      {initials}
                    </div>
                    <div className="hidden md:block">
                      <p className="text-sm font-semibold text-gray-900">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-500">{roleLabel}</p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="z-50 w-64 rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl"
                >
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {userName}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {user.email || "-"}
                    </p>
                    <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                      {roleLabel}
                    </span>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity lg:hidden ${
          drawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebar}
      </aside>
    </div>
    </AdminAccessProvider>
    </QueryClientProvider>
  );
}
