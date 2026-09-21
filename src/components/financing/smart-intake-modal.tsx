import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BusinessFinancingApplication } from "@/types/financing";
import { parseAddressString } from "./smart-address-parser";
import { parseDateFlexible } from "./financing-date-picker";
import {
  FileText,
  Sparkles,
  ClipboardPaste,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface SmartIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyData: (updater: (prev: BusinessFinancingApplication) => BusinessFinancingApplication) => void;
}

export function SmartIntakeModal({
  open,
  onOpenChange,
  onApplyData,
}: SmartIntakeModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedPreview, setParsedPreview] = useState<Record<string, any> | null>(null);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        analyzeText(text);
        toast.success("Pasted content from clipboard");
      }
    } catch {
      toast.error("Unable to access system clipboard. Please paste manually.");
    }
  };

  const analyzeText = (text: string) => {
    if (!text.trim()) {
      setParsedPreview(null);
      return;
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const extracted: Record<string, any> = {};

    // 1. Business Legal Name
    const nameMatch = text.match(/(?:company|business|legal\s*name|dba|applicant)\s*[:=-]\s*([^\n\r,]+)/i);
    if (nameMatch) {
      extracted.legalName = nameMatch[1].trim();
    } else if (lines.length > 0 && !lines[0].includes(":")) {
      extracted.legalName = lines[0];
    }

    // 2. Phone
    const phoneMatch = text.match(/(?:phone|cell|mobile|tel|contact)\s*[:=-]?\s*(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i)
      || text.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch) {
      extracted.phone = phoneMatch[1].trim();
    }

    // 3. Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      extracted.email = emailMatch[1].trim();
    }

    // 4. Requested Amount
    const reqMatch = text.match(/(?:amount|requested|funding|loan|advance|facility)\s*[:=-]?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    if (reqMatch) {
      const num = parseFloat(reqMatch[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) extracted.amountRequested = num;
    }

    // 5. Gross Annual Sales / Revenue
    const revMatch = text.match(/(?:annual|yearly|gross\s*(?:annual)?\s*(?:revenue|sales))\s*[:=-]?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    if (revMatch) {
      const num = parseFloat(revMatch[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) extracted.annualRevenue = num;
    }

    // 6. Monthly Sales
    const monthRevMatch = text.match(/(?:monthly|avg\s*monthly)\s*(?:revenue|sales)\s*[:=-]?\s*\$?([\d,]+(?:\.\d{2})?)/i);
    if (monthRevMatch) {
      const num = parseFloat(monthRevMatch[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) extracted.monthlyRevenue = num;
    }

    // 7. Owner Name
    const ownerMatch = text.match(/(?:owner|principal|guarantor|contact\s*person|authorized\s*signer)\s*[:=-]\s*([^\n\r,]+)/i);
    if (ownerMatch) {
      extracted.ownerName = ownerMatch[1].trim();
    }

    // 8. Date of Birth
    const dobMatch = text.match(/(?:dob|date\s*of\s*birth|birthdate)\s*[:=-]?\s*([0-9a-zA-Z\s,/-]+)/i);
    if (dobMatch) {
      const parsedDate = parseDateFlexible(dobMatch[1]);
      if (parsedDate) extracted.dob = parsedDate;
    }

    // 9. Address
    const addressMatch = text.match(/(?:address|location|physical|street)\s*[:=-]\s*([^\n\r]+)/i);
    if (addressMatch) {
      const parsedAddr = parseAddressString(addressMatch[1]);
      if (parsedAddr.street) extracted.address = parsedAddr;
    }

    // 10. Tax ID / BIN
    const taxMatch = text.match(/(?:tax\s*id|ein|bin|business\s*(?:number|#)|cra)\s*[:=-]?\s*([\w\d\s-]{9,15})/i);
    if (taxMatch) {
      extracted.taxId = taxMatch[1].trim();
    }

    setParsedPreview(extracted);
  };

  const handleApply = () => {
    if (!parsedPreview) return;

    onApplyData((prev) => {
      const updated = { ...prev };

      // Update business info
      if (parsedPreview.legalName) updated.business.legalName = parsedPreview.legalName;
      if (parsedPreview.phone) {
        updated.business.phone = parsedPreview.phone;
        updated.business.businessPhone = parsedPreview.phone;
      }
      if (parsedPreview.email) {
        updated.business.email = parsedPreview.email;
        updated.business.businessEmail = parsedPreview.email;
      }
      if (parsedPreview.taxId) {
        updated.business.federalTaxId = parsedPreview.taxId;
        updated.business.businessNumber = parsedPreview.taxId;
      }
      if (parsedPreview.address) {
        updated.business.physicalAddress = {
          street: parsedPreview.address.street,
          city: parsedPreview.address.city,
          province: parsedPreview.address.province,
          postalCode: parsedPreview.address.postalCode,
        };
        updated.business.city = parsedPreview.address.city;
        updated.business.province = parsedPreview.address.province;
        updated.business.postalCode = parsedPreview.address.postalCode;
        updated.business.country = parsedPreview.address.country;
      }

      // Update financials
      if (parsedPreview.amountRequested) {
        updated.financials.amountRequested = parsedPreview.amountRequested;
        updated.financials.requestedAmount = parsedPreview.amountRequested;
      }
      if (parsedPreview.annualRevenue) {
        updated.financials.annualGrossRevenue = parsedPreview.annualRevenue;
        updated.financials.grossAnnualSales = parsedPreview.annualRevenue;
      }
      if (parsedPreview.monthlyRevenue) {
        updated.financials.averageMonthlyRevenue = parsedPreview.monthlyRevenue;
        updated.financials.grossMonthlySales = parsedPreview.monthlyRevenue;
      }

      // Update owner
      if (parsedPreview.ownerName && updated.owners.length > 0) {
        const parts = parsedPreview.ownerName.split(" ");
        const first = parts[0] || "";
        const last = parts.slice(1).join(" ") || "";
        updated.owners[0].firstName = first;
        if (last) updated.owners[0].lastName = last;
      }
      if (parsedPreview.dob && updated.owners.length > 0) {
        updated.owners[0].dob = parsedPreview.dob;
      }

      return updated;
    });

    toast.success("Application fields auto-populated from parsed text");
    onOpenChange(false);
  };

  const detectedCount = parsedPreview ? Object.keys(parsedPreview).length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Smart Text Intake & Auto-Fill</DialogTitle>
              <DialogDescription className="text-xs">
                Paste broker notes, client emails, or summary inquiries to auto-populate application fields
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Paste Raw Text or Notes:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePasteClipboard}
              className="h-7 text-xs border-border"
            >
              <ClipboardPaste className="w-3.5 h-3.5 mr-1 text-cyan-600" />
              Paste from Clipboard
            </Button>
          </div>

          <Textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              analyzeText(e.target.value);
            }}
            placeholder={`Example:
Business: Apex Logistics Group Ltd
Phone: (416) 555-0192
Email: finance@apexlogistics.ca
Address: 250 University Ave, Toronto, ON M5H 3E5
Requested Amount: $150,000
Annual Revenue: $2,850,000
Principal: Michael Vance, DOB: 1982-05-14`}
            rows={7}
            className="text-xs font-mono bg-muted/20"
          />

          {/* Detected Fields Preview */}
          {detectedCount > 0 && (
            <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                  {detectedCount} Field{detectedCount === 1 ? "" : "s"} Detected
                </span>
                <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-300">
                  Ready to Map
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {parsedPreview?.legalName && (
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Legal Name</span>
                    <span className="font-semibold truncate block">{parsedPreview.legalName}</span>
                  </div>
                )}
                {parsedPreview?.amountRequested && (
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Requested</span>
                    <span className="font-semibold text-cyan-600 block">
                      ${parsedPreview.amountRequested.toLocaleString()}
                    </span>
                  </div>
                )}
                {parsedPreview?.annualRevenue && (
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Annual Revenue</span>
                    <span className="font-semibold block">${parsedPreview.annualRevenue.toLocaleString()}</span>
                  </div>
                )}
                {parsedPreview?.phone && (
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Phone</span>
                    <span className="font-semibold truncate block">{parsedPreview.phone}</span>
                  </div>
                )}
                {parsedPreview?.email && (
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Email</span>
                    <span className="font-semibold truncate block">{parsedPreview.email}</span>
                  </div>
                )}
                {parsedPreview?.ownerName && (
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Principal</span>
                    <span className="font-semibold truncate block">{parsedPreview.ownerName}</span>
                  </div>
                )}
                {parsedPreview?.dob && (
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Date of Birth</span>
                    <span className="font-semibold block">{parsedPreview.dob}</span>
                  </div>
                )}
                {parsedPreview?.address?.street && (
                  <div className="p-2 rounded-lg bg-background border border-border/60 col-span-2">
                    <span className="text-[10px] text-muted-foreground block">Address</span>
                    <span className="font-semibold truncate block">
                      {parsedPreview.address.street}, {parsedPreview.address.city}, {parsedPreview.address.province}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={detectedCount === 0}
            onClick={handleApply}
            className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Populate Application Fields
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
