import { useMutation, useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export type AdminServerPayload = {
  name: string;
  ipAddress: string;
  status: number;
  maxAccounts: number;
  orderNumber: number;
};

export type AdminUpdateServerPayload = AdminServerPayload & {
  serverId: number;
};

export const useGetAdminServers = () => {
  return useQuery({
    queryKey: ["admin-servers"],
    queryFn: () => fetch("/api/admin/servers").then(handleRes),
  });
};

export const useCreateAdminServer = () => {
  return useMutation({
    mutationKey: ["create-admin-server"],
    mutationFn: async (payload: AdminServerPayload) => {
      return fetch("/api/admin/servers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useUpdateAdminServer = () => {
  return useMutation({
    mutationKey: ["update-admin-server"],
    mutationFn: async ({ serverId, ...payload }: AdminUpdateServerPayload) => {
      return fetch(`/api/admin/servers/${serverId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useDeleteAdminServer = () => {
  return useMutation({
    mutationKey: ["delete-admin-server"],
    mutationFn: async (serverId: number) => {
      return fetch(`/api/admin/servers/${serverId}`, {
        method: "DELETE",
      }).then(handleRes);
    },
  });
};

export const useCheckAdminServerHealth = () => {
  return useMutation({
    mutationKey: ["check-admin-server-health"],
    mutationFn: async (serverId: number) => {
      return fetch(`/api/admin/servers/${serverId}/health`, {
        method: "POST",
      }).then(handleRes);
    },
  });
};
