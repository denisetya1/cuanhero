import { useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export type RuntimeHealthIssueFilters = {
  page: number;
  pageSize: number;
  search: string;
  status: "all" | "active" | "resolved";
  reason: "all" | "NOT_REGISTERED" | "WRONG_SERVER";
  serverId: string;
};

export const useGetAdminRuntimeHealthIssues = (
  filters: RuntimeHealthIssueFilters,
) => {
  return useQuery({
    queryKey: ["admin-runtime-health-issues", filters],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        pageSize: String(filters.pageSize),
        status: filters.status,
        reason: filters.reason,
      });

      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.serverId !== "all") {
        params.set("serverId", filters.serverId);
      }

      return fetch(`/api/admin/runtime-health-issues?${params}`).then(
        handleRes,
      );
    },
    refetchInterval: 60_000,
  });
};
