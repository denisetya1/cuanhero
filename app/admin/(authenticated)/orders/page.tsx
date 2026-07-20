import CopyTextButton from "@/components/CopyTextButton";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  PackageCheck,
  Search,
  ShoppingCart,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const ORDER_STATUSES = [
  "ALL",
  "PENDING",
  "PAID",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;

type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

const statusConfig = {
  PAID: {
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  PENDING: {
    icon: Clock3,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  FAILED: {
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  EXPIRED: {
    icon: XCircle,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  CANCELLED: {
    icon: XCircle,
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
} as const;

const formatMoney = (amount: unknown, currency: string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: currency || "IDR",
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(Number(amount || 0));

const formatDate = (value?: Date | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  }).format(value);
};

const normalizeStatus = (value?: string): OrderStatusFilter => {
  const normalized = value?.toUpperCase() as OrderStatusFilter;
  return ORDER_STATUSES.includes(normalized) ? normalized : "ALL";
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const selectedStatus = normalizeStatus(params.status);
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);

  const where: Prisma.OrderWhereInput = {
    ...(selectedStatus !== "ALL" ? { status: selectedStatus } : {}),
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query } },
            { user: { name: { contains: query } } },
            { user: { email: { contains: query } } },
            { expertAdvisor: { name: { contains: query } } },
            { package: { name: { contains: query } } },
            { tradingAccount: { accountId: { contains: query } } },
            { setupRequest: { accountId: { contains: query } } },
          ],
        }
      : {}),
  };

  const [totalOrders, statusCounts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalOrders / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      orderNumber: true,
      baseAmount: true,
      discountPercent: true,
      discountAmount: true,
      amount: true,
      currency: true,
      type: true,
      status: true,
      paymentMethod: true,
      paymentChannel: true,
      providerTransactionId: true,
      expiresAt: true,
      paidAt: true,
      createdAt: true,
      tradingAccountId: true,
      user: { select: { id: true, name: true, email: true } },
      expertAdvisor: { select: { name: true } },
      package: { select: { name: true, recurringType: true } },
      tradingAccount: { select: { accountId: true } },
      setupRequest: {
        select: { accountId: true, accountServer: true, status: true },
      },
    },
  });

  const countByStatus = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count._all]),
  );
  const paidOrders = countByStatus.PAID || 0;
  const pendingOrders = countByStatus.PENDING || 0;
  const setupOrders = await prisma.tradingAccountSetupRequest.count({
    where: { status: "PENDING" },
  });

  const baseParams = new URLSearchParams();
  if (query) baseParams.set("q", query);
  if (selectedStatus !== "ALL") baseParams.set("status", selectedStatus);

  const getPageHref = (page: number) => {
    const nextParams = new URLSearchParams(baseParams);
    nextParams.set("page", String(page));
    return `/admin/orders?${nextParams.toString()}`;
  };

  const startItem = totalOrders ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalOrders);

  return (
    <main className="min-h-screen bg-slate-50/50 p-2">
      <div className="w-full space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            Commerce
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Orders</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor customer orders, payment status, and trading account setup requests.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "All Orders", value: statusCounts.reduce((sum, item) => sum + item._count._all, 0), icon: ShoppingCart },
            { label: "Paid", value: paidOrders, icon: CheckCircle2 },
            { label: "Pending Payment", value: pendingOrders, icon: Clock3 },
            { label: "Waiting Setup", value: setupOrders, icon: PackageCheck },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">{card.value.toLocaleString("en-US")}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <form className="flex flex-col gap-3 md:flex-row md:items-center" method="get">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search order ID, customer, EA, package, or account..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All statuses" : status}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
                Filter
              </button>
              {(query || selectedStatus !== "ALL") && (
                <Link href="/admin/orders" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
                  Reset
                </Link>
              )}
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Account / Request</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length ? (
                  orders.map((order) => {
                    const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
                    const StatusIcon = config.icon;
                    const isExistingAccountOrder = order.tradingAccountId !== null;
                    return (
                      <tr key={order.id} className="align-top transition hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs font-semibold text-slate-900">{order.orderNumber}</code>
                            <CopyTextButton value={order.orderNumber} />
                          </div>
                          <p className="mt-2 text-xs text-slate-400">{order.type.replaceAll("_", " ")}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{order.user.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{order.user.email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{order.expertAdvisor.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{order.package.name} · {order.package.recurringType}</p>
                        </td>
                        <td className="px-5 py-4">
                          {isExistingAccountOrder ? (
                            <>
                              <p className="font-mono text-xs font-semibold text-blue-700">{order.tradingAccount?.accountId || "-"}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {order.type === "RENEWAL" ? "Renewal target" : "Upgrade target"}
                              </p>
                            </>
                          ) : order.setupRequest ? (
                            <>
                              <p className="font-mono text-xs font-semibold text-slate-800">{order.setupRequest.accountId}</p>
                              <p className="mt-1 text-xs text-slate-500">{order.setupRequest.accountServer}</p>
                              <span className="mt-2 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                SETUP {order.setupRequest.status}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Not submitted</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-950">{formatMoney(order.amount, order.currency)}</p>
                          {order.discountPercent > 0 ? (
                            <p className="mt-1 text-xs text-emerald-600">
                              Discount {order.discountPercent}% ({formatMoney(order.discountAmount, order.currency)})
                            </p>
                          ) : null}
                          {order.discountPercent > 0 ? (
                            <p className="mt-1 text-[10px] text-slate-400">
                              Base {formatMoney(order.baseAmount, order.currency)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500">
                            {[order.paymentMethod, order.paymentChannel].filter(Boolean).join(" · ") || (Number(order.amount) === 0 ? "Free" : "-")}
                          </p>
                          {order.providerTransactionId ? <p className="mt-1 max-w-40 truncate font-mono text-[10px] text-slate-400">{order.providerTransactionId}</p> : null}
                        </td>
                        <td className="px-5 py-4 text-xs leading-5 text-slate-500">
                          <p>Created: {formatDate(order.createdAt)}</p>
                          <p>{order.paidAt ? `Paid: ${formatDate(order.paidAt)}` : `Expires: ${formatDate(order.expiresAt)}`}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${config.className}`}>
                            <StatusIcon className="h-3.5 w-3.5" />
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/users/${order.user.id}/trading-accounts`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            <UserRound className="h-3.5 w-3.5" />
                            User accounts
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center text-slate-400">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>Showing {startItem}-{endItem} of {totalOrders}</p>
            <div className="flex items-center gap-2">
              <Link href={getPageHref(Math.max(1, currentPage - 1))} aria-disabled={currentPage <= 1} className={`flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition hover:bg-slate-50 ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}>
                Previous
              </Link>
              <span className="px-2 font-medium text-slate-600">{currentPage} / {totalPages}</span>
              <Link href={getPageHref(Math.min(totalPages, currentPage + 1))} aria-disabled={currentPage >= totalPages} className={`flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition hover:bg-slate-50 ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}>
                Next
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
