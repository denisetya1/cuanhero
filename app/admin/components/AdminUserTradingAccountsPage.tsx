"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Braces,
  CalendarIcon,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Pause,
  Pencil,
  Play,
  Plus,
  Power,
  Rocket,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateAdminTradingAccount,
  useDeleteAdminTradingAccount,
  useGetAdminTradingAccountOptions,
  useGetAdminUserTradingAccounts,
  useManageAdminTradingAccountRuntime,
  useSendAdminTradingAccountReadyNotification,
  useUpdateAdminTradingAccount,
  useUpdateAdminTradingAccountConfig,
  useVerifyAdminTradingAccountIb,
} from "@/hooks/useAdminUsers";
import AdminTablePagination, {
  DEFAULT_TABLE_PAGE_SIZE,
} from "./AdminTablePagination";

type TradingAccountItem = {
  id: number;
  accountId: string;
  packageId?: number | null;
  expertAdvisorId?: number | null;
  serverId?: number | null;
  accountName?: string | null;
  accountServer?: string | null;
  accountBalance?: string | null;
  tradingPassword?: string | null;
  recurringPrice?: string | null;
  currency?: string | null;
  status: number;
  eaStatus: number;
  eaConfiguration?: Record<string, unknown> | null;
  lastSync?: string | Date | null;
  createdAt: string | Date;
  endDate?: string | Date | null;
  package?: {
    name?: string | null;
  } | null;
  expertAdvisor?: {
    name?: string | null;
  } | null;
  server?: {
    name?: string | null;
  } | null;
};

type UserTradingAccountsResponse = {
  id: string;
  name: string;
  email: string;
  tradingAccounts: TradingAccountItem[];
};

type TradingAccountOptionsResponse = {
  packages: Array<{
    id: number;
    code?: string | null;
    name: string;
    price?: string | null;
    recurringType?: string | null;
  }>;
  expertAdvisors: Array<{
    id: number;
    name: string;
  }>;
  servers: Array<{
    id: number;
    name?: string | null;
    tradingAccountCount: number;
  }>;
};

const adminInputClass =
  "h-9 border-slate-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-blue-300 focus-visible:ring-blue-100";

const adminSelectTriggerClass =
  "h-9 w-full rounded-md border-slate-200 bg-white text-sm text-gray-900 shadow-none focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100";

const adminSelectContentClass =
  "z-[80] rounded-md border-slate-200 bg-white text-gray-900 shadow-lg [&_[data-slot=select-scroll-down-button]]:bg-white [&_[data-slot=select-scroll-down-button]]:text-slate-400 [&_[data-slot=select-scroll-up-button]]:bg-white [&_[data-slot=select-scroll-up-button]]:text-slate-400";

const adminSelectItemClass =
  "rounded-md text-gray-700 focus:!bg-blue-50 focus:!text-blue-700 focus:[&_*]:!text-blue-700 data-[highlighted]:!bg-blue-50 data-[highlighted]:!text-blue-700 data-[highlighted]:[&_*]:!text-blue-700 data-[state=checked]:!bg-blue-50 data-[state=checked]:!text-blue-700 data-[state=checked]:[&_*]:!text-blue-700 [&_svg]:!text-blue-600";

const currencyOptions = ["IDR", "USD", "MYR", "SGD"];

const tradingServerOptions = Array.from(
  { length: 45 },
  (_, index) => `Exness-MT5Real${index + 1}`,
);

const statusOptions = [
  { label: "Inactive", value: "0" },
  { label: "Active", value: "1" },
  { label: "Suspended", value: "2" },
];

const ibPackageCodes = new Set(["FREE_TRIAL", "IB_MONTHLY"]);

type IbVerificationState = {
  status: "idle" | "verified" | "failed";
  token: string;
  message: string;
};

const emptyIbVerification: IbVerificationState = {
  status: "idle",
  token: "",
  message: "",
};

const numericTextSchema = z
  .string()
  .trim()
  .min(1, "Recurring price is required.")
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
    message: "Recurring price must be a valid number.",
  });

const tradingAccountSchema = z.object({
  accountId: z.string().trim().min(1, "Account ID is required."),
  password: z.string().min(1, "Password is required."),
  server: z.string().trim().min(1, "Trading server is required."),
  serverId: z.string().trim().min(1, "VPS server is required."),
  packageId: z.string().trim().min(1, "Package is required."),
  expertAdvisorId: z.string().trim().min(1, "Expert Advisor is required."),
  recurringPrice: numericTextSchema,
  currency: z.enum(["IDR", "USD", "MYR", "SGD"]),
  status: z.enum(["0", "1", "2"]),
  endDate: z.string().optional(),
});

const editTradingAccountSchema = tradingAccountSchema.extend({
  password: z.string().optional(),
});

type TradingAccountFormValues = z.infer<typeof tradingAccountSchema>;
type EditTradingAccountFormValues = z.infer<typeof editTradingAccountSchema>;

const getTradingAccountDefaultValues = (
  packages: TradingAccountOptionsResponse["packages"],
  expertAdvisors: TradingAccountOptionsResponse["expertAdvisors"],
  servers: TradingAccountOptionsResponse["servers"],
): TradingAccountFormValues => ({
  accountId: "",
  password: "",
  server: tradingServerOptions[0],
  serverId: servers[0] ? String(servers[0].id) : "",
  packageId: "",
  expertAdvisorId: expertAdvisors[0] ? String(expertAdvisors[0].id) : "",
  recurringPrice: "",
  currency: "IDR",
  status: "1",
  endDate: "",
});

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getDateInputValue = (value?: string | Date | null) => {
  if (!value) return "";

  if (value instanceof Date) {
    return formatDateInputValue(value);
  }

  return value.slice(0, 10);
};

