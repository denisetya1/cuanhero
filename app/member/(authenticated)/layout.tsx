"use client";

import type { ReactNode } from "react";
import MemberHeader from "../components/MemberHeader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen">
          <main className="flex min-h-screen flex-1 flex-col lg:pl-0">
            <MemberHeader />

            <div className="m-auto w-full max-w-200 flex-1 px-4 py-5 pb-24 md:px-6 lg:pb-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
