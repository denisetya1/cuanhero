import { handleRes } from "@/lib/response";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AdminCmsPage = {
  id: number;
  slug: string;
  titleEn: string;
  titleId: string;
  contentEn: string;
  contentId: string;
  metaTitleEn: string;
  metaTitleId: string;
  metaDescriptionEn: string;
  metaDescriptionId: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminCmsPagePayload = Omit<
  AdminCmsPage,
  "id" | "publishedAt" | "createdAt" | "updatedAt"
>;

export const useGetAdminPages = () =>
  useQuery({
    queryKey: ["admin-pages"],
    queryFn: () => fetch("/api/admin/pages").then(handleRes),
  });

export const useCreateAdminPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminCmsPagePayload) =>
      fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(handleRes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pages"] }),
  });
};

export const useUpdateAdminPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, ...payload }: AdminCmsPagePayload & { pageId: number }) =>
      fetch(`/api/admin/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(handleRes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pages"] }),
  });
};

export const useDeleteAdminPage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: number) =>
      fetch(`/api/admin/pages/${pageId}`, { method: "DELETE" }).then(handleRes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-pages"] }),
  });
};

