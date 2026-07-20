import { auth } from "@/lib/auth";
import CopyTextButton from "@/components/CopyTextButton";
import prisma from "@/lib/prisma";
import PaymentCountdown from "@/components/PaymentCountdown";
import {
  CheckCircle2,
  Clock3,
  PackageOpen,
  Plus,
  ReceiptText,
  Settings2,
  XCircle,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const statusConfig = {
  PAID: {
    label: "Paid",
    icon: CheckCircle2,
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  },
  PENDING: {
    label: "Pending",
    icon: Clock3,
    className: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  },
  FAILED: {
    label: "Failed",
    icon: XCircle,
    className: "border-red-400/25 bg-red-400/10 text-red-300",
  },
  EXPIRED: {
    label: "Expired",
    icon: XCircle,
    className: "border-red-400/25 bg-red-400/10 text-red-300",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    className: "border-slate-400/25 bg-slate-400/10 text-slate-300",
  },
} as const;

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export default async function MemberOrdersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/member/login?ref=%2Fmember%2Forders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      orderNumber: true,
      amount: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      tradingAccountId: true,
      tradingAccount: { select: { accountId: true } },
      setupRequest: { select: { status: true } },
      expertAdvisor: { select: { name: true } },
      package: { select: { name: true, recurringType: true } },
    },
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
            Member Area
          </p>
          <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">
            My Orders
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Track your payments and CuanHero activation status.
          </p>
        </div>
        <Link
          href="/order"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
        >
          <Plus className="h-4 w-4" />
          New Order
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-[#050b18]/80 px-6 py-14 text-center shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <PackageOpen className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-white">No orders yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            Choose an Expert Advisor and package to create your first order.
          </p>
          <Link
            href="/order"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            <Plus className="h-4 w-4" />
            Create Order
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const config =
              statusConfig[order.status as keyof typeof statusConfig] ||
              statusConfig.PENDING;
            const StatusIcon = config.icon;

            return (
              <article
                key={order.orderNumber}
                className="rounded-2xl border border-cyan-400/15 bg-[#050b18]/80 p-5 shadow-[0_14px_45px_rgba(0,0,0,0.22)] md:p-6"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {config.label}
                  </span>
                  {order.status === "PENDING" && order.expiresAt ? (
                    <PaymentCountdown
                      expiresAt={order.expiresAt.toISOString()}
                      compact
                    />
                  ) : null}
                </div>

                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="mt-4 flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                        <ReceiptText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-white">
                          {order.expertAdvisor.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-400">
                          {order.package.name} · {order.package.recurringType}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-slate-500">Order ID</span>
                          <code className="font-mono text-xs text-slate-300">
                            {order.orderNumber}
                          </code>
                          <CopyTextButton value={order.orderNumber} />
                        </div>
                        {order.tradingAccount ? (
                          <p className="mt-2 text-xs text-emerald-300">
                            Upgrade account: {order.tradingAccount.accountId}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-white/10 pt-4 md:min-w-64 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Order date</p>
                        <p className="mt-1 text-xs text-slate-300">
                          {dateFormatter.format(order.createdAt)} WIB
                        </p>
                      </div>
                      <p className="font-black text-white">
                        {currencyFormatter.format(Number(order.amount))}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {order.status === "PAID" ? (
                        order.tradingAccountId ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 text-xs font-bold text-emerald-300"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Upgrade Applied
                          </button>
                        ) : order.setupRequest ? (
                          <button
                            type="button"
                            disabled
                            className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-700/60 px-4 text-xs font-bold text-slate-400"
                          >
                            <Settings2 className="h-4 w-4" />
                            {order.setupRequest.status === "COMPLETED"
                              ? "Trading Account Setup"
                              : "Setup Requested"}
                          </button>
                        ) : (
                          <Link
                            href={`/member/orders/${encodeURIComponent(order.orderNumber)}/setup`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
                          >
                            <Settings2 className="h-4 w-4" />
                            Setup Trading Account
                          </Link>
                        )
                      ) : null}
                      <Link
                        href={`/order/payment?order=${encodeURIComponent(order.orderNumber)}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-300/35 px-4 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/10"
                      >
                        View Order
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
