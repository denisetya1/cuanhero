"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetTradingAccounts } from "@/hooks/useTradingAccounts";
import { TradingAccountStore } from "@/stores/traddingAccount";
import { useEffect, useMemo } from "react";

type TradingAccountOption = {
  id: number;
  accountId: string;
  accountName?: string | null;
  accountServer?: string | null;
};

const AccountSwitcher = () => {
  const { data } = useGetTradingAccounts();
  const { tradingAccount, setTradingAccount } = TradingAccountStore();
  const tradingAccounts: TradingAccountOption[] = useMemo(
    () => data?.data || [],
    [data?.data],
  );

  useEffect(() => {
    if (!tradingAccount && tradingAccounts.length > 0) {
      setTradingAccount(tradingAccounts[0] as never);
    }
  }, [setTradingAccount, tradingAccount, tradingAccounts]);

  return (
    <div className="p-10 border border-ch-border rounded-lg flex justify-baseline items-center gap-10">
      <label>Select Trading Account</label>{" "}
      <Select
        value={tradingAccount?.accountId}
        onValueChange={(accountId) => {
          const account = tradingAccounts.find(
            (item) => item.accountId === accountId,
          );
          if (account) {
            setTradingAccount(account as never);
          }
        }}
      >
        <SelectTrigger className="w-full max-w-48">
          <SelectValue placeholder="Select Trading Account" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Trading Account</SelectLabel>
            {tradingAccounts.map((d: TradingAccountOption) => (
              <SelectItem key={d.id} value={`${d.accountId}`}>
                {d.accountId} -{" "}
                {d.accountName ? d.accountName : d.accountServer}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default AccountSwitcher;
