"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ExternalLink,
  ImageIcon,
  Loader2,
  Pause,
  Play,
  Power,
  RefreshCw,
  Rocket,
  Search,
  Stethoscope,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAdminServers } from "@/hooks/useAdminServers";
import { useGetAdminTradingAccounts } from "@/hooks/useAdminTradingAccounts";
import { useManageAdminTradingAccountRuntime } from "@/hooks/useAdminUsers";
import AdminTablePagination, { DEFAULT_TABLE_PAGE_SIZE } from "./AdminTablePagination";

type TradingAccount = {
  id: number;
  accountId: string;
  accountName?: string | null;
  accountServer?: string | null;
  status: number;
  eaStatus: number;
  lastSync?: string | null;
  endDate?: string | null;
  user: { id: string; name: string; email: string };
  server?: { id: number; name: string | null } | null;
  package?: { name: string } | null;
  expertAdvisor?: { name: string } | null;
};

type Health = "online" | "warning" | "offline" | "inactive";
type RuntimeAction = "deploy" | "pause" | "resume" | "terminate" | "health";
const WARNING_AFTER_MS = 5 * 60 * 1000;
const OFFLINE_AFTER_MS = 15 * 60 * 1000;

const getHealth = (account: TradingAccount, now: number): Health => {
  if (account.status !== 1) return "inactive";
  if (!account.lastSync) return "offline";
  const age = now - new Date(account.lastSync).getTime();
  if (age > OFFLINE_AFTER_MS) return "offline";
  if (age > WARNING_AFTER_MS) return "warning";
  return "online";
};

const healthMeta = {
  online: { label: "Online", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: Wifi },
  warning: { label: "Delayed", className: "border-amber-200 bg-amber-50 text-amber-700", icon: AlertTriangle },
  offline: { label: "Offline", className: "border-red-200 bg-red-50 text-red-700", icon: WifiOff },
  inactive: { label: "Inactive", className: "border-slate-200 bg-slate-100 text-slate-600", icon: Activity },
} as const;

const formatLastSync = (value?: string | null) => {
  if (!value) return "Never synced";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
};

const formatEndDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
};

const getJakartaDateKey = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";

  return `${part("year")}${part("month")}${part("day")}`;
};

