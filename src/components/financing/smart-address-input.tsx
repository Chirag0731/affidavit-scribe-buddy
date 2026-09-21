import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseAddressString, ParsedAddress } from "./smart-address-parser";
import { MapPin, ClipboardPaste, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

interface SmartAddressInputProps {
  streetValue?: string;
  onAddressParsed: (parsed: ParsedAddress) => void;
  onStreetChange: (street: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function SmartAddressInput({
  streetValue = "",
  onAddressParsed,
  onStreetChange,
  placeholder = "Street address (e.g. 100 King St W, Suite 400)",
  label = "Operating Street Address",
  required = false,
}: SmartAddressInputProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState("");

  const handlePasteFull = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const parsed = parseAddressString(text);
        if (parsed.street) {
          onAddressParsed(parsed);
          toast.success("Address parsed into Street, City, Province, and Postal Code");
          return;
        }
      }
    } catch {
      // Fallback to popover
    }
    setPopoverOpen(true);
  };

  const handleApplyBuffer = () => {
    if (!pasteBuffer.trim()) return;
    const parsed = parseAddressString(pasteBuffer);
    onAddressParsed(parsed);
    setPasteBuffer("");
    setPopoverOpen(false);
    toast.success("Address successfully auto-filled");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-cyan-600" />
          {label} {required && <span className="text-destructive">*</span>}
        </Label>

        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
              title="Paste full unformatted address"
            >
              <ClipboardPaste className="w-3 h-3 mr-1" />
              Paste Full Address
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 shadow-xl rounded-2xl border-border bg-popover z-50" align="end">
            <div className="space-y-2.5">
              <div>
                <span className="text-xs font-bold text-foreground block">Smart Address Auto-Fill</span>
                <span className="text-[11px] text-muted-foreground block">
                  Paste complete address line to auto-split into street, city, province, and postal code
                </span>
              </div>
              <Input
                placeholder="450 Front St W, Toronto, ON M5V 3Z2"
                value={pasteBuffer}
                onChange={(e) => setPasteBuffer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyBuffer();
                  }
                }}
                className="text-xs"
                autoFocus
              />
              <div className="flex justify-between items-center pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPopoverOpen(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyBuffer}
                  disabled={!pasteBuffer.trim()}
                  className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-Fill
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="relative">
        <Input
          placeholder={placeholder}
          value={streetValue}
          onChange={(e) => onStreetChange(e.target.value)}
          className="text-sm bg-background pl-8"
        />
        <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
