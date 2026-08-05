import { useMutation, useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export type AdminUserPayload = {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role: string;
  status: number;
};

export type AdminUpdateUserPayload = Omit<AdminUserPayload, "password"> & {
  userId: string;
};

export type AdminTradingAccountPayload = {
  userId: string;
  accountId: string;
  password: string;
  server: string;
  accountType: "STANDARD" | "CENT";
  serverId: number;
  packageId: number;
  expertAdvisorId: number;
  recurringPrice: string;
  currency: string;
  status: number;
  endDate?: string | null;
  ibVerificationToken?: string;
};

export type AdminIbVerificationPayload = {
  accountId: string;
  packageId: number;
};

export type AdminUpdateTradingAccountPayload = Omit<
  AdminTradingAccountPayload,
  "userId" | "accountId"
> & {
  accountId: number;
  loginId: string;
  status: number;
  endDate?: string | null;
};

export type AdminTradingAccountRuntimePayload = {
  userId: string;
  tradingAccountId: number;
  action:
    | "deploy"
    | "pause"
    | "resume"
    | "restart"
    | "terminate"
    | "health";
};

export type AdminTradingAccountConfigPayload = {
  userId: string;
  accountId: number;
  configuration: Record<string, unknown>;
};

export type AdminTradingAccountReadyNotificationPayload = {
  userId: string;
  accountId: number;
};

export const useGetAdminUsers = () => {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users").then(handleRes),
  });
};

export const useGetAdminUserTradingAccounts = (userId: string) => {
  return useQuery({
    queryKey: ["admin-user-trading-accounts", userId],
    queryFn: () =>
      fetch(`/api/admin/users/${userId}/trading-accounts`).then(handleRes),
    enabled: Boolean(userId),
  });
};

export const useGetAdminTradingAccountOptions = () => {
  return useQuery({
    queryKey: ["admin-trading-account-options"],
    queryFn: () => fetch("/api/admin/trading-account-options").then(handleRes),
  });
};

export const useCreateAdminTradingAccount = () => {
  return useMutation({
    mutationKey: ["create-admin-trading-account"],
    mutationFn: async (payload: AdminTradingAccountPayload) => {
      return fetch(
        `/api/admin/users/${payload.userId}/trading-accounts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountId: payload.accountId,
            password: payload.password,
            server: payload.server,
            accountType: payload.accountType,
            serverId: payload.serverId,
            packageId: payload.packageId,
            expertAdvisorId: payload.expertAdvisorId,
            recurringPrice: payload.recurringPrice,
            currency: payload.currency,
            status: payload.status,
            endDate: payload.endDate,
            ibVerificationToken: payload.ibVerificationToken,
          }),
        },
      ).then(handleRes);
    },
  });
};

export const useVerifyAdminTradingAccountIb = () => {
  return useMutation({
    mutationKey: ["verify-admin-trading-account-ib"],
    mutationFn: async (payload: AdminIbVerificationPayload) => {
      return fetch("/api/admin/trading-accounts/verify-ib", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useSendAdminTradingAccountReadyNotification = () => {
  return useMutation({
    mutationKey: ["send-admin-trading-account-ready-notification"],
    mutationFn: async ({
      userId,
      accountId,
    }: AdminTradingAccountReadyNotificationPayload) => {
      return fetch(
        `/api/admin/users/${userId}/trading-accounts/ready-notification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId }),
        },
      ).then(handleRes);
    },
  });
};

export const useUpdateAdminTradingAccount = () => {
  return useMutation({
    mutationKey: ["update-admin-trading-account"],
    mutationFn: async ({
      userId,
      accountId,
      ...payload
    }: AdminUpdateTradingAccountPayload & { userId: string }) => {
      return fetch(`/api/admin/users/${userId}/trading-accounts`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          ...payload,
        }),
      }).then(handleRes);
    },
  });
};

export const useUpdateAdminTradingAccountConfig = () => {
  return useMutation({
    mutationKey: ["update-admin-trading-account-config"],
    mutationFn: async ({
      userId,
      accountId,
      configuration,
    }: AdminTradingAccountConfigPayload) => {
      return fetch(`/api/admin/users/${userId}/trading-accounts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-config",
          accountId,
          configuration,
        }),
      }).then(handleRes);
    },
  });
};

export const useDeleteAdminTradingAccount = () => {
  return useMutation({
    mutationKey: ["delete-admin-trading-account"],
    mutationFn: async ({
      userId,
      accountId,
    }: {
      userId: string;
      accountId: number;
    }) => {
      return fetch(`/api/admin/users/${userId}/trading-accounts`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId }),
      }).then(handleRes);
    },
  });
};

export const useManageAdminTradingAccountRuntime = () => {
  return useMutation({
    mutationKey: ["manage-admin-trading-account-runtime"],
    mutationFn: async ({
      userId,
      ...payload
    }: AdminTradingAccountRuntimePayload) => {
      return fetch(
        `/api/admin/users/${userId}/trading-accounts/runtime`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      ).then(handleRes);
    },
  });
};

export const useUpdateAdminUser = () => {
  return useMutation({
    mutationKey: ["update-admin-user"],
    mutationFn: async ({ userId, ...payload }: AdminUpdateUserPayload) => {
      return fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useDeleteAdminUser = () => {
  return useMutation({
    mutationKey: ["delete-admin-user"],
    mutationFn: async (userId: string) => {
      return fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      }).then(handleRes);
    },
  });
};

export const useCreateAdminUser = () => {
  return useMutation({
    mutationKey: ["create-admin-user"],
    mutationFn: async (payload: AdminUserPayload) => {
      return fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};
