"use client";

import { useState } from "react";
import { Languages, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useMemberLanguage } from "./MemberLanguageProvider";

const MemberHeader = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { language, setLanguage } = useMemberLanguage();

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
              Member Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as "en" | "id")}
          >
            <SelectTrigger
              aria-label="Member language"
              className="h-10 min-w-17 border-cyan-400/25 bg-cyan-500/8 px-2.5 text-cyan-100 hover:bg-cyan-500/15"
            >
              <Languages className="h-4 w-4 text-cyan-300" />
              <span className="text-xs font-semibold uppercase">
                {language}
              </span>
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
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 text-sm font-semibold text-red-200 transition-colors hover:border-red-300/40 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isLoggingOut ? "Signing out..." : "Logout"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default MemberHeader;
