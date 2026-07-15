import { useMutation, useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export type AdminExpertAdvisorPayload = {
  name: string;
  eaFileName?: string;
  defaultConfig?: Record<string, unknown> | null;
  description?: Record<string, string> | null;
  image?: string;
  isActive?: boolean;
  orderNumber: number;
};

export type AdminUpdateExpertAdvisorPayload = AdminExpertAdvisorPayload & {
  expertAdvisorId: number;
};

export const useGetAdminExpertAdvisors = () => {
  return useQuery({
    queryKey: ["admin-expert-advisors"],
    queryFn: () => fetch("/api/admin/expert-advisors").then(handleRes),
  });
};

export const useCreateAdminExpertAdvisor = () => {
  return useMutation({
    mutationKey: ["create-admin-expert-advisor"],
    mutationFn: async (payload: AdminExpertAdvisorPayload) => {
      return fetch("/api/admin/expert-advisors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useUpdateAdminExpertAdvisor = () => {
  return useMutation({
    mutationKey: ["update-admin-expert-advisor"],
    mutationFn: async ({
      expertAdvisorId,
      ...payload
    }: AdminUpdateExpertAdvisorPayload) => {
      return fetch(`/api/admin/expert-advisors/${expertAdvisorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).then(handleRes);
    },
  });
};

export const useDeleteAdminExpertAdvisor = () => {
  return useMutation({
    mutationKey: ["delete-admin-expert-advisor"],
    mutationFn: async (expertAdvisorId: number) => {
      return fetch(`/api/admin/expert-advisors/${expertAdvisorId}`, {
        method: "DELETE",
      }).then(handleRes);
    },
  });
};
