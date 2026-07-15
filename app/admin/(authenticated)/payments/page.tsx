import {
  BadgeDollarSign,
  CalendarClock,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import AdminPaymentDateFilter from "../../components/AdminPaymentDateFilter";

const PAGE_SIZE = 30;

const currencyCodes = ["IDR", "USD", "MYR", "SGD"] as const;

type CurrencyCode = (typeof currencyCodes)[number];

const getCurrency = (currency?: string | null): CurrencyCode => {
  return currencyCodes.includes(currency as CurrencyCode)
    ? (currency as CurrencyCode)
    : "IDR";
};

const formatMoney = (amount: unknown, currency?: string | null) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: getCurrency(currency),
    maximumFractionDigits: getCurrency(currency) === "IDR" ? 0 : 2,
  }).format(Number(amount || 0));
};

const formatDate = (value?: Date | null) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
};

const getStatusClassName = (status: string) => {
  if (status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
};

const getJakartaDateParam = (value: Date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
};

const parseStartDateParam = (value: string) => {
  if (!value) {
    return new Date();
  }

  const date = new Date(`${value}T00:00:00.000+07:00`);
  return Number.isNaN(date.getTime())
    ? new Date(`${getJakartaDateParam(new Date())}T00:00:00.000+07:00`)
    : date;
};

const parseEndDateParam = (value: string) => {
  const date = new Date(`${value}T23:59:59.999+07:00`);
  return Number.isNaN(date.getTime())
    ? new Date(`${getJakartaDateParam(new Date())}T23:59:59.999+07:00`)
    : date;
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page || 1) || 1);
  const todayParam = getJakartaDateParam(new Date());
  const selectedStartDate = params.startDate || todayParam;
  const selectedEndDate = params.endDate || selectedStartDate;
  const approvedAtFilter = {
    gte: parseStartDateParam(selectedStartDate),
    lte: parseEndDateParam(selectedEndDate),
  };
  const paymentWhere = {
    approvedAt: approvedAtFilter,
  };
  const filterParams = new URLSearchParams();

  filterParams.set("startDate", selectedStartDate);
  filterParams.set("endDate", selectedEndDate);

  const getPageHref = (page: number) => {
    const nextParams = new URLSearchParams(filterParams);
    nextParams.set("page", String(page));
    return `/admin/payments?${nextParams.toString()}`;
  };
  const [
    paymentRecords,
    totalPaymentRecords,
    approvedRevenueByCurrency,
    activationCount,
    renewalCount,
  ] = await Promise.all([
    prisma.paymentRecord.findMany({
      where: paymentWhere,
      orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        type: true,
        status: true,
        previousEndDate: true,
        newEndDate: true,
        paidAt: true,
        approvedAt: true,
        note: true,
        createdAt: true,
        package: {
          select: {
            name: true,
          },
        },
        tradingAccount: {
          select: {
            accountId: true,
            accountName: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.paymentRecord.count({
      where: paymentWhere,
    }),
    prisma.paymentRecord.groupBy({
      by: ["currency"],
      where: {
        ...paymentWhere,
        status: "APPROVED",
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.paymentRecord.count({
      where: {
        ...paymentWhere,
        type: "ACTIVATION",
      },
    }),
    prisma.paymentRecord.count({
      where: {
        ...paymentWhere,
        type: "RENEWAL",
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalPaymentRecords / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startItem = totalPaymentRecords
    ? (safeCurrentPage - 1) * PAGE_SIZE + 1
    : 0;
  const endItem = Math.min(safeCurrentPage * PAGE_SIZE, totalPaymentRecords);
  const totalApproved = approvedRevenueByCurrency.reduce<Record<CurrencyCode, number>>(
    (map, payment) => {
      const currency = getCurrency(payment.currency);
      map[currency] += Number(payment._sum.amount || 0);
      return map;
    },
    { IDR: 0, USD: 0, MYR: 0, SGD: 0 },
  );
  const totalApprovedLabel = currencyCodes
    .filter((currency) => totalApproved[currency] > 0)
    .map((currency) => formatMoney(totalApproved[currency], currency))
    .join(" / ");
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            Payments
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Payment History
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manual QRIS and offline payment records linked to trading accounts.
            Daily revenue reports use approved payment timestamps.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            {
              label: "Total Approved",
              value: totalApprovedLabel || "0",
              icon: BadgeDollarSign,
            },
            {
              label: "Payment Records",
              value: totalPaymentRecords.toLocaleString("en-US"),
              icon: ReceiptText,
            },
            {
              label: "Activations",
              value: activationCount.toLocaleString("en-US"),
              icon: CreditCard,
            },
            {
              label: "Renewals",
              value: renewalCount.toLocaleString("en-US"),
              icon: CalendarClock,
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-400">
                      {card.label}
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-950">
                      {card.value}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">
                Latest Payment Records
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Filter uses approved payment date.
              </p>
            </div>
            <AdminPaymentDateFilter
              startDate={selectedStartDate}
              endDate={selectedEndDate}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Trading Account</th>
                  <th className="px-5 py-3 font-semibold">Package</th>
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentRecords.length ? (
                  paymentRecords.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-950">
                          {formatMoney(payment.amount, payment.currency)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.type} · {payment.paymentMethod}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {payment.tradingAccount.user.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {payment.tradingAccount.user.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-semibold text-slate-800">
                          {payment.tradingAccount.accountId}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {payment.tradingAccount.accountName || "-"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {payment.package.name}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        <p>Prev: {formatDate(payment.previousEndDate)}</p>
                        <p>New: {formatDate(payment.newEndDate)}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        <p>Paid: {formatDate(payment.paidAt)}</p>
                        <p>Approved: {formatDate(payment.approvedAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusClassName(payment.status)}`}
                        >
                          {payment.status}
                        </span>
                        {payment.note ? (
                          <p className="mt-2 max-w-48 truncate text-xs text-slate-400">
                            {payment.note}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-400"
                    >
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-5 py-4 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {startItem}-{endItem} of {totalPaymentRecords}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={getPageHref(Math.max(1, safeCurrentPage - 1))}
                aria-disabled={safeCurrentPage <= 1}
                className={`flex h-8 items-center rounded-md border border-gray-200 bg-white px-3 font-medium text-gray-700 transition hover:bg-gray-50 ${
                  safeCurrentPage <= 1 ? "pointer-events-none opacity-50" : ""
                }`}
              >
                Previous
              </Link>
              <span className="px-2 font-medium text-gray-600">
                {safeCurrentPage} / {totalPages}
              </span>
              <Link
                href={getPageHref(Math.min(totalPages, safeCurrentPage + 1))}
                aria-disabled={safeCurrentPage >= totalPages}
                className={`flex h-8 items-center rounded-md border border-gray-200 bg-white px-3 font-medium text-gray-700 transition hover:bg-gray-50 ${
                  safeCurrentPage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
