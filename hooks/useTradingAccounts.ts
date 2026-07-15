import { useQuery } from "@tanstack/react-query";
import { handleRes } from "@/lib/response";

export const useGetTradingAccounts = () => {
  return useQuery({
    queryKey: ["trading-accounts"],
    queryFn: () => {
      return fetch("/api/member/trading-accounts").then(handleRes);
    },
  });
};