const parseDateInputValue = (value?: string) => {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
};

const getEditTradingAccountDefaultValues = (
  account?: TradingAccountItem | null,
): EditTradingAccountFormValues => ({
  accountId: account?.accountId || "",
  password: "",
  server: account?.accountServer || tradingServerOptions[0],
  serverId: account?.serverId ? String(account.serverId) : "",
  packageId: account?.packageId ? String(account.packageId) : "",
  expertAdvisorId: account?.expertAdvisorId
    ? String(account.expertAdvisorId)
    : "",
  recurringPrice: account?.recurringPrice || "",
  currency:
    account?.currency === "USD" ||
    account?.currency === "MYR" ||
    account?.currency === "SGD"
      ? account.currency
      : "IDR",
  status:
    account?.status === 0 ? "0" : account?.status === 2 ? "2" : "1",
  endDate: getDateInputValue(account?.endDate),
});

const getStatusMeta = (status: number) => {
  if (status === 1) {
    return {
      label: "Active",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === 2) {
    return {
      label: "Suspended",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Inactive",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  };
};

const getEaStatusMeta = (status: number) => {
  if (status === 1) {
    return {
      label: "Bot Running",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === 2) {
    return {
      label: "Bot Paused",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (status === 4) {
    return {
      label: "Bot Terminated",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (status === 3) {
    return {
      label: "Bot Offline",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label: "Bot Not Set Up",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  };
};

export default function AdminUserTradingAccountsPage({
  userId,
}: {
  userId: string;
}) {
  const queryClient = useQueryClient();
  const createTradingAccount = useCreateAdminTradingAccount();
  const verifyTradingAccountIb = useVerifyAdminTradingAccountIb();
  const updateTradingAccount = useUpdateAdminTradingAccount();
  const updateTradingAccountConfig = useUpdateAdminTradingAccountConfig();
  const deleteTradingAccount = useDeleteAdminTradingAccount();
  const manageTradingAccountRuntime =
    useManageAdminTradingAccountRuntime();
  const sendReadyNotification =
    useSendAdminTradingAccountReadyNotification();
  const { data: response, error, isError, isLoading } =
    useGetAdminUserTradingAccounts(userId);
  const { data: optionsResponse } = useGetAdminTradingAccountOptions();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openCreateEndDatePicker, setOpenCreateEndDatePicker] = useState(false);
  const [openEndDatePicker, setOpenEndDatePicker] = useState(false);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<
    Record<number, boolean>
  >({});
  const [selectedAccount, setSelectedAccount] =
    useState<TradingAccountItem | null>(null);
  const [terminateAccount, setTerminateAccount] =
    useState<TradingAccountItem | null>(null);
  const [deleteAccount, setDeleteAccount] =
    useState<TradingAccountItem | null>(null);
  const [configAccount, setConfigAccount] =
    useState<TradingAccountItem | null>(null);
  const [configText, setConfigText] = useState("");
  const [configMessage, setConfigMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState("");
  const [ibVerification, setIbVerification] =
    useState<IbVerificationState>(emptyIbVerification);
  const [editMessage, setEditMessage] = useState("");
  const [runtimeAction, setRuntimeAction] = useState<{
    accountId: number;
    action: "deploy" | "pause" | "resume" | "terminate";
  } | null>(null);
  const [notifyingAccountId, setNotifyingAccountId] = useState<number | null>(
    null,
  );
  const user = response?.data as UserTradingAccountsResponse | undefined;
  const options = optionsResponse?.data as
    | TradingAccountOptionsResponse
    | undefined;
  const packages = options?.packages || [];
  const expertAdvisors = options?.expertAdvisors || [];
  const servers = options?.servers || [];
  const tradingAccounts = user?.tradingAccounts || [];
  const totalPages = Math.max(
    1,
    Math.ceil(tradingAccounts.length / DEFAULT_TABLE_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTradingAccounts = tradingAccounts.slice(
    (safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE,
    safeCurrentPage * DEFAULT_TABLE_PAGE_SIZE,
  );
  const createTradingAccountForm = useForm<TradingAccountFormValues>({
    resolver: zodResolver(tradingAccountSchema),
    defaultValues: getTradingAccountDefaultValues([], [], []),
  });
  const createPackageId = useWatch({
    control: createTradingAccountForm.control,
    name: "packageId",
  });
  const selectedCreatePackage = packages.find(
    (packageItem) => String(packageItem.id) === createPackageId,
  );
  const requiresIbVerification = Boolean(
    selectedCreatePackage?.code &&
      ibPackageCodes.has(selectedCreatePackage.code.trim().toUpperCase()),
  );
  const canContinueCreate =
    Boolean(selectedCreatePackage) &&
    (!requiresIbVerification || ibVerification.status === "verified");
  const editTradingAccountForm = useForm<EditTradingAccountFormValues>({
    resolver: zodResolver(editTradingAccountSchema),
    defaultValues: getEditTradingAccountDefaultValues(),
  });

  const handleDialogChange = (open: boolean) => {
    setOpenCreateDialog(open);
    setOpenCreateEndDatePicker(false);

    if (open) {
      setIbVerification(emptyIbVerification);
      createTradingAccountForm.reset(
        getTradingAccountDefaultValues(packages, expertAdvisors, servers),
      );
      return;
    }

    if (!open) {
      setMessage("");
      setIbVerification(emptyIbVerification);
      createTradingAccountForm.reset(getTradingAccountDefaultValues([], [], []));
    }
  };

  const resetIbVerification = () => {
    setIbVerification(emptyIbVerification);
  };

  const handleVerifyIbAccount = async () => {
    const accountId = createTradingAccountForm.getValues("accountId").trim();
    const packageId = Number(createTradingAccountForm.getValues("packageId"));

    if (!accountId) {
      createTradingAccountForm.setError("accountId", {
        message: "Account ID is required before verification.",
      });
      return;
    }

    createTradingAccountForm.clearErrors("accountId");
    setIbVerification(emptyIbVerification);

    try {
      const response = await verifyTradingAccountIb.mutateAsync({
        accountId,
        packageId,
      });
      const result = response?.data as
        | { verificationToken?: string; accountType?: string | null }
        | undefined;

      if (!result?.verificationToken) {
        throw new Error("Exness verification did not return a valid token.");
      }

      setIbVerification({
        status: "verified",
        token: result.verificationToken,
        message: result.accountType
          ? `Verified under the configured Exness IB. Account type: ${result.accountType}.${
              result.accountType.toLowerCase() === "standard cent"
                ? ""
                : " Please use a Standard Cent account."
            }`
          : "Verified under the configured Exness IB. Account type was not provided by Exness.",
      });
    } catch (error) {
      setIbVerification({
        status: "failed",
        token: "",
        message:
          error instanceof Error
            ? error.message
            : "Failed to verify this Exness account.",
      });
    }
  };

  const handleEditDialogChange = (open: boolean) => {
    setOpenEditDialog(open);

    if (!open) {
      setSelectedAccount(null);
      setEditMessage("");
      setOpenEndDatePicker(false);
      editTradingAccountForm.reset(getEditTradingAccountDefaultValues());
    }
  };

  const handleOpenEditDialog = (account: TradingAccountItem) => {
    setSelectedAccount(account);
    setEditMessage("");
    editTradingAccountForm.reset(getEditTradingAccountDefaultValues(account));
    setOpenEditDialog(true);
  };

  const handleTogglePasswordVisibility = (accountId: number) => {
    setVisiblePasswordIds((current) => ({
      ...current,
      [accountId]: !current[accountId],
    }));
  };

  const handleOpenConfigDialog = (account: TradingAccountItem) => {
    const latestAccount =
      tradingAccounts.find((item) => item.id === account.id) || account;

    setConfigAccount(latestAccount);
    setConfigMessage("");
    setConfigText(
      JSON.stringify(latestAccount.eaConfiguration || {}, null, 2),
    );
  };

  const handleConfigDialogChange = (open: boolean) => {
    if (!open && !updateTradingAccountConfig.isPending) {
      setConfigAccount(null);
      setConfigMessage("");
      setConfigText("");
    }
  };

  const handleSaveConfig = async () => {
    if (!configAccount) return;

    let configuration: Record<string, unknown>;
    try {
      const parsedConfig = JSON.parse(configText) as unknown;
      if (
        !parsedConfig ||
        typeof parsedConfig !== "object" ||
        Array.isArray(parsedConfig)
      ) {
        throw new Error("Configuration must be a JSON object.");
      }
      configuration = parsedConfig as Record<string, unknown>;
    } catch (error) {
      setConfigMessage(
        error instanceof Error ? error.message : "Invalid JSON configuration.",
      );
      return;
    }

    setConfigMessage("");
    try {
      const updateResponse = await updateTradingAccountConfig.mutateAsync({
        userId,
        accountId: configAccount.id,
        configuration,
      });

      const updatedAccount = updateResponse?.data as
        | Pick<
            TradingAccountItem,
            "id" | "accountId" | "eaConfiguration" | "lastSync"
          >
        | undefined;

      // Update the visible list immediately so reopening the dialog cannot use
      // the account object from before the configuration was saved.
      queryClient.setQueryData<{ data?: UserTradingAccountsResponse }>(
        ["admin-user-trading-accounts", userId],
        (current) => {
          if (!current?.data) return current;

          return {
            ...current,
            data: {
              ...current.data,
              tradingAccounts: current.data.tradingAccounts.map((account) =>
                account.id === configAccount.id
                  ? {
                      ...account,
                      eaConfiguration:
                        updatedAccount?.eaConfiguration || configuration,
                      lastSync: updatedAccount?.lastSync ?? account.lastSync,
                    }
                  : account,
              ),
            },
          };
        },
      );

      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ["admin-user-trading-accounts", userId],
          type: "active",
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-trading-accounts"] }),
      ]);

      setConfigAccount(null);
      setConfigMessage("");
      setConfigText("");
      toast.success("EA configuration updated and synced successfully.");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update EA configuration.";
      setConfigMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleCreateTradingAccount = async (
    values: TradingAccountFormValues,
  ) => {
    setMessage("");

    try {
      await createTradingAccount.mutateAsync({
        userId,
        accountId: values.accountId.trim(),
        password: values.password,
        server: values.server,
        serverId: Number(values.serverId),
        packageId: Number(values.packageId),
        expertAdvisorId: Number(values.expertAdvisorId),
        recurringPrice: values.recurringPrice.trim(),
        currency: values.currency,
        status: Number(values.status),
        endDate: values.endDate || null,
        ibVerificationToken: ibVerification.token || undefined,
      });
      handleDialogChange(false);
      toast.success("Trading account created successfully.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user-trading-accounts", userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create trading account.";
      setMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpdateTradingAccount = async (
    values: EditTradingAccountFormValues,
  ) => {
    setEditMessage("");

    if (!selectedAccount) {
      setEditMessage("No trading account selected.");
      return;
    }

    try {
      await updateTradingAccount.mutateAsync({
        userId,
        accountId: selectedAccount.id,
        loginId: values.accountId.trim(),
        password: values.password || "",
        server: values.server,
        serverId: Number(values.serverId),
        packageId: Number(values.packageId),
        expertAdvisorId: Number(values.expertAdvisorId),
        recurringPrice: values.recurringPrice.trim(),
        currency: values.currency,
        status: Number(values.status),
        endDate: values.endDate || null,
      });
      handleEditDialogChange(false);
      toast.success("Trading account updated successfully.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user-trading-accounts", userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update trading account.";
      setEditMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleRuntimeAction = async (
    account: TradingAccountItem,
    action: "deploy" | "pause" | "resume" | "terminate",
  ) => {
    setRuntimeAction({ accountId: account.id, action });

    try {
      await manageTradingAccountRuntime.mutateAsync({
        userId,
        tradingAccountId: account.id,
        action,
      });

      const successMessage =
        action === "deploy"
          ? "Deployment bot sedang diproses."
          : action === "pause"
            ? "Bot berhasil dipause."
            : action === "resume"
              ? "Bot sedang di-resume."
            : "Bot dan instance berhasil diterminate.";
      toast.success(successMessage);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user-trading-accounts", userId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-trading-accounts"],
        }),
      ]);
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

  const handleSendReadyNotification = async (
    account: TradingAccountItem,
  ) => {
    setNotifyingAccountId(account.id);

    try {
      const response = await sendReadyNotification.mutateAsync({
        userId,
        accountId: account.id,
      });
      const recipient = (response?.data as { email?: string } | undefined)
        ?.email;

      toast.success(
        recipient
          ? `Deployment notification sent to ${recipient}.`
          : "Deployment notification sent successfully.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send deployment notification.",
      );
    } finally {
      setNotifyingAccountId(null);
    }
  };

  const handleDeleteTradingAccount = async (account: TradingAccountItem) => {
    try {
      await deleteTradingAccount.mutateAsync({
        userId,
        accountId: account.id,
      });
      setDeleteAccount(null);
      toast.success("Trading account berhasil dihapus.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-user-trading-accounts", userId],
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({
          queryKey: ["admin-trading-accounts"],
        }),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Trading account gagal dihapus.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-2">
      <section className="overflow-hidden rounded-md border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-slate-50/40 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <WalletCards className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Trading Accounts
              </p>
              <h1 className="text-sm font-bold text-gray-900">
                {user ? user.name : "User Trading Accounts"}
              </h1>
              {user && <p className="text-xs text-gray-500">{user.email}</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              className="h-8 gap-2 border-gray-200 bg-white text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-700"
            >
              <Link href="/admin/users">
                <ArrowLeft className="h-4 w-4" />
                Back to Users
              </Link>
            </Button>
            <Button
              type="button"
              onClick={() => handleDialogChange(true)}
              className="h-8 gap-2 bg-blue-600 px-4 text-xs text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Trading Account
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-slate-50/30 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-20 px-5 py-3 font-semibold">No</th>
                <th className="px-5 py-3 font-semibold">Account</th>
                <th className="px-5 py-3 font-semibold">Trading Server</th>
                <th className="px-5 py-3 font-semibold">VPS Server</th>
                <th className="px-5 py-3 font-semibold">Subscription</th>
                <th className="px-5 py-3 font-semibold">Trading Password</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">End Date</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/70">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    Loading trading accounts...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-red-500"
                  >
                    {error instanceof Error
                      ? error.message
                      : "Failed to load trading accounts."}
                  </td>
                </tr>
              ) : tradingAccounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-gray-400"
                  >
                    No trading accounts found.
                  </td>
                </tr>
              ) : (
                paginatedTradingAccounts.map((account, index) => (
                  <tr key={account.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-semibold text-gray-600">
                      {(safeCurrentPage - 1) * DEFAULT_TABLE_PAGE_SIZE +
                        index +
                        1}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {account.accountName || account.accountId}
                      </p>
                      <p className="text-xs text-gray-500">
                        {account.accountId}
                      </p>
                      {account.accountBalance && (
                        <p className="text-xs text-gray-400">
                          Balance: {account.accountBalance}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {account.accountServer || "-"}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {account.server?.name || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1 text-xs text-gray-500">
                        <p>
                          <span className="font-medium text-gray-700">
                            Package:
                          </span>{" "}
                          {account.package?.name || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">EA:</span>{" "}
                          {account.expertAdvisor?.name || "-"}
                        </p>
                        <p>
                          <span className="font-medium text-gray-700">
                            Recurring:
                          </span>{" "}
                          {account.recurringPrice
                            ? `${account.currency || ""} ${account.recurringPrice}`
                            : "-"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-48 items-center gap-2">
                        <span className="min-w-0 truncate font-mono text-xs text-gray-700">
                          {account.tradingPassword
                            ? visiblePasswordIds[account.id]
                              ? account.tradingPassword
                              : "********"
                            : "-"}
                        </span>
                        {account.tradingPassword && (
                          <Button
                            type="button"
                            variant="outline"
                            title={
                              visiblePasswordIds[account.id]
                                ? "Hide password"
                                : "Show password"
                            }
                            onClick={() =>
                              handleTogglePasswordVisibility(account.id)
                            }
                            className="h-7 w-7 rounded-md border-gray-200 bg-white p-0 text-gray-600 hover:bg-gray-50 hover:text-gray-700"
                          >
                            {visiblePasswordIds[account.id] ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-24 flex-col items-start gap-1.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            getStatusMeta(account.status).className
                          }`}
                        >
                          {getStatusMeta(account.status).label}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            getEaStatusMeta(account.eaStatus).className
                          }`}
                        >
                          {getEaStatusMeta(account.eaStatus).label}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {account.endDate
                        ? new Intl.DateTimeFormat("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(account.endDate))
                        : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-56 flex-wrap gap-1.5">
                        <Button
                          type="button"
                          title="Deploy bot"
                          disabled={
                            account.status !== 1 || runtimeAction !== null
                          }
                          onClick={() =>
                            handleRuntimeAction(account, "deploy")
                          }
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
                          title={
                            account.eaStatus === 1
                              ? "Email the user that the robot is ready"
                              : "The robot must be running before notification"
                          }
                          disabled={
                            account.status !== 1 ||
                            account.eaStatus !== 1 ||
                            runtimeAction !== null ||
                            notifyingAccountId !== null
                          }
                          onClick={() =>
                            void handleSendReadyNotification(account)
                          }
                          className="h-7 gap-1 rounded-md border-cyan-200 bg-white px-2 text-xs text-cyan-700 hover:bg-cyan-50 hover:text-cyan-700"
                        >
                          {notifyingAccountId === account.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Mail className="h-3.5 w-3.5" />
                          )}
                          Notify User
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title={
                            account.eaStatus === 2 ? "Resume bot" : "Pause bot"
                          }
                          disabled={
                            runtimeAction !== null ||
                            ![1, 2].includes(account.eaStatus)
                          }
                          onClick={() =>
                            handleRuntimeAction(
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
                          title="Edit EA configuration"
                          disabled={
                            runtimeAction !== null ||
                            updateTradingAccountConfig.isPending
                          }
                          onClick={() => handleOpenConfigDialog(account)}
                          className="h-7 gap-1 rounded-md border-violet-200 bg-white px-2 text-xs text-violet-700 hover:bg-violet-50 hover:text-violet-700"
                        >
                          <Braces className="h-3.5 w-3.5" />
                          Config
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Edit trading account"
                          disabled={runtimeAction !== null}
                          onClick={() => handleOpenEditDialog(account)}
                          className="h-7 gap-1 rounded-md border-blue-200 bg-white px-2 text-xs text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          title="Delete trading account"
                          disabled={
                            runtimeAction !== null ||
                            deleteTradingAccount.isPending
                          }
                          onClick={() => setDeleteAccount(account)}
                          className="h-7 gap-1 rounded-md border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminTablePagination
          currentPage={safeCurrentPage}
          totalItems={tradingAccounts.length}
          onPageChange={setCurrentPage}
        />
      </section>

      <Dialog
        open={terminateAccount !== null}
        onOpenChange={(open) => {
          if (!open) setTerminateAccount(null);
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
            <div className="flex gap-3 rounded-md border border-red-100 bg-red-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Terminate {terminateAccount?.accountName || terminateAccount?.accountId}?
                </p>
                <p className="mt-1 text-sm leading-5 text-gray-600">
                  Bot akan dihentikan dan seluruh instance MT5 account ini akan
                  dihapus dari VPS. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTerminateAccount(null)}
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
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

      <Dialog
        open={deleteAccount !== null}
        onOpenChange={(open) => {
          if (!open && !deleteTradingAccount.isPending) setDeleteAccount(null);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-md"
        >
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Delete Trading Account</DialogTitle>
            <DialogDescription>
              Account akan dihapus dari dashboard dan runtime yang aktif akan
              diterminate terlebih dahulu.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-5">
            <div className="flex gap-3 rounded-md border border-red-100 bg-red-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Delete {deleteAccount?.accountName || deleteAccount?.accountId}?
                </p>
                <p className="mt-1 text-sm leading-5 text-gray-600">
                  Jika bot sudah dideploy, service MT5 dan instance VPS akan
                  dihentikan dan dibersihkan otomatis.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={deleteTradingAccount.isPending}
              onClick={() => setDeleteAccount(null)}
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!deleteAccount || deleteTradingAccount.isPending}
              onClick={() => {
                if (deleteAccount) void handleDeleteTradingAccount(deleteAccount);
              }}
              className="gap-2 bg-red-600 text-white hover:bg-red-700"
            >
              {deleteTradingAccount.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={configAccount !== null}
        onOpenChange={handleConfigDialogChange}
      >
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-2xl">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>EA Configuration</DialogTitle>
            <DialogDescription>
              Edit the JSON configuration for account {configAccount?.accountId}.
              Saving will also sync it to pySync.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {configMessage && (
              <div className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {configMessage}
              </div>
            )}
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Configuration JSON
              </span>
              <textarea
                value={configText}
                onChange={(event) => {
                  setConfigText(event.target.value);
                  setConfigMessage("");
                }}
                spellCheck={false}
                className="min-h-[420px] w-full resize-y rounded-md border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm leading-6 text-cyan-100 outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                placeholder={'{\n  "EnableBot": true\n}'}
              />
              <p className="text-xs text-gray-500">
                The value must be a valid JSON object. Field names are
                case-sensitive.
              </p>
            </label>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={updateTradingAccountConfig.isPending}
              onClick={() => handleConfigDialogChange(false)}
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!configAccount || updateTradingAccountConfig.isPending}
              onClick={() => void handleSaveConfig()}
              className="gap-2 bg-violet-600 text-white hover:bg-violet-700"
            >
              {updateTradingAccountConfig.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {updateTradingAccountConfig.isPending
                ? "Saving..."
                : "Save Configuration"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openCreateDialog} onOpenChange={handleDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Add Trading Account</DialogTitle>
            <DialogDescription>
              {user
                ? `Add a trading account for ${user.name}.`
                : "Add a trading account for this user."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createTradingAccountForm.handleSubmit(
              handleCreateTradingAccount,
            )}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {message && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {message}
                </div>
              )}

              <div className="space-y-5">
              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Package
                </span>
                <Controller
                  control={createTradingAccountForm.control}
                  name="packageId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        resetIbVerification();
                      }}
                    >
                      <SelectTrigger className={adminSelectTriggerClass}>
                        <SelectValue placeholder="Select package first" />
                      </SelectTrigger>
                      <SelectContent className={adminSelectContentClass}>
                        {packages.map((packageItem) => (
                          <SelectItem
                            key={packageItem.id}
                            value={String(packageItem.id)}
                            className={adminSelectItemClass}
                          >
                            {packageItem.name}
                            {packageItem.price ? ` - ${packageItem.price}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {createTradingAccountForm.formState.errors.packageId && (
                  <span className="text-xs text-red-600">
                    {createTradingAccountForm.formState.errors.packageId.message}
                  </span>
                )}
                {requiresIbVerification && (
                  <span className="block text-xs leading-5 text-amber-700">
                    This package requires an Exness account registered under
                    the configured IB.
                  </span>
                )}
              </label>

              {selectedCreatePackage && (
              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Account ID
                </span>
                <div className="flex gap-2">
                  <Input
                    {...createTradingAccountForm.register("accountId", {
                      onChange: resetIbVerification,
                    })}
                    inputMode="numeric"
                    placeholder="Enter Exness account ID"
                    className={adminInputClass}
                  />
                  {requiresIbVerification && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleVerifyIbAccount()}
                      disabled={verifyTradingAccountIb.isPending}
                      className="shrink-0 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                    >
                      {verifyTradingAccountIb.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      {verifyTradingAccountIb.isPending
                        ? "Checking..."
                        : "Verify IB"}
                    </Button>
                  )}
                </div>
                {createTradingAccountForm.formState.errors.accountId && (
                  <span className="text-xs text-red-600">
                    {createTradingAccountForm.formState.errors.accountId.message}
                  </span>
                )}
              </label>
              )}

              {requiresIbVerification && ibVerification.message && (
                <div
                  className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${
                    ibVerification.status === "verified"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {ibVerification.status === "verified" && (
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{ibVerification.message}</span>
                </div>
              )}

              {canContinueCreate && (
              <>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Password
                </span>
                <Input
                  type="password"
                  {...createTradingAccountForm.register("password")}
                  placeholder="Trading account password"
                  className={adminInputClass}
                />
                {createTradingAccountForm.formState.errors.password && (
                  <span className="text-xs text-red-600">
                    {createTradingAccountForm.formState.errors.password.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Trading Server
                </span>
                <Controller
                  control={createTradingAccountForm.control}
                  name="server"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={adminSelectTriggerClass}>
                        <SelectValue placeholder="Select trading server" />
                      </SelectTrigger>
                      <SelectContent className={adminSelectContentClass}>
                        {tradingServerOptions.map((server) => (
                          <SelectItem
                            key={server}
                            value={server}
                            className={adminSelectItemClass}
                          >
                            {server}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {createTradingAccountForm.formState.errors.server && (
                  <span className="text-xs text-red-600">
                    {createTradingAccountForm.formState.errors.server.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  VPS Server
                </span>
                <Controller
                  control={createTradingAccountForm.control}
                  name="serverId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={adminSelectTriggerClass}>
                        <SelectValue placeholder="Select VPS server" />
                      </SelectTrigger>
                      <SelectContent className={adminSelectContentClass}>
                        {servers.map((server) => (
                          <SelectItem
                            key={server.id}
                            value={String(server.id)}
                            className={adminSelectItemClass}
                          >
                            {server.name || `Server #${server.id}`} (
                            {server.tradingAccountCount} accounts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {createTradingAccountForm.formState.errors.serverId && (
                  <span className="text-xs text-red-600">
                    {createTradingAccountForm.formState.errors.serverId.message}
                  </span>
                )}
              </label>

              <div>
                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Expert Advisor
                  </span>
                  <Controller
                    control={createTradingAccountForm.control}
                    name="expertAdvisorId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={adminSelectTriggerClass}>
                          <SelectValue placeholder="Select Expert Advisor" />
                        </SelectTrigger>
                        <SelectContent className={adminSelectContentClass}>
                          {expertAdvisors.map((expertAdvisor) => (
                            <SelectItem
                              key={expertAdvisor.id}
                              value={String(expertAdvisor.id)}
                              className={adminSelectItemClass}
                            >
                              {expertAdvisor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {createTradingAccountForm.formState.errors.expertAdvisorId && (
                    <span className="text-xs text-red-600">
                      {
                        createTradingAccountForm.formState.errors
                          .expertAdvisorId.message
                      }
                    </span>
                  )}
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Recurring Price
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...createTradingAccountForm.register("recurringPrice")}
                    placeholder="0.00"
                    className={adminInputClass}
                  />
                  {createTradingAccountForm.formState.errors.recurringPrice && (
                    <span className="text-xs text-red-600">
                      {
                        createTradingAccountForm.formState.errors
                          .recurringPrice.message
                      }
                    </span>
                  )}
                </label>

                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Currency
                  </span>
                  <Controller
                    control={createTradingAccountForm.control}
                    name="currency"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={adminSelectTriggerClass}>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent className={adminSelectContentClass}>
                          {currencyOptions.map((currency) => (
                            <SelectItem
                              key={currency}
                              value={currency}
                              className={adminSelectItemClass}
                            >
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {createTradingAccountForm.formState.errors.currency && (
                    <span className="text-xs text-red-600">
                      {createTradingAccountForm.formState.errors.currency.message}
                    </span>
                  )}
                </label>
              </div>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Status
                </span>
                <Controller
                  control={createTradingAccountForm.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={adminSelectTriggerClass}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className={adminSelectContentClass}>
                        {statusOptions.map((status) => (
                          <SelectItem
                            key={status.value}
                            value={status.value}
                            className={adminSelectItemClass}
                          >
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {createTradingAccountForm.formState.errors.status && (
                  <span className="text-xs text-red-600">
                    {createTradingAccountForm.formState.errors.status.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Subscription End Date
                </span>
                <Controller
                  control={createTradingAccountForm.control}
                  name="endDate"
                  render={({ field }) => {
                    const selectedDate = parseDateInputValue(field.value);

                    return (
                      <div className="flex min-w-0 gap-2">
                        <Popover
                          open={openCreateEndDatePicker}
                          onOpenChange={setOpenCreateEndDatePicker}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={`h-9 min-w-0 flex-1 justify-start gap-2 rounded-md border-slate-200 bg-white text-left text-sm font-normal text-gray-900 shadow-none focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100 ${
                                field.value ? "" : "text-gray-400"
                              }`}
                            >
                              <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                              <span className="min-w-0 truncate">
                                {selectedDate
                                  ? format(selectedDate, "dd MMM yyyy")
                                  : "Select end date"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="z-[100] w-auto border-slate-200 bg-white p-0 text-gray-900"
                          >
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                field.onChange(
                                  date ? formatDateInputValue(date) : "",
                                );
                                if (date) setOpenCreateEndDatePicker(false);
                              }}
                              captionLayout="dropdown"
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => field.onChange("")}
                          className="h-9 shrink-0 border-gray-300 bg-white px-3 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                        >
                          Clear
                        </Button>
                      </div>
                    );
                  }}
                />
                {createTradingAccountForm.formState.errors.endDate && (
                  <span className="text-xs text-red-600">
                    {createTradingAccountForm.formState.errors.endDate.message}
                  </span>
                )}
              </label>

              </>
              )}

              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !canContinueCreate ||
                    createTradingAccount.isPending ||
                    createTradingAccountForm.formState.isSubmitting
                  }
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {createTradingAccount.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {createTradingAccount.isPending
                    ? "Saving..."
                    : "Add Account"}
                </Button>
              </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditDialog} onOpenChange={handleEditDialogChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 text-gray-900 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <DialogTitle>Edit Trading Account</DialogTitle>
            <DialogDescription>
              Update account details and status.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={editTradingAccountForm.handleSubmit(
              handleUpdateTradingAccount,
            )}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {editMessage && (
                <div className="mb-5 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {editMessage}
                </div>
              )}

              <div className="space-y-5">
              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Account ID
                </span>
                <Input
                  {...editTradingAccountForm.register("accountId")}
                  placeholder="Enter account ID"
                  className={adminInputClass}
                />
                {editTradingAccountForm.formState.errors.accountId && (
                  <span className="text-xs text-red-600">
                    {editTradingAccountForm.formState.errors.accountId.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Password
                </span>
                <Input
                  type="password"
                  {...editTradingAccountForm.register("password")}
                  placeholder="Leave blank to keep current password"
                  className={adminInputClass}
                />
                {editTradingAccountForm.formState.errors.password && (
                  <span className="text-xs text-red-600">
                    {editTradingAccountForm.formState.errors.password.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Trading Server
                </span>
                <Controller
                  control={editTradingAccountForm.control}
                  name="server"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={adminSelectTriggerClass}>
                        <SelectValue placeholder="Select trading server" />
                      </SelectTrigger>
                      <SelectContent className={adminSelectContentClass}>
                        {tradingServerOptions.map((server) => (
                          <SelectItem
                            key={server}
                            value={server}
                            className={adminSelectItemClass}
                          >
                            {server}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {editTradingAccountForm.formState.errors.server && (
                  <span className="text-xs text-red-600">
                    {editTradingAccountForm.formState.errors.server.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  VPS Server
                </span>
                <Controller
                  control={editTradingAccountForm.control}
                  name="serverId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={adminSelectTriggerClass}>
                        <SelectValue placeholder="Select VPS server" />
                      </SelectTrigger>
                      <SelectContent className={adminSelectContentClass}>
                        {servers.map((server) => (
                          <SelectItem
                            key={server.id}
                            value={String(server.id)}
                            className={adminSelectItemClass}
                          >
                            {server.name || `Server #${server.id}`} (
                            {server.tradingAccountCount} accounts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {editTradingAccountForm.formState.errors.serverId && (
                  <span className="text-xs text-red-600">
                    {editTradingAccountForm.formState.errors.serverId.message}
                  </span>
                )}
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Package
                  </span>
                  <Controller
                    control={editTradingAccountForm.control}
                    name="packageId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={adminSelectTriggerClass}>
                          <SelectValue placeholder="Select package" />
                        </SelectTrigger>
                        <SelectContent className={adminSelectContentClass}>
                          {packages.map((packageItem) => (
                            <SelectItem
                              key={packageItem.id}
                              value={String(packageItem.id)}
                              className={adminSelectItemClass}
                            >
                              {packageItem.name}
                              {packageItem.price
                                ? ` - ${packageItem.price}`
                                : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editTradingAccountForm.formState.errors.packageId && (
                    <span className="text-xs text-red-600">
                      {
                        editTradingAccountForm.formState.errors.packageId
                          .message
                      }
                    </span>
                  )}
                </label>

                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Expert Advisor
                  </span>
                  <Controller
                    control={editTradingAccountForm.control}
                    name="expertAdvisorId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={adminSelectTriggerClass}>
                          <SelectValue placeholder="Select Expert Advisor" />
                        </SelectTrigger>
                        <SelectContent className={adminSelectContentClass}>
                          {expertAdvisors.map((expertAdvisor) => (
                            <SelectItem
                              key={expertAdvisor.id}
                              value={String(expertAdvisor.id)}
                              className={adminSelectItemClass}
                            >
                              {expertAdvisor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editTradingAccountForm.formState.errors.expertAdvisorId && (
                    <span className="text-xs text-red-600">
                      {
                        editTradingAccountForm.formState.errors.expertAdvisorId
                          .message
                      }
                    </span>
                  )}
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Recurring Price
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...editTradingAccountForm.register("recurringPrice")}
                    placeholder="0.00"
                    className={adminInputClass}
                  />
                  {editTradingAccountForm.formState.errors.recurringPrice && (
                    <span className="text-xs text-red-600">
                      {
                        editTradingAccountForm.formState.errors.recurringPrice
                          .message
                      }
                    </span>
                  )}
                </label>

                <label className="block space-y-2.5">
                  <span className="text-sm font-medium text-gray-700">
                    Currency
                  </span>
                  <Controller
                    control={editTradingAccountForm.control}
                    name="currency"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={adminSelectTriggerClass}>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent className={adminSelectContentClass}>
                          {currencyOptions.map((currency) => (
                            <SelectItem
                              key={currency}
                              value={currency}
                              className={adminSelectItemClass}
                            >
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editTradingAccountForm.formState.errors.currency && (
                    <span className="text-xs text-red-600">
                      {editTradingAccountForm.formState.errors.currency.message}
                    </span>
                  )}
                </label>
              </div>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Status
                </span>
                <Controller
                  control={editTradingAccountForm.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={adminSelectTriggerClass}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className={adminSelectContentClass}>
                        {statusOptions.map((status) => (
                          <SelectItem
                            key={status.value}
                            value={status.value}
                            className={adminSelectItemClass}
                          >
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {editTradingAccountForm.formState.errors.status && (
                  <span className="text-xs text-red-600">
                    {editTradingAccountForm.formState.errors.status.message}
                  </span>
                )}
              </label>

              <label className="block space-y-2.5">
                <span className="text-sm font-medium text-gray-700">
                  Subscription End Date
                </span>
                <Controller
                  control={editTradingAccountForm.control}
                  name="endDate"
                  render={({ field }) => {
                    const selectedDate = parseDateInputValue(field.value);

                    return (
                      <div className="flex min-w-0 gap-2">
                        <Popover
                          open={openEndDatePicker}
                          onOpenChange={setOpenEndDatePicker}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={`h-9 min-w-0 flex-1 justify-start gap-2 rounded-md border-slate-200 bg-white text-left text-sm font-normal text-gray-900 shadow-none focus-visible:border-blue-300 focus-visible:ring-3 focus-visible:ring-blue-100 ${
                                field.value ? "" : "text-gray-400"
                              }`}
                            >
                              <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
                              <span className="min-w-0 truncate">
                                {selectedDate
                                  ? format(selectedDate, "dd MMM yyyy")
                                  : "Select end date"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="z-[100] w-auto border-slate-200 bg-white p-0 text-gray-900"
                          >
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                field.onChange(
                                  date ? formatDateInputValue(date) : "",
                                );
                                if (date) {
                                  setOpenEndDatePicker(false);
                                }
                              }}
                              captionLayout="dropdown"
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => field.onChange("")}
                          className="h-9 shrink-0 border-gray-300 bg-white px-3 text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                        >
                          Clear
                        </Button>
                      </div>
                    );
                  }}
                />
                {editTradingAccountForm.formState.errors.endDate && (
                  <span className="text-xs text-red-600">
                    {editTradingAccountForm.formState.errors.endDate.message}
                  </span>
                )}
              </label>

              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleEditDialogChange(false)}
                  className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updateTradingAccount.isPending ||
                    editTradingAccountForm.formState.isSubmitting
                  }
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {updateTradingAccount.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {updateTradingAccount.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
