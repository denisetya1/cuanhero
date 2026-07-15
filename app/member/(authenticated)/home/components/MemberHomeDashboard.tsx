"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
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
import { handleRes } from "@/lib/response";
import { TradingAccountStore } from "@/stores/traddingAccount";

type EAConfiguration = {
  EnableBot: boolean;
  StartLot: string;
  LayerDistancePoint: string;
  UseTrailingTP: boolean;
  TrailingTPStartPoint: string;
  TrailingDistancePoint: string;
  StopLossUSD: string;
  DailyProfitTargetUSD: string;
  RSIPeriod: string;
  Oversold: string;
  Overbought: string;
  StartTime: string;
  EndTime: string;
  EnablePauseTime: boolean;
  PauseStartTime: string;
  PauseEndTime: string;
  LayersPerBatch: string;
  MaxLayerCount: string;
  RefillPendingThreshold: string;
  RefillLayerCount: string;
  RestMinutesAfterCutLoss: string;
  EnableBuy: boolean;
  EnableSell: boolean;
  EnableNewsFilter: boolean;
  MinutesStopBeforeNewsFilter: string;
  MinutesStartAfterNewsFilter: string;
  BuyMagic: string;
  SellMagic: string;
  SlippagePoints: string;
};

type StoredEAConfiguration = Record<string, unknown>;

type TradingAccount = {
  id: number;
  accountId: string;
  accountName?: string | null;
  accountBalance?: string | null;
  accountServer?: string | null;
  eaConfiguration?: StoredEAConfiguration | null;
  status: number;
  eaStatus: number;
  lastSync?: string | Date | null;
  endDate?: string | Date | null;
  package?: {
    name?: string | null;
  } | null;
  expertAdvisor?: {
    name?: string | null;
  } | null;
};

const cardClass =
  "relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[linear-gradient(145deg,rgba(7,18,37,0.92),rgba(4,8,20,0.96))] p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08),0_18px_55px_rgba(0,0,0,0.55)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-cyan-300/80 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_top_right,rgba(0,217,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_30%)]";

const sectionContentClass = "relative z-10";

const inputClass =
  "h-11 border-cyan-400/20 bg-black/35 text-cyan-50 shadow-inner shadow-cyan-950/40 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30";

const fieldPanelClass =
  "rounded-xl border border-cyan-400/20 bg-black/25 p-4 shadow-inner shadow-black/30";

const getStatusText = (status?: number) => {
  if (status === 1) return "Active";
  if (status === 2) return "Pending";
  if (status === 3) return "Suspended";
  return "Not active";
};

const getBotStatus = (status?: number) => {
  if (status === 1) {
    return {
      label: "RUNNING",
      detail:
        "The EA is running and ready to execute the active configuration.",
      dotClass: "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]",
      textClass: "text-emerald-300",
    };
  }

  if (status === 2) {
    return {
      label: "PAUSED",
      detail: "The EA is paused and automation is temporarily disabled.",
      dotClass: "bg-orange-400 shadow-[0_0_14px_rgba(251,146,60,0.85)]",
      textClass: "text-orange-300",
    };
  }

  if (status === 4) {
    return {
      label: "TERMINATED",
      detail: "The EA instance has been stopped and removed from the server.",
      dotClass: "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)]",
      textClass: "text-red-300",
    };
  }

  if (status === 3) {
    return {
      label: "OFFLINE",
      detail: "The EA runtime was not detected on the server. Contact support.",
      dotClass: "bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.8)]",
      textClass: "text-red-300",
    };
  }

  return {
    label: "NOT SET UP",
    detail:
      "The EA has not been set up. Check the trading account and configuration.",
    dotClass: "bg-slate-500 shadow-[0_0_12px_rgba(100,116,139,0.65)]",
    textClass: "text-slate-300",
  };
};

