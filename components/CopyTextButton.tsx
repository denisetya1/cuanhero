"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyTextButtonProps = {
  value: string;
  label?: string;
};

export default function CopyTextButton({
  value,
  label = "Copy",
}: CopyTextButtonProps) {
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
      className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-300/30 px-2.5 text-[11px] font-bold text-cyan-200 transition hover:bg-cyan-400/10"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
