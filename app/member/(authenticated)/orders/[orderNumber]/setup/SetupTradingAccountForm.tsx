"use client";

import { Eye, EyeOff, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SetupTradingAccountForm({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [accountServer, setAccountServer] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/member/orders/${encodeURIComponent(orderNumber)}/setup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId, password, accountServer }),
        },
      );
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "Failed to submit setup request.");
      }

      router.push("/member/orders");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to submit setup request.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-7 space-y-5">
      <div>
        <label htmlFor="mt5-account-id" className="text-sm font-semibold text-slate-200">
          MT5 Account ID
        </label>
        <input
          id="mt5-account-id"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Example: 160090611"
          required
          className="mt-2 h-12 w-full rounded-xl border border-cyan-400/20 bg-[#020611] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
        />
      </div>

      <div>
        <label htmlFor="mt5-password" className="text-sm font-semibold text-slate-200">
          MT5 Password
        </label>
        <div className="relative mt-2">
          <input
            id="mt5-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            placeholder="Trading account password"
            required
            className="h-12 w-full rounded-xl border border-cyan-400/20 bg-[#020611] px-4 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-cyan-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="mt5-server" className="text-sm font-semibold text-slate-200">
          Broker Server
        </label>
        <input
          id="mt5-server"
          value={accountServer}
          onChange={(event) => setAccountServer(event.target.value)}
          autoComplete="off"
          placeholder="Example: Exness-MT5Real20"
          required
          className="mt-2 h-12 w-full rounded-xl border border-cyan-400/20 bg-[#020611] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Use the exact server name shown in your MetaTrader 5 account.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !accountId || !password || !accountServer.trim()}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {isSubmitting ? "Submitting..." : "Submit Setup Request"}
      </button>
    </form>
  );
}
