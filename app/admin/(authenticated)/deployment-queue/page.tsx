import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import {
  CheckCircle2,
  CircleX,
  Clock3,
  ExternalLink,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const QUEUE_STATUSES = [
  "ALL",
  "QUEUED",
  "PROCESSING",
  "RETRY",
  "READY",
  "FAILED",
] as const;

type QueueStatusFilter = (typeof QUEUE_STATUSES)[number];

const statusConfig = {
  QUEUED: {
    icon: Clock3,
    label: "Queued",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  PROCESSING: {
    icon: LoaderCircle,
    label: "Processing",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  RETRY: {
    icon: RotateCcw,
    label: "Waiting retry",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  READY: {
    icon: CheckCircle2,
    label: "Ready",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  FAILED: {
    icon: CircleX,
    label: "Failed",
    className: "border-red-200 bg-red-50 text-red-700",
  },
} as const;

const formatDate = (value?: Date | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
    timeZoneName: "short",
  }).format(value);
};

const normalizeStatus = (value?: string): QueueStatusFilter => {
  const normalized = value?.toUpperCase() as QueueStatusFilter;
  return QUEUE_STATUSES.includes(normalized) ? normalized : "ALL";
};

export default async function AdminDeploymentQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const selectedStatus = normalizeStatus(params.status);
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);

  const where: Prisma.DeploymentJobWhereInput = {
    ...(selectedStatus !== "ALL" ? { status: selectedStatus } : {}),
    ...(query
      ? {
          OR: [
            { setupRequest: { accountId: { contains: query } } },
            { setupRequest: { order: { orderNumber: { contains: query } } } },
            { setupRequest: { order: { user: { name: { contains: query } } } } },
            { setupRequest: { order: { user: { email: { contains: query } } } } },
            { server: { name: { contains: query } } },
            { server: { domain: { contains: query } } },
          ],
        }
      : {}),
  };

  const [totalJobs, statusCounts] = await Promise.all([
    prisma.deploymentJob.count({ where }),
    prisma.deploymentJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const jobs = await prisma.deploymentJob.findMany({
    where,
    orderBy: { id: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      action: true,
      status: true,
      attempts: true,
      maxAttempts: true,
      errorMessage: true,
      nextRetryAt: true,
      queuedAt: true,
      startedAt: true,
      completedAt: true,
      updatedAt: true,
      setupRequest: {
        select: {
          accountId: true,
          accountServer: true,
          status: true,
          order: {
            select: {
              orderNumber: true,
              user: { select: { id: true, name: true, email: true } },
              package: { select: { name: true } },
              expertAdvisor: { select: { name: true } },
            },
          },
        },
      },
      server: { select: { id: true, name: true, domain: true } },
      tradingAccount: { select: { id: true, accountId: true } },
    },
  });

  const countByStatus = Object.fromEntries(
    statusCounts.map((item) => [item.status, item._count._all]),
  );
  const allJobs = statusCounts.reduce((sum, item) => sum + item._count._all, 0);

  const baseParams = new URLSearchParams();
  if (query) baseParams.set("q", query);
  if (selectedStatus !== "ALL") baseParams.set("status", selectedStatus);

  const getPageHref = (page: number) => {
    const nextParams = new URLSearchParams(baseParams);
    nextParams.set("page", String(page));
    return `/admin/deployment-queue?${nextParams.toString()}`;
  };

  const startItem = totalJobs ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(currentPage * PAGE_SIZE, totalJobs);

  return (
    <main className="min-h-screen bg-slate-50/50 p-2">
      <div className="w-full space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            Automation
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Deployment Queue
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Monitor automatic trading account setup, server assignment, retry
            schedules, and deployment errors.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "All Jobs", value: allJobs, icon: ListTodo },
            {
              label: "Waiting",
              value: (countByStatus.QUEUED || 0) + (countByStatus.RETRY || 0),
              icon: Clock3,
            },
            {
              label: "Processing",
              value: countByStatus.PROCESSING || 0,
              icon: LoaderCircle,
            },
            {
              label: "Ready",
              value: countByStatus.READY || 0,
              icon: CheckCircle2,
            },
            {
              label: "Failed",
              value: countByStatus.FAILED || 0,
              icon: CircleX,
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
                    <p className="mt-2 text-2xl font-bold text-slate-950">
                      {card.value.toLocaleString("en-US")}
                    </p>
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
            <form
              className="flex flex-col gap-3 md:flex-row md:items-center"
              method="get"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search account, order, customer, or server..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {QUEUE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? "All statuses" : status}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Filter
              </button>
              <button
                type="submit"
                title="Refresh queue"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              {(query || selectedStatus !== "ALL") && (
                <Link
                  href="/admin/deployment-queue"
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Reset
                </Link>
              )}
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Job</th>
                  <th className="px-5 py-3 font-semibold">Account / Customer</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Server</th>
                  <th className="px-5 py-3 font-semibold">Attempts</th>
                  <th className="px-5 py-3 font-semibold">Timeline</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Last Error</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.length ? (
                  jobs.map((job) => {
                    const config =
                      statusConfig[job.status as keyof typeof statusConfig] ||
                      statusConfig.QUEUED;
                    const StatusIcon = config.icon;
                    const assignedAccountId =
                      job.tradingAccount?.accountId || job.setupRequest.accountId;

                    return (
                      <tr
                        key={job.id}
                        className="align-top transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-bold text-slate-900">
                            #{job.id}
                          </p>
                          <p className="mt-1 text-xs font-medium text-blue-600">
                            {job.action}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-slate-400">
                            {job.setupRequest.order.orderNumber}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-bold text-slate-900">
                            {assignedAccountId}
                          </p>
                          <p className="mt-1 font-medium text-slate-700">
                            {job.setupRequest.order.user.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {job.setupRequest.order.user.email}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            Broker: {job.setupRequest.accountServer}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {job.setupRequest.order.expertAdvisor.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {job.setupRequest.order.package.name}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {job.server ? (
                            <>
                              <p className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                                <Server className="h-3.5 w-3.5 text-blue-500" />
                                {job.server.name || `Server #${job.server.id}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {job.server.domain || "No domain"}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-amber-600">
                              Waiting for available server
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {job.attempts} / {job.maxAttempts}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Setup: {job.setupRequest.status}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-xs leading-5 text-slate-500">
                          <p>Queued: {formatDate(job.queuedAt)}</p>
                          {job.startedAt ? (
                            <p>Started: {formatDate(job.startedAt)}</p>
                          ) : null}
                          {job.completedAt ? (
                            <p>Completed: {formatDate(job.completedAt)}</p>
                          ) : job.nextRetryAt ? (
                            <p className="font-medium text-orange-600">
                              Retry: {formatDate(job.nextRetryAt)}
                            </p>
                          ) : (
                            <p>Updated: {formatDate(job.updatedAt)}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${config.className}`}
                          >
                            <StatusIcon
                              className={`h-3.5 w-3.5 ${job.status === "PROCESSING" ? "animate-spin" : ""}`}
                            />
                            {config.label}
                          </span>
                        </td>
                        <td className="max-w-72 px-5 py-4">
                          {job.errorMessage ? (
                            <details className="group">
                              <summary className="line-clamp-2 cursor-pointer text-xs leading-5 text-red-600">
                                {job.errorMessage}
                              </summary>
                              <p className="mt-2 whitespace-pre-wrap break-words rounded-md border border-red-100 bg-red-50 p-2 text-xs leading-5 text-red-700">
                                {job.errorMessage}
                              </p>
                            </details>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/users/${job.setupRequest.order.user.id}/trading-accounts`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            View account
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-14 text-center text-slate-400"
                    >
                      No deployment jobs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {startItem}-{endItem} of {totalJobs}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={getPageHref(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage <= 1}
                className={`flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition hover:bg-slate-50 ${currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
              >
                Previous
              </Link>
              <span className="px-2 font-medium text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <Link
                href={getPageHref(Math.min(totalPages, currentPage + 1))}
                aria-disabled={currentPage >= totalPages}
                className={`flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition hover:bg-slate-50 ${currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}`}
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
