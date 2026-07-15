// app/Member/layout.tsx
import type { ReactNode } from "react";
import MemberSidebar from "../components/MemberSidebar";
import MemberHeader from "../components/MemberHeader";
import MemberMobileNav from "../components/MemberMobileNav";

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ch-member-bg text-foreground">
      <div className="flex min-h-screen">
        <main className="flex min-h-screen flex-1 flex-col lg:pl-0">
          {children}
        </main>
      </div>
    </div>
  );
}
