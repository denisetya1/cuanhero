"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CopyPaymentNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-300/35 px-4 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/10"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Tersalin" : "Salin Nomor"}
    </button>
  );
}
