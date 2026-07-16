"use client";

import { useDeferredValue, useState } from "react";
import {
  Activity,
  CircleCheck,
  RefreshCw,
  Search,
  ServerOff,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type RuntimeHealthIssueFilters,
  useGetAdminRuntimeHealthIssues,
} from "@/hooks/useAdminRuntimeHealthIssues";
import AdminTablePagination, {
  DEFAULT_TABLE_PAGE_SIZE,
} from "./AdminTablePagination";

type ServerItem = {
  id: number;
  name: string | null;
  domain: string | null;
  ipAddress: string;
};

type RuntimeHealthIssue = {
  id: number;
  accountId: string;
  reason: "NOT_REGISTERED" | "WRONG_SERVER";
  registeredServerId: number | null;
  runtimeStatus: string;
  isRunning: boolean;
  isPaused: boolean;
  pid: number | null;
  lastHeartbeatAt: string | null;
  firstDetectedAt: string;
  lastDetectedAt: string;
  detectionCount: number;
  resolvedAt: string | null;
  server: ServerItem;
};

type ReportsResponse = {
  data?: {
    items: RuntimeHealthIssue[];
    summary: {
      active: number;
      unregistered: number;
      wrongServer: number;
      resolved: number;
    };
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    servers: ServerItem[];
  };
};

const selectTriggerClass =
  "h-9 w-full border-slate-200 bg-white text-slate-700 shadow-none sm:w-44";

const selectContentClass =
  "z-[80] border-slate-200 bg-white text-slate-800 shadow-lg";

const formatDateTime = (value: string | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getRuntimeLabel = (issue: RuntimeHealthIssue) => {
  if (issue.isPaused) return "Paused";
  if (issue.isRunning) return "Running";
  return issue.runtimeStatus || "Unknown";
};

export default function AdminRuntimeHealthReportsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<RuntimeHealthIssueFilters["status"]>("active");
  const [reason, setReason] =
    useState<RuntimeHealthIssueFilters["reason"]>("all");
  const [serverId, setServerId] = useState("all");
  const deferredSearch = useDeferredValue(search);

  const query = useGetAdminRuntimeHealthIssues({
    page,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
    search: deferredSearch,
    status,
    reason,
    serverId,
  });
  const response = query.data as ReportsResponse | undefined;
  const data = response?.data;
  const items = data?.items || [];
  const summary = data?.summary || {
    active: 0,
    unregistered: 0,
    wrongServer: 0,
    resolved: 0,
  };
  const pagination = data?.pagination || {
    page: 1,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  };

  const updateStatus = (
    nextStatus: RuntimeHealthIssueFilters["status"],
    nextReason: RuntimeHealthIssueFilters["reason"] = "all",
  ) => {
    setStatus(nextStatus);
    setReason(nextReason);
    setPage(1);
  };

  const cards = [
    {
      label: "Active issues",
      value: summary.active,
      icon: ShieldAlert,
      className: "border-red-200 bg-red-50 text-red-700",
      onClick: () => updateStatus("active"),
    },
    {
      label: "Not registered",
      value: summary.unregistered,
      icon: TriangleAlert,
      className: "border-amber-200 bg-amber-50 text-amber-700",
      onClick: () => updateStatus("active", "NOT_REGISTERED"),
    },
    {
      label: "Wrong server",
      value: summary.wrongServer,
      icon: ServerOff,
      className: "border-orange-200 bg-orange-50 text-orange-700",
      onClick: () => updateStatus("active", "WRONG_SERVER"),
    },
    {
      label: "Resolved",
      value: summary.resolved,
      icon: CircleCheck,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      onClick: () => updateStatus("resolved"),
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/50 p-4 md:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Runtime monitoring
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Health Reports
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Live MT5 processes that are missing from CuanHero or running on
              the wrong server.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                onClick={card.onClick}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${card.className}`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold">{card.value}</p>
                </div>
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_180px_190px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search account, server, or runtime..."
              className="h-9 border-slate-200 pl-9"
            />
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as RuntimeHealthIssueFilters["status"]);
              setPage(1);
            }}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={reason}
            onValueChange={(value) => {
              setReason(value as RuntimeHealthIssueFilters["reason"]);
              setPage(1);
            }}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Reason" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="all">All reasons</SelectItem>
              <SelectItem value="NOT_REGISTERED">Not registered</SelectItem>
              <SelectItem value="WRONG_SERVER">Wrong server</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={serverId}
            onValueChange={(value) => {
              setServerId(value);
              setPage(1);
            }}
          >
            <SelectTrigger className={`${selectTriggerClass} sm:w-full`}>
              <SelectValue placeholder="Server" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <SelectItem value="all">All servers</SelectItem>
              {(data?.servers || []).map((server) => (
                <SelectItem key={server.id} value={String(server.id)}>
                  {server.name || server.domain || server.ipAddress}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Detected server</th>
                <th className="px-5 py-3">Issue</th>
                <th className="px-5 py-3">Runtime</th>
                <th className="px-5 py-3">Detection</th>
                <th className="px-5 py-3">Report status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {query.isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center text-slate-400"
                  >
                    Loading health reports...
                  </td>
                </tr>
              ) : query.isError ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center text-red-600"
                  >
                    {query.error instanceof Error
                      ? query.error.message
                      : "Failed to load health reports."}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-14 text-center text-slate-400"
                  >
                    No health reports match the selected filters.
                  </td>
                </tr>
              ) : (
                items.map((issue) => {
                  const isUnregistered = issue.reason === "NOT_REGISTERED";
                  const resolved = Boolean(issue.resolvedAt);

                  return (
                    <tr
                      key={issue.id}
                      className={
                        resolved ? "hover:bg-slate-50/60" : "bg-red-50/30"
                      }
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono font-semibold text-slate-900">
                          {issue.accountId}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          PID: {issue.pid || "-"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {issue.server.name || `Server #${issue.server.id}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {issue.server.domain || issue.server.ipAddress}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            isUnregistered
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-orange-200 bg-orange-50 text-orange-700"
                          }`}
                        >
                          {isUnregistered ? "Not registered" : "Wrong server"}
                        </span>
                        <p className="mt-2 text-xs text-slate-500">
                          {isUnregistered
                            ? "No matching trading account"
                            : `Expected on server #${issue.registeredServerId || "-"}`}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium capitalize text-slate-800">
                          {getRuntimeLabel(issue)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Heartbeat: {formatDateTime(issue.lastHeartbeatAt)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-slate-700">
                          First: {formatDateTime(issue.firstDetectedAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Last: {formatDateTime(issue.lastDetectedAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Detected {issue.detectionCount} times
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            resolved
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {resolved ? "Resolved" : "Active"}
                        </span>
                        {resolved && (
                          <p className="mt-2 text-xs text-slate-500">
                            {formatDateTime(issue.resolvedAt)}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminTablePagination
          currentPage={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.total}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}