const formatDate = (value?: string | Date | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatDateOnly = (value?: string | Date | null) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const shiftTimeByHours = (value: string, offsetHours: number) => {
  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) return value;

  const shiftedHours = (hours + offsetHours + 24) % 24;
  return `${String(shiftedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const utcToGmt7 = (value: string) => shiftTimeByHours(value, 7);
const gmt7ToUtc = (value: string) => shiftTimeByHours(value, -7);

const parseConfig = (value?: StoredEAConfiguration | null) => {
  const defaultConfig: EAConfiguration = {
    EnableBot: false,
    StartLot: "0.01",
    LayerDistancePoint: "250",
    UseTrailingTP: false,
    TrailingTPStartPoint: "1500",
    TrailingDistancePoint: "50",
    StopLossUSD: "0",
    DailyProfitTargetUSD: "0",
    RSIPeriod: "3",
    Oversold: "50",
    Overbought: "49",
    StartTime: "00:30:00",
    EndTime: "21:30:00",
    EnablePauseTime: false,
    PauseStartTime: "05:00:00",
    PauseEndTime: "07:00:00",
    LayersPerBatch: "30",
    MaxLayerCount: "5000",
    RefillPendingThreshold: "20",
    RefillLayerCount: "10",
    RestMinutesAfterCutLoss: "120",
    EnableBuy: true,
    EnableSell: true,
    EnableNewsFilter: false,
    MinutesStopBeforeNewsFilter: "60",
    MinutesStartAfterNewsFilter: "60",
    BuyMagic: "1001",
    SellMagic: "1002",
    SlippagePoints: "30",
  };

  if (!value) return defaultConfig;

  const usesUtcSchedule = value.TimeZone === "UTC";

  const legacyTradingTime =
    value.tradingTime && typeof value.tradingTime === "object"
      ? (value.tradingTime as Record<string, unknown>)
      : {};
  const legacySchedulePause =
    value.schedulePause && typeof value.schedulePause === "object"
      ? (value.schedulePause as Record<string, unknown>)
      : {};
  const readString = (key: keyof EAConfiguration, legacy?: unknown) => {
    const current = value[key];
    if (typeof current === "string" || typeof current === "number") {
      return String(current);
    }
    if (typeof legacy === "string" || typeof legacy === "number") {
      return String(legacy);
    }
    return defaultConfig[key] as string;
  };
  const readBoolean = (key: keyof EAConfiguration, legacy?: unknown) => {
    const current = value[key];
    if (typeof current === "boolean") return current;
    if (typeof legacy === "boolean") return legacy;
    return defaultConfig[key] as boolean;
  };
  const readScheduleTime = (key: keyof EAConfiguration, legacy?: unknown) => {
    const storedTime = readString(key, legacy);
    return usesUtcSchedule ? utcToGmt7(storedTime) : storedTime;
  };

  return {
    EnableBot: readBoolean("EnableBot"),
    StartLot: readString("StartLot", value.startLotSize),
    LayerDistancePoint: readString("LayerDistancePoint"),
    UseTrailingTP: readBoolean("UseTrailingTP", value.useTrailingStop),
    TrailingTPStartPoint: readString(
      "TrailingTPStartPoint",
      value.tpTrailingStartPoint,
    ),
    TrailingDistancePoint: readString(
      "TrailingDistancePoint",
      value.trailingDistancePoint,
    ),
    StopLossUSD: readString("StopLossUSD", value.autoCutLossUsc),
    DailyProfitTargetUSD: readString(
      "DailyProfitTargetUSD",
      value.dailyTargetProfit,
    ),
    RSIPeriod: readString("RSIPeriod", value.rsiPeriod),
    Oversold: readString("Oversold", value.rsiOversold),
    Overbought: readString("Overbought", value.rsiOverbought),
    StartTime: readScheduleTime("StartTime", legacyTradingTime.start),
    EndTime: readScheduleTime("EndTime", legacyTradingTime.end),
    EnablePauseTime: readBoolean(
      "EnablePauseTime",
      legacySchedulePause.enabled,
    ),
    PauseStartTime: readScheduleTime(
      "PauseStartTime",
      legacySchedulePause.start,
    ),
    PauseEndTime: readScheduleTime("PauseEndTime", legacySchedulePause.end),
    LayersPerBatch: readString("LayersPerBatch"),
    MaxLayerCount: readString("MaxLayerCount"),
    RefillPendingThreshold: readString("RefillPendingThreshold"),
    RefillLayerCount: readString("RefillLayerCount"),
    RestMinutesAfterCutLoss: readString("RestMinutesAfterCutLoss"),
    EnableBuy: readBoolean("EnableBuy"),
    EnableSell: readBoolean("EnableSell"),
    EnableNewsFilter: readBoolean("EnableNewsFilter"),
    MinutesStopBeforeNewsFilter: readString("MinutesStopBeforeNewsFilter"),
    MinutesStartAfterNewsFilter: readString("MinutesStartAfterNewsFilter"),
    BuyMagic: readString("BuyMagic"),
    SellMagic: readString("SellMagic"),
    SlippagePoints: readString("SlippagePoints"),
  };
};

const requiredNumber = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine(
      (value) => Number.isFinite(Number(value)),
      `${label} must be a number.`,
    );

const normalizeTime = (value: string) =>
  /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;

const memberConfigSchema = z.object({
  EnableBot: z.boolean(),
  StartLot: requiredNumber("Start Lot"),
  LayerDistancePoint: requiredNumber("Layer Distance Point"),
  UseTrailingTP: z.boolean(),
  TrailingTPStartPoint: requiredNumber("Trailing TP Start Point"),
  TrailingDistancePoint: requiredNumber("Trailing Distance Point"),
  StopLossUSD: requiredNumber("Stop Loss USD"),
  DailyProfitTargetUSD: requiredNumber("Daily Profit Target USD"),
  RSIPeriod: requiredNumber("RSI Period"),
  Oversold: requiredNumber("Oversold"),
  Overbought: requiredNumber("Overbought"),
  StartTime: z.string().trim().min(1, "Start Time is required."),
  EndTime: z.string().trim().min(1, "End Time is required."),
  EnablePauseTime: z.boolean(),
  PauseStartTime: z.string().trim().min(1, "Pause Start Time is required."),
  PauseEndTime: z.string().trim().min(1, "Pause End Time is required."),
  LayersPerBatch: requiredNumber("Layers Per Batch"),
  MaxLayerCount: requiredNumber("Max Layer Count"),
  RefillPendingThreshold: requiredNumber("Refill Pending Threshold"),
  RefillLayerCount: requiredNumber("Refill Layer Count"),
  RestMinutesAfterCutLoss: requiredNumber("Rest Minutes After Cut Loss"),
  EnableBuy: z.boolean(),
  EnableSell: z.boolean(),
  EnableNewsFilter: z.boolean(),
  MinutesStopBeforeNewsFilter: requiredNumber("Pause Before High-Impact News"),
  MinutesStartAfterNewsFilter: requiredNumber("Resume After High-Impact News"),
  BuyMagic: requiredNumber("Buy Magic"),
  SellMagic: requiredNumber("Sell Magic"),
  SlippagePoints: requiredNumber("Slippage Points"),
});

type MemberConfigFormValues = z.infer<typeof memberConfigSchema>;
type ConfigFieldName = keyof MemberConfigFormValues;

const configFieldMeta: Record<
  ConfigFieldName,
  {
    label: string;
    type: "switch" | "number" | "time";
    step?: string;
    suffix?: string;
    disabled?: boolean;
  }
> = {
  EnableBot: { label: "Enable Bot", type: "switch" },
  StartLot: { label: "Start Lot", type: "number", step: "0.01" },
  LayerDistancePoint: { label: "Layer Distance Pt.", type: "number" },
  UseTrailingTP: { label: "Use Trailing TP", type: "switch" },
  TrailingTPStartPoint: {
    label: "Trailing TP Start Pt.",
    type: "number",
  },
  TrailingDistancePoint: {
    label: "Trailing Distance Pt.",
    type: "number",
  },
  StopLossUSD: {
    label: "Stop Loss",
    type: "number",
    step: "0.01",
    suffix: "USC",
  },
  DailyProfitTargetUSD: {
    label: "Daily Profit Target",
    type: "number",
    step: "0.01",
    suffix: "USC",
  },
  RSIPeriod: { label: "RSI Period", type: "number" },
  Oversold: { label: "Oversold", type: "number", step: "0.01" },
  Overbought: { label: "Overbought", type: "number", step: "0.01" },
  StartTime: { label: "Start Time", type: "time", suffix: "GMT+7" },
  EndTime: { label: "End Time", type: "time", suffix: "GMT+7" },
  EnablePauseTime: { label: "Enable Pause Time", type: "switch" },
  PauseStartTime: {
    label: "Pause Start Time",
    type: "time",
    suffix: "GMT+7",
  },
  PauseEndTime: {
    label: "Pause End Time",
    type: "time",
    suffix: "GMT+7",
  },
  LayersPerBatch: { label: "Layers Per Batch", type: "number" },
  MaxLayerCount: { label: "Max Layer Count", type: "number" },
  RefillPendingThreshold: {
    label: "Refill Pending Min.",
    type: "number",
  },
  RefillLayerCount: { label: "Refill Layer Count", type: "number" },
  RestMinutesAfterCutLoss: {
    label: "Rest Minutes After Cut Loss",
    type: "number",
  },
  EnableBuy: { label: "Enable Buy", type: "switch" },
  EnableSell: { label: "Enable Sell", type: "switch" },
  EnableNewsFilter: { label: "Enable News Filter", type: "switch" },
  MinutesStopBeforeNewsFilter: {
    label: "Pause Before High-Impact News",
    type: "number",
    suffix: "minutes",
  },
  MinutesStartAfterNewsFilter: {
    label: "Resume After High-Impact News",
    type: "number",
    suffix: "minutes",
  },
  BuyMagic: { label: "Buy Magic", type: "number", disabled: true },
  SellMagic: { label: "Sell Magic", type: "number", disabled: true },
  SlippagePoints: { label: "Slippage Points", type: "number" },
};

const coreConfigRows: ConfigFieldName[][] = [
  ["EnableBot"],
  ["StartLot", "LayerDistancePoint"],
  ["RSIPeriod"],
  ["Oversold", "Overbought"],
  ["StartTime"],
  ["EndTime"],
  ["EnablePauseTime"],
  ["PauseStartTime"],
  ["PauseEndTime"],
];

const basicConfigRows: ConfigFieldName[][] = [
  ["UseTrailingTP"],
  ["TrailingTPStartPoint", "TrailingDistancePoint"],
  ["StopLossUSD", "DailyProfitTargetUSD"],
  ["RestMinutesAfterCutLoss"],
  ["EnableBuy"],
  ["EnableSell"],
];

const advancedConfigRows: ConfigFieldName[][] = [
  ["EnableNewsFilter"],
  ["MinutesStopBeforeNewsFilter"],
  ["MinutesStartAfterNewsFilter"],
  ["LayersPerBatch", "MaxLayerCount"],
  ["RefillPendingThreshold", "RefillLayerCount"],
  ["BuyMagic", "SellMagic"],
  ["SlippagePoints"],
];

const getMemberConfigDefaultValues = (
  config: ReturnType<typeof parseConfig>,
): MemberConfigFormValues => ({
  ...config,
});

export default function MemberHomeDashboard() {
  const { data, isLoading } = useGetTradingAccounts();
  const { tradingAccount, setTradingAccount } = TradingAccountStore();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isConfigDirty, setIsConfigDirty] = useState(false);
  const tradingAccounts: TradingAccount[] = useMemo(
    () => data?.data || [],
    [data?.data],
  );

  const selectedAccount = useMemo(() => {
    return (
      tradingAccounts.find((account) => account.id === tradingAccount?.id) ||
      tradingAccounts[0] ||
      null
    );
  }, [tradingAccount?.id, tradingAccounts]);

  useEffect(() => {
    if (!tradingAccount && tradingAccounts.length > 0) {
      setTradingAccount(tradingAccounts[0] as never);
    }
  }, [setTradingAccount, tradingAccount, tradingAccounts]);

  const currentEAStatus = selectedAccount?.eaStatus ?? 0;
  const botStatus = getBotStatus(currentEAStatus);
  const config = useMemo(
    () => parseConfig(selectedAccount?.eaConfiguration),
    [selectedAccount?.eaConfiguration],
  );
  const configForm = useForm<MemberConfigFormValues>({
    resolver: zodResolver(memberConfigSchema),
    defaultValues: getMemberConfigDefaultValues(config),
  });

  useEffect(() => {
    configForm.reset(getMemberConfigDefaultValues(config));
  }, [config, configForm, selectedAccount?.id]);

  const handleSaveConfig = async (values: MemberConfigFormValues) => {
    if (!selectedAccount) return;

    const configuration = {
      TimeZone: "UTC",
      EnableBot: values.EnableBot,
      StartLot: Number(values.StartLot),
      RSIPeriod: Number(values.RSIPeriod),
      Oversold: Number(values.Oversold),
      Overbought: Number(values.Overbought),
      LayerDistancePoint: Number(values.LayerDistancePoint),
      LayersPerBatch: Number(values.LayersPerBatch),
      MaxLayerCount: Number(values.MaxLayerCount),
      RefillPendingThreshold: Number(values.RefillPendingThreshold),
      RefillLayerCount: Number(values.RefillLayerCount),
      StartTime: gmt7ToUtc(normalizeTime(values.StartTime)),
      EndTime: gmt7ToUtc(normalizeTime(values.EndTime)),
      EnablePauseTime: values.EnablePauseTime,
      PauseStartTime: gmt7ToUtc(normalizeTime(values.PauseStartTime)),
      PauseEndTime: gmt7ToUtc(normalizeTime(values.PauseEndTime)),
      UseTrailingTP: values.UseTrailingTP,
      TrailingTPStartPoint: Number(values.TrailingTPStartPoint),
      TrailingDistancePoint: Number(values.TrailingDistancePoint),
      DailyProfitTargetUSD: Number(values.DailyProfitTargetUSD),
      StopLossUSD: Number(values.StopLossUSD),
      RestMinutesAfterCutLoss: Number(values.RestMinutesAfterCutLoss),
      MinutesStopBeforeNewsFilter: Number(values.MinutesStopBeforeNewsFilter),
      MinutesStartAfterNewsFilter: Number(values.MinutesStartAfterNewsFilter),
      SlippagePoints: Number(values.SlippagePoints),
      BuyMagic: Number(values.BuyMagic),
      SellMagic: Number(values.SellMagic),
      EnableBuy: values.EnableBuy,
      EnableSell: values.EnableSell,
      EnableNewsFilter: values.EnableNewsFilter,
    };

    setIsSaving(true);
    setSaveMessage("");

    try {
      await fetch("/api/member/trading-accounts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          configuration,
        }),
      }).then(handleRes);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save the bot configuration.";
      setSaveMessage(errorMessage);
      toast.error(errorMessage);
      setIsSaving(false);
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });
    setSaveMessage("Bot configuration saved successfully.");
    toast.success("Bot configuration saved successfully.");
    setIsConfigDirty(false);
    setIsSaving(false);
  };

  const renderConfigField = (name: ConfigFieldName) => {
    const meta = configFieldMeta[name];
    const error = configForm.formState.errors[name];

    if (meta.type === "switch") {
      return (
        <label
          key={name}
          className="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4 shadow-inner shadow-black/30"
        >
          <span className="text-sm font-semibold text-white">{meta.label}</span>
          <Controller
            control={configForm.control}
            name={name}
            render={({ field }) => (
              <Switch
                checked={field.value === true}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  setIsConfigDirty(true);
                  setSaveMessage("");
                }}
              />
            )}
          />
        </label>
      );
    }

    if (meta.disabled) {
      return (
        <label key={name} className="space-y-2">
          <span className="text-sm text-ch-muted">{meta.label}</span>
          <Input
            type={meta.type}
            value={String(configForm.getValues(name) ?? "")}
            disabled
            className={`${inputClass} cursor-not-allowed opacity-60`}
          />
          <input type="hidden" {...configForm.register(name)} />
          <span className="block text-xs text-amber-300/80">
            Locked to protect active EA orders.
          </span>
        </label>
      );
    }

    return (
      <label key={name} className="space-y-2">
        <span className="text-sm text-ch-muted">{meta.label}</span>
        <div className="flex">
          <Input
            type={meta.type}
            step={meta.type === "time" ? 1 : meta.step || "1"}
            {...configForm.register(name)}
            className={`${inputClass} ${meta.suffix ? "rounded-r-none" : ""}`}
          />
          {meta.suffix && (
            <span className="flex h-11 shrink-0 items-center rounded-r-lg border border-l-0 border-cyan-400/20 bg-cyan-950/40 px-3 text-xs font-medium text-cyan-200">
              {meta.suffix}
            </span>
          )}
        </div>
        {error?.message && (
          <span className="text-xs text-red-300">{String(error.message)}</span>
        )}
      </label>
    );
  };

  const renderConfigSection = (
    title: string,
    description: string,
    rows: ConfigFieldName[][],
  ) => (
    <div className="rounded-2xl border border-cyan-400/15 bg-black/15 p-4 sm:p-5">
      <div className="mb-5">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-ch-muted">{description}</p>
      </div>
      <div className="grid gap-4">
        {rows.map((row) => (
          <div
            key={row.join("-")}
            className={row.length > 1 ? "grid gap-4 grid-cols-2" : "grid"}
          >
            {row.map(renderConfigField)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <section className={cardClass}>
        <div className={sectionContentClass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300 drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]">
                Trading Account
              </p>
              <h1 className="mt-1 text-xl font-bold text-white">
                Select a trading account
              </h1>
            </div>
            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 shadow-[0_0_18px_rgba(0,217,255,0.18)]">
              {tradingAccounts.length} accounts
            </div>
          </div>

          <Select
            value={selectedAccount?.id ? String(selectedAccount.id) : undefined}
            onValueChange={(value) => {
              const account = tradingAccounts.find(
                (item) => String(item.id) === value,
              );
              if (account) {
                setIsConfigDirty(false);
                setSaveMessage("");
                setTradingAccount(account as never);
              }
            }}
          >
            <SelectTrigger className="h-11 w-full border-cyan-400/25 bg-black/35 text-cyan-50 shadow-inner shadow-cyan-950/40">
              <SelectValue placeholder="Select a trading account" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Trading Account</SelectLabel>
                {tradingAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.accountId} -{" "}
                    {account.accountName || account.accountServer || "Trading"}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="mt-4 grid gap-3 text-sm text-ch-muted sm:grid-cols-3">
            <div className={fieldPanelClass}>
              <p className="text-xs text-cyan-300/80">Server</p>
              <p className="mt-1 font-semibold text-white">
                {selectedAccount?.accountServer || "-"}
              </p>
            </div>
            <div className={fieldPanelClass}>
              <p className="text-xs text-cyan-300/80">Package</p>
              <p className="mt-1 font-semibold text-white">
                {selectedAccount?.package?.name || "-"}
              </p>
            </div>
            <div className={fieldPanelClass}>
              <p className="text-xs text-cyan-300/80">Subscription End Date</p>
              <p className="mt-1 font-semibold text-white">
                {formatDateOnly(selectedAccount?.endDate)}
              </p>
            </div>
          </div>

          {isLoading && (
            <p className="mt-4 text-sm text-ch-muted">
              Loading trading accounts...
            </p>
          )}
        </div>
      </section>

      <form
        key={selectedAccount?.id || "empty"}
        onSubmit={configForm.handleSubmit(handleSaveConfig)}
        onChange={() => {
          setIsConfigDirty(true);
          setSaveMessage("");
        }}
        className="grid gap-5"
      >
        <section className={cardClass}>
          <div className={sectionContentClass}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-fuchsia-300 drop-shadow-[0_0_10px_rgba(217,70,239,0.75)]">
                  Control Center
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  {selectedAccount?.expertAdvisor?.name || "Expert Advisor"}
                </h2>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-black/25 px-4 py-3 shadow-inner shadow-black/30">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${botStatus.dotClass}`}
                />
                <p
                  className={`text-xs font-bold uppercase tracking-[0.24em] ${botStatus.textClass}`}
                >
                  {botStatus.label}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-ch-muted">
              {botStatus.detail}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className={fieldPanelClass}>
                <p className="text-xs text-cyan-300/80">Account Status</p>
                <p className="mt-1 font-semibold text-white">
                  {getStatusText(selectedAccount?.status)}
                </p>
              </div>
              <div className={fieldPanelClass}>
                <p className="text-xs text-cyan-300/80">Last Sync</p>
                <p className="mt-1 font-semibold text-white">
                  {formatDate(selectedAccount?.lastSync)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className={sectionContentClass}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300 drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]">
                  Config Bot
                </p>
                <h2 className="mt-1 text-lg font-bold text-white">
                  Automation settings
                </h2>
              </div>
              <ShieldAlert className="h-5 w-5 text-amber-300" />
            </div>

            <div className="grid gap-5">
              {renderConfigSection(
                "Core Settings",
                "Essential settings for enabling the bot and defining its initial lot size.",
                coreConfigRows,
              )}
              {renderConfigSection(
                "Basic Settings",
                "Strategy, target, trailing, and trading schedule settings.",
                basicConfigRows,
              )}
              {renderConfigSection(
                "Advanced Settings",
                "Layering, trade direction, news filter, magic number, and order execution settings.",
                advancedConfigRows,
              )}

              <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-192 -translate-x-1/2 rounded-2xl border border-cyan-400/30 bg-[rgba(3,10,24,0.92)] p-3 shadow-[0_0_32px_rgba(0,217,255,0.16),0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                {saveMessage && (
                  <p className="mb-2 text-center text-sm text-ch-muted">
                    {saveMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={!selectedAccount || isSaving || !isConfigDirty}
                  className={`h-12 w-full ${
                    isConfigDirty
                      ? "bg-cyan-500 text-black shadow-[0_0_24px_rgba(0,217,255,0.45)] hover:bg-cyan-300"
                      : "bg-slate-700 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {isSaving
                    ? "Saving..."
                    : isConfigDirty
                      ? "Save Changes"
                      : "No Changes"}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <div aria-hidden="true" className="h-0 lg:h-16" />
      </form>
    </div>
  );
}
