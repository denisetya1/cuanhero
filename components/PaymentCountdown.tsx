"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type PaymentCountdownProps = {
  expiresAt: string;
  compact?: boolean;
};

const formatRemainingTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

export default function PaymentCountdown({
  expiresAt,
  compact = false,
}: PaymentCountdownProps) {
  const expirationTime = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(expirationTime)) return;

    const updateRemainingTime = () => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((expirationTime - Date.now()) / 1_000)),
      );
    };

    const initialTimer = window.setTimeout(updateRemainingTime, 0);
    const interval = window.setInterval(updateRemainingTime, 1_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [expirationTime]);

  if (!Number.isFinite(expirationTime)) return null;

  const expired = remainingSeconds === 0;
  const time =
    remainingSeconds === null ? "--:--:--" : formatRemainingTime(remainingSeconds);

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border font-bold ${
        expired
          ? "border-red-400/30 bg-red-500/10 text-red-300"
          : "border-amber-400/30 bg-amber-500/10 text-amber-300"
      } ${compact ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-sm"}`}
    >
      <Clock3 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {expired ? "Expired" : `Expires in ${time}`}
    </div>
  );
}
