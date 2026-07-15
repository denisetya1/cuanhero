"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const DateRangePicker = ({
  selectedDate,
  onSelect,
  numberOfMonths = 1,
}: {
  selectedDate: DateRange | undefined;
  onSelect: (date: DateRange | undefined) => void;
  numberOfMonths: number;
}) => {
  const [date, setDate] = React.useState<DateRange | undefined>(selectedDate);
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (range: DateRange | undefined, selectedDay: Date) => {
    // Jika rentang sebelumnya sudah lengkap, reset seleksi lama
    if (date?.from && date?.to) {
      const nextRange = { from: selectedDay, to: undefined };
      setDate(nextRange);
      return;
    }

    // Tutup popover jika rentang yang baru sudah lengkap
    if (range?.from && range?.to) {
      onSelect(range); // 💡 Teruskan rentang normal ke atas
      setDate(range);
      setIsOpen(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start border-slate-200 bg-white text-left font-normal text-slate-900 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-blue-300 focus-visible:ring-blue-100 aria-expanded:bg-white aria-expanded:text-slate-900 data-[state=open]:bg-white data-[state=open]:text-slate-900",
              !date && "text-slate-600",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />

            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd MMM yyyy")} -{" "}
                  {format(date.to, "dd MMM yyyy")}
                </>
              ) : (
                format(date.from, "dd MMM yyyy")
              )
            ) : (
              <span>Pilih tanggal</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="z-[80] w-auto rounded-md border border-slate-200 bg-white p-0 text-slate-900 shadow-xl"
          align="start"
        >
          <Calendar
            autoFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(range, selectedDay) => handleSelect(range, selectedDay)}
            numberOfMonths={numberOfMonths}
            className="bg-white text-slate-900"
            classNames={{
              caption_label: "text-sm font-semibold text-slate-900",
              weekday: "text-slate-600",
              day: "text-slate-900",
              outside: "text-slate-400",
              today: "bg-blue-50 text-blue-700",
              range_start:
                "bg-blue-100 text-slate-900 after:bg-blue-100",
              range_middle: "bg-blue-50 text-slate-900",
              range_end: "bg-blue-100 text-slate-900 after:bg-blue-100",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
