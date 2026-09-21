import React from "react";
import { BusinessFinancingApplication } from "@/types/financing";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  DollarSign,
  Users,
  CreditCard,
  MapPin,
  FileCheck2,
  Pencil,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface FinancingReviewSummaryProps {
  application: BusinessFinancingApplication;
  onEditSection: (stepIndex: number) => void;
  showSignatures?: boolean;
}

export function FinancingReviewSummary({
  application,
  onEditSection,
  showSignatures = true,
}: FinancingReviewSummaryProps) {
  const {
    business,
    financials,
    owners,
    existingFinancing,
    property,
    paymentProcessing,
    tradeReferences,
    authorization,
  } = application;

  const totalEquity = owners.reduce((sum, o) => sum + (Number(o.ownershipPercentage) || 0), 0);

  const formatAddress = (
    addr?: any,
    fallbackCity?: string,
    fallbackProvince?: string,
    fallbackPostal?: string
  ): string => {
    if (!addr) {
      const parts = [fallbackCity, fallbackProvince, fallbackPostal].filter(Boolean);
      return parts.length ? parts.join(", ") : "—";
    }
    if (typeof addr === "string") {
      const parts = [addr, fallbackCity, fallbackProvince, fallbackPostal].filter(Boolean);
      return parts.length ? parts.join(", ") : "—";
    }
    const street = addr.street || "";
    const city = addr.city || fallbackCity || "";
    const province = addr.province || fallbackProvince || "";
    const postal = addr.postalCode || fallbackPostal || "";
    const parts = [street, city, province, postal].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

  const formatCurrency = (val?: number | string) => {
    if (val === undefined || val === null || val === "") return "—";
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Top Highlights Banner */}
      <div className="bg-gradient-to-r from-cyan-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg border border-cyan-800/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">
              Application Summary
            </div>
            <h2 className="text-2xl font-bold tracking-tight mt-0.5">
              {business.legalName || "Untitled Application"}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              DBA: {business.tradeName || "Same as legal"} • {business.city || "—"}, {business.province || "—"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-[11px] text-cyan-200 uppercase font-medium">Requested Funding</div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(financials.amountRequested)}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 text-center">
              <div className="text-[11px] text-cyan-200 uppercase font-medium">Annual Revenue</div>
              <div className="text-xl font-bold text-emerald-300">
                {formatCurrency(financials.annualGrossRevenue)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Business Information */}
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">1. Business Information</CardTitle>
              <p className="text-xs text-muted-foreground">Entity registration, tax ID, and contact details</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditSection(0)}
            className="text-xs h-8 text-cyan-700 dark:text-cyan-400 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Legal Entity Name</span>
            <span className="font-semibold text-foreground text-sm">{business.legalName || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Trade Name / DBA</span>
            <span className="font-semibold text-foreground text-sm">{business.tradeName || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Federal Tax ID / EIN / CRA</span>
            <span className="font-semibold text-foreground text-sm">{business.federalTaxId || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Structure / Type</span>
            <span className="font-semibold text-foreground text-sm capitalize">{business.structureType || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Date Established</span>
            <span className="font-medium text-foreground">{business.dateEstablished || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Length of Ownership</span>
            <span className="font-medium text-foreground">{business.lengthOfOwnership || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Phone</span>
            <span className="font-medium text-foreground">{business.businessPhone || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Email</span>
            <span className="font-medium text-foreground">{business.businessEmail || "—"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground block text-[11px]">Physical Address</span>
            <span className="font-medium text-foreground">
              {formatAddress(business.physicalAddress, business.city, business.province, business.postalCode)}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground block text-[11px]">Industry / Nature of Business</span>
            <span className="font-medium text-foreground">
              {business.industry || "—"} {business.natureOfBusiness ? `(${business.natureOfBusiness})` : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Financial Profile & Processing */}
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">2. Financial Profile & Merchant Processing</CardTitle>
              <p className="text-xs text-muted-foreground">Revenues, funding requirements, and credit card sales</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditSection(1)}
            className="text-xs h-8 text-cyan-700 dark:text-cyan-400 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Gross Annual Sales</span>
            <span className="font-bold text-foreground text-sm">{formatCurrency(financials.annualGrossRevenue)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Avg Monthly Sales</span>
            <span className="font-semibold text-foreground text-sm">{formatCurrency(financials.averageMonthlyRevenue)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Avg Bank Balance</span>
            <span className="font-semibold text-foreground text-sm">{formatCurrency(financials.averageBankBalance)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Amount Requested</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{formatCurrency(financials.amountRequested)}</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground block text-[11px]">Use of Funds</span>
            <span className="font-medium text-foreground">{financials.useOfFunds || "Working Capital"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Accepts Credit Cards</span>
            <Badge variant={paymentProcessing.acceptsCreditCards ? "default" : "secondary"} className="mt-0.5 text-[10px]">
              {paymentProcessing.acceptsCreditCards ? "Yes" : "No"}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Card Types Accepted</span>
            <span className="font-medium text-foreground">
              {[
                paymentProcessing.visa && "Visa",
                paymentProcessing.mastercard && "MC",
                paymentProcessing.amex && "Amex",
                paymentProcessing.debit && "Debit",
              ].filter(Boolean).join(", ") || "None"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Current Processor</span>
            <span className="font-medium text-foreground">{paymentProcessing.currentProcessor || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Monthly Card Volume</span>
            <span className="font-semibold text-foreground">{formatCurrency(paymentProcessing.averageMonthlyProcessingVolume)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">High / Low Months</span>
            <span className="font-medium text-foreground">
              {paymentProcessing.highMonth || "—"} / {paymentProcessing.lowMonth || "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Ownership Structure */}
      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">3. Ownership Structure</CardTitle>
                <Badge
                  variant={totalEquity === 100 ? "default" : "outline"}
                  className={`text-[10px] ${totalEquity === 100 ? "bg-emerald-600" : "text-amber-600 border-amber-300"}`}
                >
                  {totalEquity}% Total Equity
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{owners.length} registered principal(s)</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onEditSection(2)}
            className="text-xs h-8 text-cyan-700 dark:text-cyan-400 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {owners.map((owner, idx) => (
            <div
              key={owner.id || idx}
              className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground">
                    Principal {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {owner.firstName} {owner.lastName}
                  </span>
                  {owner.isPrimary && (
                    <Badge variant="secondary" className="text-[10px]">Primary Signer</Badge>
                  )}
                </div>
                <div className="text-sm font-bold text-cyan-700 dark:text-cyan-400">
                  {owner.ownershipPercentage}% Ownership
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Title</span>
                  <span className="font-medium text-foreground">{owner.title || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Date of Birth</span>
                  <span className="font-medium text-foreground">{owner.dob || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">SSN / SIN</span>
                  <span className="font-medium text-foreground">
                    {owner.ssnOrSin ? `***-**-${owner.ssnOrSin.slice(-4)}` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Cell Phone</span>
                  <span className="font-medium text-foreground">{owner.mobilePhone || "—"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Home Address</span>
                  <span className="font-medium text-foreground">
                    {formatAddress(owner.homeAddress || owner.address, owner.city, owner.province, owner.postalCode)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Email</span>
                  <span className="font-medium text-foreground">{owner.email || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 4. Existing Financing & Property */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">4. Existing Financing</CardTitle>
                <p className="text-xs text-muted-foreground">Current MCA or loan balances</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditSection(3)}
              className="text-xs h-8 text-cyan-700 dark:text-cyan-400 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="pt-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Has Existing Balances:</span>
              <Badge variant={existingFinancing.hasExistingFinancing ? "destructive" : "secondary"}>
                {existingFinancing.hasExistingFinancing ? "Yes" : "None Reported"}
              </Badge>
            </div>
            {existingFinancing.hasExistingFinancing && (
              <div className="pt-2 border-t border-border/50 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lender Name:</span>
                  <span className="font-semibold text-foreground">{existingFinancing.lenderName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approximate Balance:</span>
                  <span className="font-bold text-foreground">{formatCurrency(existingFinancing.approximateBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily/Weekly Payment:</span>
                  <span className="font-medium text-foreground">{formatCurrency(existingFinancing.dailyOrWeeklyPayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position:</span>
                  <span className="font-medium text-foreground">{existingFinancing.position || "1st"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commercial Property */}
        <Card className="rounded-2xl border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">5. Commercial Property & Trade</CardTitle>
                <p className="text-xs text-muted-foreground">Premises status and trade references</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditSection(4)}
              className="text-xs h-8 text-cyan-700 dark:text-cyan-400 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="pt-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property Status:</span>
              <span className="font-semibold capitalize text-foreground">{property.locationType || "Leased"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Landlord / Mortgagee:</span>
              <span className="font-medium text-foreground">{property.landlordOrMortgagee || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Rent / Mortgage:</span>
              <span className="font-medium text-foreground">{formatCurrency(property.monthlyRentOrMortgage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Landlord Phone:</span>
              <span className="font-medium text-foreground">{property.landlordPhone || "—"}</span>
            </div>
            <div className="pt-2 border-t border-border/50">
              <span className="text-[11px] text-muted-foreground block mb-1">Trade References ({tradeReferences.length}):</span>
              {tradeReferences.map((tr, idx) => (
                <div key={idx} className="text-[11px] text-foreground flex justify-between py-0.5">
                  <span className="font-medium">{tr.companyName || `Vendor ${idx + 1}`}:</span>
                  <span className="text-muted-foreground">{tr.contactPerson || "—"} ({tr.phone || "—"})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Authorization & Signature */}
      {showSignatures && (
        <Card className="rounded-2xl border-border/70 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">6. Authorization & Signature</CardTitle>
                <p className="text-xs text-muted-foreground">Consent to credit pull and digital execution</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEditSection(5)}
              className="text-xs h-8 text-cyan-700 dark:text-cyan-400 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
            >
              <Pencil className="w-3.5 h-3.5 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-foreground">Credit Inquiry Authorization Acknowledged</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Applicant authorizes QuickFlo Financial and its lending partners to pull commercial and personal credit reports, verify bank records, and exchange information with credit reporting agencies.
              </p>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium">Signed Date:</span> {authorization.dateSigned || "—"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span className="font-medium">Signer:</span> {authorization.signerName || "—"} ({authorization.signerTitle || "Owner"})
              </div>
            </div>

            <div className="border rounded-xl p-3 bg-muted/20 flex flex-col items-center justify-center min-h-[100px]">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                Captured Digital Signature
              </span>
              {authorization.signatureDataUrl ? (
                <img
                  src={authorization.signatureDataUrl}
                  alt="Digital Signature"
                  className="max-h-16 object-contain"
                />
              ) : (
                <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4" />
                  No signature captured yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
