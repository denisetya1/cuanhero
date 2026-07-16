"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  MessageCircle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
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
import { useMemberLanguage } from "@/app/member/components/MemberLanguageProvider";

type EAConfiguration = {
  EnableBot: boolean;
  StartLot: string;
  LayerDistancePoint: string;
  UseTrailingTP: boolean;
  TrailingTPStartPoint: string;
  TrailingStepPoint: string;
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
    code?: string | null;
    name?: string | null;
    recurringType?: string | null;
  } | null;
  expertAdvisor?: {
    name?: string | null;
    defaultConfig?: StoredEAConfiguration | null;
  } | null;
};

const cardClass =
  "relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[linear-gradient(145deg,rgba(7,18,37,0.92),rgba(4,8,20,0.96))] p-5 shadow-[0_0_0_1px_rgba(0,217,255,0.08),0_18px_55px_rgba(0,0,0,0.55)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-cyan-300/80 before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_top_right,rgba(0,217,255,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.10),transparent_30%)]";

const sectionContentClass = "relative z-10";

const inputClass =
  "h-11 border-cyan-400/20 bg-black/35 text-cyan-50 shadow-inner shadow-cyan-950/40 placeholder:text-slate-500 focus-visible:border-cyan-300 focus-visible:ring-cyan-400/30";

const fieldPanelClass =
  "rounded-xl border border-cyan-400/20 bg-black/25 p-4 shadow-inner shadow-black/30";

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

