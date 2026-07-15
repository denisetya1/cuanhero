import { TradingAccount } from "@/lib/generated/prisma/client";
import { create } from "zustand";

// Define types for state & actions
interface TradingAccountStore {
  tradingAccount: TradingAccount | null;
  setTradingAccount: (tradingAccount: TradingAccount) => void;
}

export const TradingAccountStore = create<TradingAccountStore>((set) => ({
  tradingAccount: null,
  setTradingAccount: (tradingAccount: TradingAccount) =>
    set({ tradingAccount: tradingAccount }),
}));
