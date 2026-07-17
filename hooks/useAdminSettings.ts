import { useMutation, useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export type AdminSettingsPayload = {
  whatsappNumber: string;
  metaTitleEn: string;
  metaTitleId: string;
  metaDescriptionEn: string;
  metaDescriptionId: string;
  orderMessageEn: string;
  orderMessageId: string;
  freeTrialMessageEn: string;
  freeTrialMessageId: string;
  renewalMessageEn: string;
  renewalMessageId: string;
  consultationMessageEn: string;
  consultationMessageId: string;
};

export const useGetAdminSettings = () => {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetch("/api/admin/settings").then(handleRes),
  });
};

export const useUpdateAdminSettings = () => {
  return useMutation({
    mutationKey: ["update-admin-settings"],
    mutationFn: (payload: Partial<AdminSettingsPayload>) =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(handleRes),
  });
};
