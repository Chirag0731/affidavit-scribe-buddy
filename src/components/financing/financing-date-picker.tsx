import React, { useState, useEffect } from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FinancingDatePickerProps {
  value?: string; // Standard format YYYY-MM-DD
  onChange: (dateString: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  mode?: "dob" | "established" | "signed" | "general";
  minYear?: number;
  maxYear?: number;
}

// Flexible date string parser supporting diverse copy-pasted formats
export function parseDateFlexible(input: string): string | null {
  if (!input || !input.trim()) return null;
  const raw = input.trim();

  // 1. Direct YYYY-MM-DD check
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw + "T00:00:00");
    if (isValid(d)) return raw;
  }

  // 2. YYYYMMDD check
  if (/^\d{8}$/.test(raw)) {
    const y = raw.substring(0, 4);
    const m = raw.substring(4, 6);
    const day = raw.substring(6, 8);
    const candidate = `${y}-${m}-${day}`;
    if (isValid(new Date(candidate + "T00:00:00"))) return candidate;
  }

  // 3. Formats to try
  const formatsToTry = [
    "MM/dd/yyyy",
    "M/d/yyyy",
    "yyyy/MM/dd",
    "dd/MM/yyyy",
    "MMMM d, yyyy",
    "MMM d, yyyy",
    "MMMM dd yyyy",
    "MMM dd yyyy",
    "d MMMM yyyy",
    "dd-MM-yyyy",
    "yyyy.MM.dd",
  ];

  for (const fmt of formatsToTry) {
    try {
      const parsed = parse(raw, fmt, new Date());
      if (isValid(parsed) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
        return format(parsed, "yyyy-MM-dd");
      }
    } catch {
      // Continue
    }
  }

  // 4. Native JS date fallback
  try {
    const fallback = new Date(raw);
    if (isValid(fallback) && fallback.getFullYear() > 1900 && fallback.getFullYear() < 2100) {
      return format(fallback, "yyyy-MM-dd");
    }
  } catch {
    // Ignore
  }

  return null;
}

export function FinancingDatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  className,
  disabled = false,
  mode = "general",
  minYear = 1940,
  maxYear = new Date().getFullYear() + 2,
}: FinancingDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [textVal, setTextVal] = useState(value || "");

  useEffect(() => {
    setTextVal(value || "");
  }, [value]);

  // Derived Date object for the Calendar
  const selectedDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + "T00:00:00")
    : undefined;

  const currentYear = selectedDate ? selectedDate.getFullYear() : (mode === "dob" ? 1985 : new Date().getFullYear());
  const currentMonth = selectedDate ? selectedDate.getMonth() : new Date().getMonth();

  const [viewYear, setViewYear] = useState<number>(currentYear);
  const [viewMonth, setViewMonth] = useState<number>(currentMonth);

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [value]);

  // Handle direct text typing / pasting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextVal(raw);

    const parsed = parseDateFlexible(raw);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleInputBlur = () => {
    if (!textVal.trim()) {
      onChange("");
      return;
    }
    const parsed = parseDateFlexible(textVal);
    if (parsed) {
      setTextVal(parsed);
      onChange(parsed);
    } else {
      // Revert if invalid
      setTextVal(value || "");
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;
    const parsed = parseDateFlexible(pasted);
    if (parsed) {
      e.preventDefault();
      setTextVal(parsed);
      onChange(parsed);
    }
  };

  const handleSelectDay = (day?: Date) => {
    if (!day) return;
    const formatted = format(day, "yyyy-MM-dd");
    setTextVal(formatted);
    onChange(formatted);
    setOpen(false);
  };

  const handleYearChange = (yearStr: string) => {
    const y = parseInt(yearStr, 10);
    setViewYear(y);
    const newDate = new Date(y, viewMonth, 1);
    if (selectedDate) {
      const updated = new Date(y, viewMonth, Math.min(selectedDate.getDate(), 28));
      onChange(format(updated, "yyyy-MM-dd"));
    }
  };

  const handleMonthChange = (monthStr: string) => {
    const m = parseInt(monthStr, 10);
    setViewMonth(m);
    if (selectedDate) {
      const updated = new Date(viewYear, m, Math.min(selectedDate.getDate(), 28));
      onChange(format(updated, "yyyy-MM-dd"));
    }
  };

  const handlePresetSelect = (yearsAgo: number, monthOffset = 0) => {
    const now = new Date();
    const target = new Date(now.getFullYear() - yearsAgo, now.getMonth() - monthOffset, 15);
    const formatted = format(target, "yyyy-MM-dd");
    setTextVal(formatted);
    onChange(formatted);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setOpen(false);
  };

  const setToday = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setTextVal(today);
    onChange(today);
    setViewYear(new Date().getFullYear());
    setViewMonth(new Date().getMonth());
    setOpen(false);
  };

  // Generate years list descending
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    years.push(y);
  }

  const months = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" },
  ];

  return (
    <div className={cn("relative flex items-center gap-1.5", className)}>
      <div className="relative flex-1">
        <Input
          type="text"
          value={textVal}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className="text-sm font-mono tracking-tight pr-8 bg-background"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60 text-xs">
          {mode === "dob" ? "DOB" : ""}
        </div>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground border-border/80"
            title="Open calendar picker"
          >
            <CalendarIcon className="w-4 h-4 text-cyan-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 shadow-xl rounded-2xl border-border bg-popover z-50" align="end">
          {/* Quick Select Month and Year Selectors */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
            <Select value={String(viewMonth)} onValueChange={handleMonthChange}>
              <SelectTrigger className="h-8 text-xs font-semibold flex-1">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {months.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(viewYear)} onValueChange={handleYearChange}>
              <SelectTrigger className="h-8 text-xs font-semibold w-24">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Presets tailored to field purpose */}
          {mode === "dob" && (
            <div className="mb-2 pb-2 border-b border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Quick Age Presets
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "25 yo", years: 25 },
                  { label: "35 yo", years: 35 },
                  { label: "45 yo", years: 45 },
                  { label: "55 yo", years: 55 },
                  { label: "65 yo", years: 65 },
                ].map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-medium"
                    onClick={() => handlePresetSelect(p.years)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {mode === "established" && (
            <div className="mb-2 pb-2 border-b border-border/50">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                Quick Vintage Presets
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "1 yr ago", years: 1 },
                  { label: "2 yrs ago", years: 2 },
                  { label: "5 yrs ago", years: 5 },
                  { label: "10 yrs ago", years: 10 },
                  { label: "20 yrs ago", years: 20 },
                ].map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-[10px] font-medium"
                    onClick={() => handlePresetSelect(p.years)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Display */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelectDay}
            month={new Date(viewYear, viewMonth, 1)}
            onMonthChange={(m) => {
              setViewYear(m.getFullYear());
              setViewMonth(m.getMonth());
            }}
            initialFocus
            className="p-1"
          />

          {/* Bottom Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 mt-2 text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setTextVal("");
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs text-cyan-600 dark:text-cyan-400"
              onClick={setToday}
            >
              Today
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