const getEndDateMeta = (account: TradingAccount, now: number) => {
  if (!account.endDate) {
    return {
      label: "No end date",
      expiredWhileRunning: false,
      className: "border-slate-200 bg-slate-100 text-slate-600",
    };
  }

  const endDate = new Date(account.endDate);
  if (Number.isNaN(endDate.getTime())) {
    return {
      label: "Invalid date",
      expiredWhileRunning: false,
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  const expired = getJakartaDateKey(endDate) < getJakartaDateKey(new Date(now));
  const expiredWhileRunning = expired && account.eaStatus === 1;

  if (expiredWhileRunning) {
    return {
      label: "Expired · Bot Running",
      expiredWhileRunning: true,
      className: "border-red-300 bg-red-100 text-red-800",
    };
  }

  if (expired) {
    return {
      label: "Expired",
      expiredWhileRunning: false,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Active",
    expiredWhileRunning: false,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
};

export default function AdminTradingAccountsPage({
  initialServerId = "all",
}: {
  initialServerId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading, isError, error, isFetching, refetch, dataUpdatedAt } =
    useGetAdminTradingAccounts();
  const { data: serversResponse } = useGetAdminServers();
  const manageTradingAccountRuntime = useManageAdminTradingAccountRuntime();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Health>("all");
  const serverId = initialServerId;
  const [page, setPage] = useState(1);
  const [runtimeAction, setRuntimeAction] = useState<{
    accountId: number;
    action: RuntimeAction;
  } | null>(null);
  const [terminateAccount, setTerminateAccount] =
    useState<TradingAccount | null>(null);
  const [screenshotAccount, setScreenshotAccount] =
    useState<TradingAccount | null>(null);
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);
  const [screenshotRequestId, setScreenshotRequestId] = useState(0);
  const [mountedAt] = useState(() => Date.now());
  const accounts = useMemo(
    () => (data?.data || []) as TradingAccount[],
    [data?.data],
  );
  const now = dataUpdatedAt || mountedAt;
  const servers = useMemo(
    () =>
      [
        ...((serversResponse?.data || []) as Array<{
          id: number;
          name?: string | null;
        }>),
      ].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [serversResponse?.data],
  );
  const serverAccounts = useMemo(
    () =>
      serverId === "all"
        ? accounts
        : accounts.filter((account) =>
            account.server?.id === Number(serverId),
          ),
    [accounts, serverId],
  );

  const counts = useMemo(
    () =>
      serverAccounts.reduce(
        (result, account) => {
          result[getHealth(account, now)] += 1;
          return result;
        },
        { online: 0, warning: 0, offline: 0, inactive: 0 } as Record<
          Health,
          number
        >,
      ),
    [now, serverAccounts],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return serverAccounts.filter((account) => {
      const matchesHealth = filter === "all" || getHealth(account, now) === filter;
      const matchesSearch = !needle || [account.accountId, account.accountName, account.user.name, account.user.email, account.server?.name]
        .some((value) => value?.toLowerCase().includes(needle));
      return matchesHealth && matchesSearch;
    });
  }, [filter, now, search, serverAccounts]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * DEFAULT_TABLE_PAGE_SIZE, safePage * DEFAULT_TABLE_PAGE_SIZE);

  const filters: Array<{ key: "all" | Health; label: string; count: number }> = [
    { key: "all", label: "All", count: serverAccounts.length },
    { key: "offline", label: "Offline", count: counts.offline },
    { key: "warning", label: "Delayed", count: counts.warning },
    { key: "online", label: "Online", count: counts.online },
    { key: "inactive", label: "Inactive", count: counts.inactive },
  ];

  const handleServerChange = (value: string) => {
    setPage(1);

    router.replace(
      value === "all" ? pathname : `${pathname}?serverId=${value}`,
      { scroll: false },
    );
  };

  const handleCheckHealth = async (account: TradingAccount) => {
    setRuntimeAction({ accountId: account.id, action: "health" });

    try {
      const response = await manageTradingAccountRuntime.mutateAsync({
        userId: account.user.id,
        tradingAccountId: account.id,
        action: "health",
      });
      const runtime = response?.data?.runtime;
      const bot =
        runtime?.bot && typeof runtime.bot === "object" ? runtime.bot : null;
      const runtimeStatus =
        bot && "status" in bot && typeof bot.status === "string"
          ? bot.status
          : "unknown";

      toast.success(
        `${account.accountId}: runtime status ${runtimeStatus}.`,
      );
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Healthcheck ${account.accountId} gagal.`,
      );
    } finally {
      setRuntimeAction(null);
    }
  };

  const handleRuntimeAction = async (
    account: TradingAccount,
    action: Exclude<RuntimeAction, "health">,
  ) => {
    setRuntimeAction({ accountId: account.id, action });

    try {
      await manageTradingAccountRuntime.mutateAsync({
        userId: account.user.id,
        tradingAccountId: account.id,
        action,
      });

      toast.success(
        action === "deploy"
          ? "Deployment bot sedang diproses."
          : action === "pause"
            ? "Bot berhasil dipause."
            : action === "resume"
              ? "Bot sedang di-resume."
              : "Bot dan instance berhasil diterminate.",
      );
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Runtime action gagal dijalankan.",
      );
    } finally {
      setRuntimeAction(null);
    }
  };

  const refreshScreenshot = () => {
    setScreenshotError(false);
    setIsScreenshotLoading(true);
    setScreenshotRequestId(Date.now());
  };

  const openScreenshot = (account: TradingAccount) => {
    setScreenshotAccount(account);
    refreshScreenshot();
  };

  const screenshotUrl = screenshotAccount
    ? `/api/admin/trading-accounts/${screenshotAccount.id}/screenshot?v=${screenshotRequestId}`
    : "";

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/50 p-2">
      <section className="rounded-md border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600"><Activity className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-wider">Service monitor</span></div>
            <h1 className="mt-1 text-xl font-bold text-gray-900">Trading Accounts</h1>
            <p className="mt-1 text-sm text-gray-500">Heartbeat delayed after 5 minutes and offline after 15 minutes.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Auto refresh 30s
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh Healthcheck
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["offline", "warning", "online", "inactive"] as Health[]).map((health) => {
            const meta = healthMeta[health];
            const Icon = meta.icon;
            return <button key={health} onClick={() => { setFilter(health); setPage(1); }} className={`flex items-center justify-between rounded-lg border p-4 text-left ${meta.className}`}><div><p className="text-xs font-semibold uppercase">{meta.label}</p><p className="mt-1 text-2xl font-bold">{counts[health]}</p></div><Icon className="h-6 w-6" /></button>;
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select value={serverId} onValueChange={handleServerChange}>
              <SelectTrigger className="w-full border-slate-200 bg-white sm:w-56">
                <SelectValue placeholder="Filter server" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All servers</SelectItem>
                {servers.map((server) => (
                  <SelectItem key={server.id} value={String(server.id)}>
                    {server.name || `Server #${server.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search account, user, or server..." className="pl-9" /></div>
          </div>
          <div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item.key} onClick={() => { setFilter(item.key); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === item.key ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{item.label} ({item.count})</button>)}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Owner</th><th className="px-5 py-3">Server / EA</th><th className="px-5 py-3">Heartbeat</th><th className="px-5 py-3">End Date</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">Loading trading accounts...</td></tr>
                : isError ? <tr><td colSpan={7} className="px-5 py-12 text-center text-red-600">{error instanceof Error ? error.message : "Failed to load trading accounts."}</td></tr>
                : visible.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No matching trading accounts.</td></tr>
                : visible.map((account) => {
                  const health = getHealth(account, now); const meta = healthMeta[health]; const Icon = meta.icon; const endDateMeta = getEndDateMeta(account, now);
                  return <tr key={account.id} className={endDateMeta.expiredWhileRunning || health === "offline" ? "bg-red-50/40" : "hover:bg-slate-50/60"}>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{account.accountName || account.accountId}</p><p className="text-xs text-slate-500">{account.accountId} · {account.accountServer || "-"}</p></td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-800">{account.user.name}</p><p className="text-xs text-slate-500">{account.user.email}</p></td>
                    <td className="px-5 py-4"><p className="text-slate-700">{account.server?.name || "-"}</p><p className="text-xs text-slate-500">{account.expertAdvisor?.name || "No EA"} · {account.package?.name || "No package"}</p></td>
                    <td className="whitespace-nowrap px-5 py-4"><p className="text-slate-700">{formatLastSync(account.lastSync)}</p><p className="text-xs text-slate-400">EA status: {account.eaStatus}</p></td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <p className={endDateMeta.expiredWhileRunning ? "font-semibold text-red-700" : "text-slate-700"}>{formatEndDate(account.endDate)}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${endDateMeta.className}`}>{endDateMeta.label}</span>
                    </td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}><Icon className="h-3.5 w-3.5" />{meta.label}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-72 flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleCheckHealth(account)}
                          disabled={runtimeAction !== null}
                          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {runtimeAction?.accountId === account.id &&
                          runtimeAction.action === "health" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Stethoscope className="h-3.5 w-3.5" />
                          )}
                          Check Health
                        </button>
                        <Button
                          type="button"
                          title="Deploy bot"
                          disabled={account.status !== 1 || runtimeAction !== null}
                          onClick={() => void handleRuntimeAction(account, "deploy")}
                          className="h-7 gap-1 rounded-md bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
                        >
                          {runtimeAction?.accountId === account.id &&
                          runtimeAction.action === "deploy" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Rocket className="h-3.5 w-3.5" />
                          )}
                          Deploy
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title={account.eaStatus === 2 ? "Resume bot" : "Pause bot"}
                          disabled={
                            runtimeAction !== null ||
                            ![1, 2].includes(account.eaStatus)
                          }
                          onClick={() =>
                            void handleRuntimeAction(
                              account,
                              account.eaStatus === 2 ? "resume" : "pause",
                            )
                          }
                          className={
                            account.eaStatus === 2
                              ? "h-7 gap-1 rounded-md border-blue-200 bg-white px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                              : "h-7 gap-1 rounded-md border-amber-200 bg-white px-2 text-xs text-amber-700 hover:bg-amber-50 hover:text-amber-700"
                          }
                        >
                          {runtimeAction?.accountId === account.id &&
                          ["pause", "resume"].includes(runtimeAction.action) ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : account.eaStatus === 2 ? (
                            <Play className="h-3.5 w-3.5" />
                          ) : (
                            <Pause className="h-3.5 w-3.5" />
                          )}
                          {account.eaStatus === 2 ? "Resume" : "Pause"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Terminate bot and delete instance"
                          disabled={runtimeAction !== null}
                          onClick={() => setTerminateAccount(account)}
                          className="h-7 gap-1 rounded-md border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-700"
                        >
                          {runtimeAction?.accountId === account.id &&
                          runtimeAction.action === "terminate" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                          Terminate
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="View latest MT5 screenshot"
                          disabled={
                            runtimeAction !== null ||
                            ![1, 2, 3].includes(account.eaStatus)
                          }
                          onClick={() => openScreenshot(account)}
                          className="h-7 gap-1 rounded-md border-cyan-200 bg-white px-2 text-xs text-cyan-700 hover:bg-cyan-50 hover:text-cyan-700"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Screenshot
                        </Button>
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          className="h-7 gap-1 rounded-md border-blue-200 bg-white px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Link href={`/admin/users/${account.user.id}/trading-accounts`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Account
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>;
                })}
            </tbody>
          </table>
        </div>
        <AdminTablePagination currentPage={safePage} totalItems={filtered.length} onPageChange={setPage} />
      </section>

      <Dialog
        open={screenshotAccount !== null}
        onOpenChange={(open) => {
          if (!open) {
            setScreenshotAccount(null);
            setScreenshotError(false);
            setIsScreenshotLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4 pr-12">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle>MT5 Chart Preview</DialogTitle>
                <DialogDescription className="mt-1">
                  Trading account {screenshotAccount?.accountId || "-"}. The
                  EA refreshes this screenshot every 30 seconds.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isScreenshotLoading}
                onClick={refreshScreenshot}
                className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isScreenshotLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </DialogHeader>

          <div className="p-5">
            <div className="relative flex min-h-56 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-950 sm:min-h-96">
              {isScreenshotLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/75 text-sm text-slate-100 backdrop-blur-sm">
                  <RefreshCw className="h-7 w-7 animate-spin text-cyan-300" />
                  Loading the latest screenshot...
                </div>
              )}

              {screenshotError ? (
                <div className="max-w-md px-6 py-12 text-center text-slate-100">
                  <ImageIcon className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="mt-4 font-semibold">
                    Screenshot is not available yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Make sure the latest EA is running, wait up to 30 seconds,
                    then refresh this preview.
                  </p>
                </div>
              ) : screenshotUrl ? (
                // The authenticated route cannot use the Next/Image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={screenshotUrl}
                  src={screenshotUrl}
                  alt={`MT5 chart for trading account ${screenshotAccount?.accountId || ""}`}
                  className="max-h-[72vh] w-full object-contain"
                  onLoad={() => setIsScreenshotLoading(false)}
                  onError={() => {
                    setIsScreenshotLoading(false);
                    setScreenshotError(true);
                  }}
                />
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={terminateAccount !== null}
        onOpenChange={(open) => {
          if (!open && runtimeAction === null) setTerminateAccount(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-md"
        >
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Terminate Trading Account</DialogTitle>
            <DialogDescription>
              Konfirmasi penghapusan instance MT5 dari VPS.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-5">
            <div className="rounded-md border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-gray-900">
                Terminate {terminateAccount?.accountName || terminateAccount?.accountId}?
              </p>
              <p className="mt-1 text-sm leading-5 text-gray-600">
                Bot akan dihentikan dan seluruh instance MT5 account ini akan
                dihapus dari VPS. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={runtimeAction !== null}
              onClick={() => setTerminateAccount(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!terminateAccount || runtimeAction !== null}
              onClick={() => {
                if (!terminateAccount) return;
                const account = terminateAccount;
                setTerminateAccount(null);
                void handleRuntimeAction(account, "terminate");
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Terminate Instance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
