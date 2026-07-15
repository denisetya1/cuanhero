"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { DateRangePicker } from "./DateRangePicker";

const parseDate = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export default function AdminPaymentDateFilter({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
}) {
  const router = useRouter();
  const selectedDate: DateRange | undefined = startDate
    ? {
        from: parseDate(startDate),
        to: parseDate(endDate),
      }
    : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) {
      return;
    }

    const params = new URLSearchParams();

    params.set("startDate", format(range.from, "yyyy-MM-dd"));
    params.set("endDate", format(range.to, "yyyy-MM-dd"));

    params.set("page", "1");
    router.push(`/admin/payments?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="w-full sm:w-80">
        <DateRangePicker
          selectedDate={selectedDate}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </div>
      {(startDate || endDate) && (
        <Link
          href="/admin/payments"
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Clear
        </Link>
      )}
    </div>
  );
}
