"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const MemberHeader = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
            CuanHero
          </p>
          <h1 className="mt-0.5 text-base font-bold text-white md:text-lg">
            Member Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 text-sm font-semibold text-red-200 transition-colors hover:border-red-300/40 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          <span>{isLoggingOut ? "Signing out..." : "Logout"}</span>
        </button>
      </div>
    </header>
  );
};

export default MemberHeader;
