"use client";

import { useState } from "react";
import {
  Languages,
  LogOut,
  Menu,
  ReceiptText,
  SlidersHorizontal,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMemberLanguage } from "./MemberLanguageProvider";

const memberLinks = [
  { label: "Bot Config", href: "/member/home", icon: SlidersHorizontal },
  { label: "Order List", href: "/member/orders", icon: ReceiptText },
] as const;

const MemberHeader = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { language, setLanguage } = useMemberLanguage();
  const pathname = usePathname();
  const isOrdersPage = pathname === "/member/orders";

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await authClient.signOut();
      window.location.href = "/member/login";
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-400/15 bg-[#040814]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-200 items-center justify-between px-4 md:h-18 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/member/home" className="shrink-0 md:hidden">
            <Image
              src="/images/logo-small.png"
              alt="CuanHero"
              width={44}
              height={44}
              className="h-9 w-9 object-contain"
              priority
            />
          </Link>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
              CuanHero
            </p>
            <h1 className="mt-0.5 truncate text-base font-bold text-white md:text-lg">
              {isOrdersPage ? "My Orders" : "Member Dashboard"}
            </h1>
          </div>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <nav className="flex items-center gap-5" aria-label="Member navigation">
            {memberLinks.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-semibold transition ${
                    active
                      ? "text-cyan-300"
                      : "text-slate-300 hover:text-cyan-200"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <span className="h-6 w-px bg-cyan-400/15" />

          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as "en" | "id")}
          >
            <SelectTrigger
              aria-label="Member language"
              className="h-10 min-w-17 border-cyan-400/25 bg-cyan-500/8 px-2.5 text-cyan-100 hover:bg-cyan-500/15"
            >
              <Languages className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-semibold uppercase">{language}</span>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="id">ID</SelectItem>
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-red-200 transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open member menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/8 text-cyan-200 transition hover:bg-cyan-500/15 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Member Menu</SheetTitle>
              <SheetDescription>Manage your bot and orders.</SheetDescription>
            </SheetHeader>

            <nav className="space-y-2 px-4 py-5" aria-label="Mobile member navigation">
              {memberLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition ${
                        active
                          ? "bg-cyan-400/15 text-cyan-200"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-cyan-400/15 p-4">
              <div className="mb-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Languages className="h-4 w-4" />
                  Language
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["en", "id"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLanguage(value)}
                      className={`h-10 rounded-xl border text-xs font-bold uppercase transition ${
                        language === value
                          ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100"
                          : "border-white/10 text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Logout"}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default MemberHeader;