const formatDateOnly = (
  value?: string | Date | null,
  locale: "en-US" | "id-ID" = "en-US",
) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getDaysUntilDate = (value?: string | Date | null) => {
  if (!value) return null;

  const endDate = new Date(value);
  if (Number.isNaN(endDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return Math.ceil((endDate.getTime() - today.getTime()) / 86_400_000);
};

const shiftTimeByMinutes = (value: string, offsetMinutes: number) => {
  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) return value;

  const minutesPerDay = 24 * 60;
  const totalMinutes = hours * 60 + minutes + offsetMinutes;
  const shiftedMinutes =
    ((totalMinutes % minutesPerDay) + minutesPerDay) % minutesPerDay;
  const shiftedHours = Math.floor(shiftedMinutes / 60);
  const shiftedMinute = shiftedMinutes % 60;

  return `${String(shiftedHours).padStart(2, "0")}:${String(shiftedMinute).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const subscribeToTimeZone = () => () => undefined;
const getBrowserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const getServerTimeZone = () => "Asia/Jakarta";

const getTimeZoneOffsetMinutes = (timeZone: string) => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const timeInZoneAsUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second"),
  );

  return Math.round((timeInZoneAsUtc - now.getTime()) / 60_000);
};

const formatUtcOffset = (offsetMinutes: number) => {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
};

const parseConfig = (
  value?: StoredEAConfiguration | null,
  timeZoneOffsetMinutes = 7 * 60,
) => {
  const defaultConfig: EAConfiguration = {
    EnableBot: false,
    StartLot: "0.01",
    LayerDistancePoint: "250",
    UseTrailingTP: false,
    TrailingTPStartPoint: "1500",
    TrailingStepPoint: "50",
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
    const current = value[key];

    // The current flat schedule fields are stored in UTC. Convert them to the
    // timezone detected from the member's browser before populating the form.
    if (typeof current === "string" || typeof current === "number") {
      return shiftTimeByMinutes(String(current), timeZoneOffsetMinutes);
    }

    if (typeof legacy === "string" || typeof legacy === "number") {
      const legacyTime = String(legacy);
      return usesUtcSchedule
        ? shiftTimeByMinutes(legacyTime, timeZoneOffsetMinutes)
        : legacyTime;
    }

    return defaultConfig[key] as string;
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
    TrailingStepPoint: readString(
      "TrailingStepPoint",
      value.TrailingDistancePoint ?? value.trailingDistancePoint,
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

const positiveNumber = (label: string) =>
  requiredNumber(label).refine(
    (value) => Number(value) > 0,
    `${label} must be greater than zero.`,
  );

const normalizeTime = (value: string) =>
  /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;

const memberConfigSchema = z.object({
  EnableBot: z.boolean(),
  StartLot: requiredNumber("Start Lot"),
  LayerDistancePoint: requiredNumber("Layer Distance Point"),
  UseTrailingTP: z.boolean(),
  TrailingTPStartPoint: requiredNumber("Trailing TP Start Point"),
  TrailingStepPoint: positiveNumber("Trailing Step Point"),
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
  EnableBot: { label: "Enable Auto Trade", type: "switch" },
  StartLot: { label: "Start Lot", type: "number", step: "0.01" },
  LayerDistancePoint: {
    label: "Layer Distance",
    type: "number",
    suffix: "Point",
  },
  UseTrailingTP: { label: "Use Trailing TP", type: "switch" },
  TrailingTPStartPoint: {
    label: "Trailing TP Start",
    type: "number",
    suffix: "Point",
  },
  TrailingStepPoint: {
    label: "Trailing Step",
    type: "number",
    suffix: "Point",
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
  StartTime: { label: "Trading Start Time", type: "time" },
  EndTime: { label: "Trading End Time", type: "time" },
  EnablePauseTime: { label: "Enable Schedule Pause", type: "switch" },
  PauseStartTime: {
    label: "Pause Start Time",
    type: "time",
  },
  PauseEndTime: {
    label: "Pause End Time",
    type: "time",
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
    suffix: "minutes",
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
  ["UseTrailingTP"],
  ["TrailingTPStartPoint", "TrailingStepPoint"],
];

const basicConfigRows: ConfigFieldName[][] = [
  ["EnableBuy"],
  ["EnableSell"],
  ["StartTime"],
  ["EndTime"],
  ["EnablePauseTime"],
  ["PauseStartTime"],
  ["PauseEndTime"],
  ["StopLossUSD", "DailyProfitTargetUSD"],
  ["RestMinutesAfterCutLoss"],
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

export default function MemberHomeDashboard({
  whatsappNumber,
  renewalMessageEn,
  renewalMessageId,
}: {
  whatsappNumber: string;
  renewalMessageEn: string;
  renewalMessageId: string;
}) {
  const { language } = useMemberLanguage();
  const detectedTimeZone = useSyncExternalStore(
    subscribeToTimeZone,
    getBrowserTimeZone,
    getServerTimeZone,
  );
  const timeZoneOffsetMinutes = useMemo(
    () => getTimeZoneOffsetMinutes(detectedTimeZone),
    [detectedTimeZone],
  );
  const utcOffsetLabel = formatUtcOffset(timeZoneOffsetMinutes);
  const { data, isLoading } = useGetTradingAccounts();
  const { tradingAccount, setTradingAccount } = TradingAccountStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const accountQuery = searchParams.get("account");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const tradingAccounts: TradingAccount[] = useMemo(
    () =>
      ((data?.data || []) as TradingAccount[]).filter(
        (account) => account.status === 1,
      ),
    [data?.data],
  );

  const selectedAccount = useMemo(() => {
    return (
      tradingAccounts.find((account) => account.accountId === accountQuery) ||
      tradingAccounts.find((account) => account.id === tradingAccount?.id) ||
      tradingAccounts[0] ||
      null
    );
  }, [accountQuery, tradingAccount?.id, tradingAccounts]);

  const isFreeTrial =
    selectedAccount?.package?.code === "FREE_TRIAL" ||
    selectedAccount?.package?.recurringType === "24h";

  const renewalHref = useMemo(() => {
    const number = whatsappNumber.replace(/\D/g, "");
    if (!number || !selectedAccount) return null;

    const isIndonesian = language === "id";
    if (isFreeTrial) {
      const message = [
        isIndonesian
          ? "Halo CuanHero, saya ingin melanjutkan Free Trial ke paket IB Monthly."
          : "Hello CuanHero, I would like to continue my Free Trial with the IB Monthly package.",
        "",
        isIndonesian
          ? `Akun trading: ${selectedAccount.accountId}`
          : `Trading account: ${selectedAccount.accountId}`,
        isIndonesian
          ? `Paket saat ini: ${selectedAccount.package?.name || "Free Trial"}`
          : `Current package: ${selectedAccount.package?.name || "Free Trial"}`,
        isIndonesian
          ? `Trial berakhir: ${formatDateOnly(selectedAccount.endDate, "id-ID")}`
          : `Trial ends: ${formatDateOnly(selectedAccount.endDate)}`,
        "",
        isIndonesian
          ? "Mohon bantu proses pendaftaran dan verifikasi akun IB saya."
          : "Please help me register and verify my IB account.",
      ].join("\n");

      return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    }

    const renewalMessage = isIndonesian
      ? renewalMessageId.trim() || renewalMessageEn.trim()
      : renewalMessageEn.trim();

    const message = [
      renewalMessage ||
        (isIndonesian
          ? "Halo CuanHero, saya ingin memperpanjang langganan saya."
          : "Hello CuanHero, I would like to renew my subscription."),
      "",
      isIndonesian
        ? `Akun trading: ${selectedAccount.accountId}`
        : `Trading account: ${selectedAccount.accountId}`,
      isIndonesian
        ? `Paket: ${selectedAccount.package?.name || "-"}`
        : `Package: ${selectedAccount.package?.name || "-"}`,
      isIndonesian
        ? `Tanggal berakhir langganan: ${formatDateOnly(selectedAccount.endDate, "id-ID")}`
        : `Subscription end date: ${formatDateOnly(selectedAccount.endDate)}`,
    ].join("\n");

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }, [
    language,
    isFreeTrial,
    renewalMessageEn,
    renewalMessageId,
    selectedAccount,
    whatsappNumber,
  ]);

  const showRenewButton = useMemo(() => {
    const daysRemaining = getDaysUntilDate(selectedAccount?.endDate);
    return daysRemaining !== null && daysRemaining <= 7;
  }, [selectedAccount?.endDate]);

  useEffect(() => {
    if (!selectedAccount) return;

    if (tradingAccount?.id !== selectedAccount.id) {
      setTradingAccount(selectedAccount as never);
    }

    if (accountQuery !== selectedAccount.accountId) {
      const params = new URLSearchParams(searchParamsString);
      params.set("account", selectedAccount.accountId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [
    accountQuery,
    pathname,
    router,
    searchParamsString,
    selectedAccount,
    setTradingAccount,
    tradingAccount?.id,
  ]);

  const currentEAStatus = selectedAccount?.eaStatus ?? 0;
  const botStatus = getBotStatus(currentEAStatus);
  const config = useMemo(
    () => parseConfig(selectedAccount?.eaConfiguration, timeZoneOffsetMinutes),
    [selectedAccount?.eaConfiguration, timeZoneOffsetMinutes],
  );
  const configForm = useForm<MemberConfigFormValues>({
    resolver: zodResolver(memberConfigSchema),
    defaultValues: getMemberConfigDefaultValues(config),
  });
  const isConfigDirty = configForm.formState.isDirty;

  useEffect(() => {
    configForm.reset(getMemberConfigDefaultValues(config));
  }, [config, configForm, selectedAccount?.id]);

  const handleResetConfig = () => {
    const defaultConfig = selectedAccount?.expertAdvisor?.defaultConfig;
    if (!defaultConfig) {
      toast.error("The default EA configuration is not available.");
      return;
    }

    configForm.reset(
      getMemberConfigDefaultValues(
        parseConfig(defaultConfig, timeZoneOffsetMinutes),
      ),
      { keepDefaultValues: true },
    );
    setSaveMessage(
      "Default EA configuration loaded. Save changes to apply it.",
    );
    toast.info("Default EA configuration loaded.");
  };

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
      StartTime: shiftTimeByMinutes(
        normalizeTime(values.StartTime),
        -timeZoneOffsetMinutes,
      ),
      EndTime: shiftTimeByMinutes(
        normalizeTime(values.EndTime),
        -timeZoneOffsetMinutes,
      ),
      EnablePauseTime: values.EnablePauseTime,
      PauseStartTime: shiftTimeByMinutes(
        normalizeTime(values.PauseStartTime),
        -timeZoneOffsetMinutes,
      ),
      PauseEndTime: shiftTimeByMinutes(
        normalizeTime(values.PauseEndTime),
        -timeZoneOffsetMinutes,
      ),
      UseTrailingTP: values.UseTrailingTP,
      TrailingTPStartPoint: Number(values.TrailingTPStartPoint),
      TrailingStepPoint: Number(values.TrailingStepPoint),
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
    // Make the successfully saved values the new dirty-state baseline.
    configForm.reset(values);
    setSaveMessage("Bot configuration saved successfully.");
    toast.success("Bot configuration saved successfully.");
    setIsSaving(false);
  };

  const renderConfigField = (name: ConfigFieldName) => {
    const meta = configFieldMeta[name];
    const error = configForm.formState.errors[name];
    const suffix = meta.type === "time" ? utcOffsetLabel : meta.suffix;
    const inputId = `member-config-${name}`;

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
        <div className="flex min-w-0">
          <div className="relative min-w-0 flex-1">
            <Input
              id={inputId}
              type={meta.type}
              step={meta.type === "time" ? 1 : meta.step || "1"}
              {...configForm.register(name)}
              className={`${inputClass} ${meta.type === "time" ? "pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0" : ""} ${suffix ? "rounded-r-none" : ""}`}
            />
            {meta.type === "time" && (
              <button
                type="button"
                aria-label={`Open ${meta.label} picker`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const input = document.getElementById(
                    inputId,
                  ) as HTMLInputElement | null;

                  if (!input) return;
                  input.focus();

                  try {
                    if (typeof input.showPicker === "function") {
                      input.showPicker();
                    } else {
                      input.click();
                    }
                  } catch {
                    input.click();
                  }
                }}
                className="absolute top-1/2 right-0 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center text-cyan-300 transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            )}
          </div>
          {suffix && (
            <span className="flex h-11 shrink-0 items-center rounded-r-lg border border-l-0 border-cyan-400/20 bg-cyan-950/40 px-3 text-xs font-medium text-cyan-200">
              {suffix}
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
    collapsible = false,
  ) => {
    const fields = (
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
    );

    if (collapsible) {
      return (
        <details className="group overflow-hidden rounded-2xl border border-cyan-400/15 bg-black/15">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 select-none [&::-webkit-details-marker]:hidden sm:p-5">
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-ch-muted">
                {description}
              </p>
            </div>
            <ChevronDown className="h-5 w-5 shrink-0 text-cyan-300 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="border-t border-cyan-400/10 p-4 sm:p-5">{fields}</div>
        </details>
      );
    }

    return (
      <div className="rounded-2xl border border-cyan-400/15 bg-black/15 p-4 sm:p-5">
        <div className="mb-5">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-ch-muted">{description}</p>
        </div>
        {fields}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <section className={cardClass}>
        <div className={sectionContentClass}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300 drop-shadow-[0_0_10px_rgba(0,217,255,0.8)]">
                Trading Account
              </p>
              <h1 className="mt-1 text-lg font-bold text-white sm:text-xl">
                Select a trading account
              </h1>
            </div>
            <div className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 shadow-[0_0_18px_rgba(0,217,255,0.18)]">
              {tradingAccounts.length} accounts
            </div>
          </div>

          <Select
            value={selectedAccount?.accountId || undefined}
            onValueChange={(value) => {
              const account = tradingAccounts.find(
                (item) => item.accountId === value,
              );
              if (account) {
                setSaveMessage("");

                const params = new URLSearchParams(searchParamsString);
                params.set("account", account.accountId);
                router.replace(`${pathname}?${params.toString()}`, {
                  scroll: false,
                });
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
                  <SelectItem key={account.id} value={account.accountId}>
                    {account.accountId} -{" "}
                    {account.accountName || account.accountServer || "Trading"}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="mt-4 grid gap-3 text-sm text-ch-muted sm:grid-cols-2">
            <div className={fieldPanelClass}>
              <p className="text-xs text-cyan-300/80">Package</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">
                  {selectedAccount?.package?.name || "-"}
                </p>
                {isFreeTrial && renewalHref && (
                  <Button
                    asChild
                    size="sm"
                    className="h-auto min-h-8 shrink-0 bg-emerald-500 px-3 py-1.5 text-xs font-semibold whitespace-normal text-white hover:bg-emerald-400"
                  >
                    <a href={renewalHref} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Upgrade to IB Monthly
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div className={fieldPanelClass}>
              <p className="text-xs text-cyan-300/80">Subscription End Date</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">
                  {formatDateOnly(selectedAccount?.endDate)}
                </p>
                {!isFreeTrial && showRenewButton && renewalHref && (
                  <Button
                    asChild
                    size="sm"
                    className="h-8 shrink-0 bg-emerald-500 px-3 text-xs font-semibold text-white hover:bg-emerald-400"
                  >
                    <a href={renewalHref} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Renew
                    </a>
                  </Button>
                )}
              </div>
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
        onChange={() => setSaveMessage("")}
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

            <div className={`${fieldPanelClass} mt-5`}>
              <p className="text-xs text-cyan-300/80">Last Sync</p>
              <p className="mt-1 font-semibold text-white">
                {formatDate(selectedAccount?.lastSync)}
              </p>
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
              <div className="flex shrink-0 items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    !selectedAccount?.expertAdvisor?.defaultConfig || isSaving
                  }
                  onClick={handleResetConfig}
                  className="border-cyan-400/30 bg-cyan-400/5 text-cyan-100 hover:bg-cyan-400/15 hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Reset to Default</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
                <ShieldAlert className="hidden h-5 w-5 text-amber-300 sm:block" />
              </div>
            </div>

            <div className="grid gap-5">
              {renderConfigSection(
                "Core Settings",
                "Essential settings for enabling the bot and defining its initial lot size.",
                coreConfigRows,
              )}
              {renderConfigSection(
                "Basic Settings",
                "Trading schedule, pause window, risk targets, recovery time, and trade direction settings.",
                basicConfigRows,
              )}
              {renderConfigSection(
                "Advanced Settings",
                "Layering, trade direction, news filter, magic number, and order execution settings.",
                advancedConfigRows,
                true,
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
