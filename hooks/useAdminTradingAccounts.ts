import { useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export const useGetAdminTradingAccounts = () => useQuery({
  queryKey: ["admin-trading-accounts"],
  queryFn: () => fetch("/api/admin/trading-accounts").then(handleRes),
  refetchInterval: 30_000,
  refetchIntervalInBackground: true,
});
