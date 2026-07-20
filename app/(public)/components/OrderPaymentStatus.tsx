"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderPaymentStatus({ status }: { status: string }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = window.setInterval(() => router.refresh(), 3_000);
    return () => window.clearInterval(timer);
  }, [router, status]);

  const refresh = () => {
    setIsRefreshing(true);
    router.refresh();
    window.setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <button
      type="button"
      onClick={refresh}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/35 px-5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
      Refresh Status
    </button>
  );
}

