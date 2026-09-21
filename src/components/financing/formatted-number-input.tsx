import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormattedNumberInputProps {
  value?: number | string | null;
  onChange?: (value: number) => void;
  onValueChange?: (value: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  hasError?: boolean;
}

// Convert number to comma-separated string
function formatNumberWithCommas(val?: number | string | null, allowDecimals = false): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "string" ? parseFloat(val.replace(/,/g, "")) : val;
  if (isNaN(num)) return "";
  if (num === 0) return "0";
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return allowDecimals && parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
}

// Parse string with commas back to clean number
function parseFormattedNumber(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function FormattedNumberInput({
  value,
  onChange,
  onValueChange,
  placeholder = "0",
  className,
  prefix = "$",
  suffix,
  disabled = false,
  min = 0,
  max,
  allowDecimals = false,
  hasError = false,
}: FormattedNumberInputProps) {
  const getNumeric = (v?: number | string | null): number | undefined => {
    if (v === undefined || v === null || v === "") return undefined;
    if (typeof v === "number") return v;
    const p = parseFloat(v.replace(/,/g, ""));
    return isNaN(p) ? undefined : p;
  };

  const [displayVal, setDisplayVal] = useState<string>(() => {
    const num = getNumeric(value);
    return num !== undefined && num !== 0 ? formatNumberWithCommas(num, allowDecimals) : "";
  });

  const notifyChange = (num: number) => {
    onChange?.(num);
    onValueChange?.(num);
  };

  useEffect(() => {
    const num = getNumeric(value);
    if (num !== undefined) {
      if (num === 0 && !displayVal) {
        setDisplayVal("");
      } else {
        const currentNum = parseFormattedNumber(displayVal);
        if (currentNum !== num) {
          setDisplayVal(num === 0 ? "" : formatNumberWithCommas(num, allowDecimals));
        }
      }
    } else {
      setDisplayVal("");
    }
  }, [value, allowDecimals]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Handle backspace/empty
    if (!input.trim()) {
      setDisplayVal("");
      notifyChange(0);
      return;
    }

    // Strip non-digits except single decimal if allowed
    let clean = input.replace(/[^0-9.]/g, "");
    if (!allowDecimals) {
      clean = clean.replace(/\./g, "");
    } else {
      const parts = clean.split(".");
      if (parts.length > 2) clean = `${parts[0]}.${parts.slice(1).join("")}`;
    }

    const numeric = parseFloat(clean);
    if (isNaN(numeric)) {
      setDisplayVal("");
      notifyChange(0);
      return;
    }

    let clamped = numeric;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;

    // Format with commas for display
    const formatted = formatNumberWithCommas(clamped, allowDecimals);
    setDisplayVal(formatted);
    notifyChange(clamped);
  };

  const handleBlur = () => {
    const numeric = parseFormattedNumber(displayVal);
    if (numeric > 0) {
      setDisplayVal(formatNumberWithCommas(numeric, allowDecimals));
    } else {
      setDisplayVal("");
    }
  };

  return (
    <div className="relative flex items-center w-full">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={displayVal}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "text-sm font-medium transition-colors bg-background",
          prefix && "pl-7",
          suffix && "pr-10",
          hasError && "border-destructive focus-visible:ring-destructive text-destructive",
          className
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none select-none font-medium">
          {suffix}
        </span>
      )}
    </div>
  );
}
