import { useMutation, useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export type AdminPackagePayload = {
  code?: string | null;
  name: string;
  description?: Record<string, string> | null;
  features?: unknown;
  price: string;
  discountPercent?: number | null;
  recurringType: string;
  orderNumber: number;
};

export type AdminUpdatePackagePayload = AdminPackagePayload & {
  packageId: number;
};

export const useGetAdminPackages = () => {
  return useQuery({
    queryKey: ["admin-packages"],
    queryFn: () => fetch("/api/admin/packages").then(handleRes),
  });
};

export const useCreateAdminPackage = () => {
  return useMutation({
    mutationKey: ["create-admin-package"],
    mutationFn: async (payload: AdminPackagePayload) => {
      return fetch("/api/admin/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useUpdateAdminPackage = () => {
  return useMutation({
    mutationKey: ["update-admin-package"],
    mutationFn: async ({ packageId, ...payload }: AdminUpdatePackagePayload) => {
      return fetch(`/api/admin/packages/${packageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useDeleteAdminPackage = () => {
  return useMutation({
    mutationKey: ["delete-admin-package"],
    mutationFn: async (packageId: number) => {
      return fetch(`/api/admin/packages/${packageId}`, {
        method: "DELETE",
      }).then(handleRes);
    },
  });
};
