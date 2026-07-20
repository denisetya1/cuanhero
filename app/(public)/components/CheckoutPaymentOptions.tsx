"use client";

import { CreditCard, Gift, Loader2, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CheckoutPaymentOptionsProps = {
  expertAdvisorId: number;
  packageId: number;
  tradingAccountId?: number;
  isFree?: boolean;
  defaultPhone?: string;
};

export default function CheckoutPaymentOptions({
  expertAdvisorId,
  packageId,
  tradingAccountId,
  isFree = false,
  defaultPhone = "",
}: CheckoutPaymentOptionsProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const startPayment = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payments/ipaymu/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertAdvisorId,
          packageId,
          tradingAccountId,
          paymentMethod: isFree ? "free" : "qris",
          phone,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        data?: { statusUrl?: string };
      };

      if (!response.ok || !result.data?.statusUrl) {
        throw new Error(result.message || "Gagal membuat pembayaran iPaymu.");
      }

      router.push(result.data.statusUrl);
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Gagal membuat pembayaran iPaymu.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
          {isFree ? <Gift className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {isFree ? "Free Activation" : "Payment Method"}
          </p>
          <h2 className="font-bold text-white">
            {isFree ? "Aktifkan Free Trial" : "Pembayaran aman via iPaymu"}
          </h2>
        </div>
      </div>

      {isFree ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-300/40 bg-emerald-400/10 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
            <Gift className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">
              Tidak perlu pembayaran
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              Order langsung aktif dan Anda dapat melanjutkan setup trading account.
            </span>
          </span>
        </div>
      ) : (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-300 bg-cyan-400/10 p-4 ring-1 ring-cyan-300/30">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
            <QrCode className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">QRIS</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              Scan dengan aplikasi mobile banking atau e-wallet.
            </span>
          </span>
        </div>
      )}

      {!isFree ? <div className="mt-5">
        <label className="text-xs font-semibold text-slate-300" htmlFor="payment-phone">
          Nomor WhatsApp / Telepon
        </label>
        <input
          id="payment-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Contoh: 628123456789"
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          QR code pembayaran akan ditampilkan langsung di CuanHero.
        </p>
      </div> : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={startPayment}
        disabled={isLoading || (!isFree && !phone.trim())}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isLoading
          ? isFree
            ? "Mengaktifkan..."
            : "Membuat Pembayaran..."
          : isFree
            ? "Aktifkan Free Trial"
            : "Buat Pembayaran"}
      </button>
    </div>
  );
}
