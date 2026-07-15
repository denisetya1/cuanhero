"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Matcher } from "react-day-picker";

export function DatePicker({
  selected,
  onSelect,
  placeholder,
  displayFormat = "dd-MM-yyyy",
  disabled,
}: {
  selected?: Date | undefined;
  onSelect: (date: Date) => void;
  placeholder?: string;
  displayFormat?: string;
  disabled?: Matcher | Matcher[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!selected}
          className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
        >
          {selected ? (
            format(selected, displayFormat)
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDownIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return;

            if (typeof disabled === "function" && disabled(date)) return;

            onSelect(date);
            setIsOpen(false);
          }}
          defaultMonth={selected ?? new Date()}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
