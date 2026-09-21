import React, { useState, useEffect } from "react";
import {
  BusinessFinancingApplication,
  createSampleBenchmarkApplication,
  createEmptyApplication,
  OwnerInfo,
  TradeReference,
} from "@/types/financing";
import { financingStore } from "@/lib/financing-db";
import { FinancingStepper } from "./financing-stepper";
import { FinancingLogo } from "./financing-logo";
import { FinancingSignaturePad } from "./financing-signature-pad";
import { FinancingReviewSummary } from "./financing-review-summary";
import { FinancingDatePicker } from "./financing-date-picker";
import { SmartAddressInput } from "./smart-address-input";
import { SmartIntakeModal } from "./smart-intake-modal";
import { FormattedNumberInput } from "./formatted-number-input";
import {
  validateStep0,
  validateStep1,
  validateStep2,
  validateStep5,
  formatPhone,
  formatPostalCode,
  formatSinOrSsn,
} from "./financing-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Building2,
  DollarSign,
  Users,
  CreditCard,
  MapPin,
  FileCheck2,
  Loader2,
  Save,
  ClipboardPaste,
  Phone,
  Mail,
  Globe,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface FinancingClientFormProps {
  initialData?: BusinessFinancingApplication;
  isAdminMode?: boolean;
  onSubmitSuccess?: (app: BusinessFinancingApplication) => void;
  onCancel?: () => void;
}

const DRAFT_STORAGE_KEY = "quickflo_financing_draft_v1";

export function FinancingClientForm({
  initialData,
  isAdminMode = false,
  onSubmitSuccess,
  onCancel,
}: FinancingClientFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [smartIntakeOpen, setSmartIntakeOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ownerErrors, setOwnerErrors] = useState<Record<number, Record<string, string>>>({});
  const [app, setApp] = useState<BusinessFinancingApplication>(() => {
    if (initialData) return initialData;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return createEmptyApplication();
  });

  // Autosave draft on change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(app));
    } catch {
      // ignore
    }
  }, [app]);

  // Nested state updater helpers
  const updateBusiness = (field: keyof BusinessFinancingApplication["business"], value: any) => {
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const copy = { ...prev };
      delete copy[field as string];
      return copy;
    });
    setApp((prev) => ({
      ...prev,
      business: { ...prev.business, [field]: value },
    }));
  };

  const updateFinancials = (field: keyof BusinessFinancingApplication["financials"], value: any) => {
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const copy = { ...prev };
      delete copy[field as string];
      return copy;
    });
    setApp((prev) => ({
      ...prev,
      financials: { ...prev.financials, [field]: value },
    }));
  };

  const updatePaymentProcessing = (field: keyof BusinessFinancingApplication["paymentProcessing"], value: any) => {
    setApp((prev) => ({
      ...prev,
      paymentProcessing: { ...prev.paymentProcessing, [field]: value },
    }));
  };

  const updateExistingFinancing = (field: keyof BusinessFinancingApplication["existingFinancing"], value: any) => {
    setApp((prev) => ({
      ...prev,
      existingFinancing: { ...prev.existingFinancing, [field]: value },
    }));
  };

  const updateProperty = (field: keyof BusinessFinancingApplication["property"], value: any) => {
    setApp((prev) => ({
      ...prev,
      property: { ...prev.property, [field]: value },
    }));
  };

  const updateAuthorization = (field: keyof BusinessFinancingApplication["authorization"], value: any) => {
    setErrors((prev) => {
      if (!prev[field as string]) return prev;
      const copy = { ...prev };
      delete copy[field as string];
      return copy;
    });
    setApp((prev) => ({
      ...prev,
      authorization: { ...prev.authorization, [field]: value },
    }));
  };

  // Owners array management
  const updateOwner = (index: number, field: keyof OwnerInfo, value: any) => {
    setOwnerErrors((prev) => {
      if (!prev[index]?.[field as string]) return prev;
      const copy = { ...prev };
      const row = { ...copy[index] };
      delete row[field as string];
      copy[index] = row;
      return copy;
    });
    setApp((prev) => {
      const newOwners = [...prev.owners];
      newOwners[index] = { ...newOwners[index], [field]: value };
      return { ...prev, owners: newOwners };
    });
  };

  const addOwner = () => {
    if (app.owners.length >= 4) {
      toast.info("Maximum 4 owners allowed");
      return;
    }
    setApp((prev) => ({
      ...prev,
      owners: [
        ...prev.owners,
        {
          id: `owner_${Date.now()}`,
          firstName: "",
          lastName: "",
          title: "Partner",
          ownershipPercentage: 0,
          isPrimary: false,
          homeAddress: "",
          city: "",
          province: "ON",
          postalCode: "",
          dob: "1985-01-01",
          sin: "",
          ssnOrSin: "",
          housingStatus: "rent" as const,
          yearsAtResidence: 1,
          address: { street: "", city: "", province: "ON", postalCode: "" },
          phone: "",
          mobilePhone: "",
          mobile: "",
          email: "",
        },
      ],
    }));
  };

  const removeOwner = (index: number) => {
    if (app.owners.length <= 1) {
      toast.error("At least one principal owner is required");
      return;
    }
    setApp((prev) => {
      const newOwners = prev.owners.filter((_, i) => i !== index);
      // Ensure at least one is primary
      if (!newOwners.some((o) => o.isPrimary) && newOwners.length > 0) {
        newOwners[0].isPrimary = true;
      }
      return { ...prev, owners: newOwners };
    });
  };

  // Trade references management
  const updateTradeReference = (index: number, field: keyof TradeReference, value: any) => {
    setApp((prev) => {
      const newRefs = [...prev.tradeReferences];
      newRefs[index] = { ...newRefs[index], [field]: value };
      return { ...prev, tradeReferences: newRefs };
    });
  };

  const addTradeReference = () => {
    if (app.tradeReferences.length >= 4) return;
    setApp((prev) => ({
      ...prev,
      tradeReferences: [
        ...prev.tradeReferences,
        {
          id: `ref_${Date.now()}`,
          businessName: "",
          companyName: "",
          accountNumber: "",
          contactName: "",
          contactPerson: "",
          contactPhone: "",
          phone: "",
        },
      ],
    }));
  };

  const removeTradeReference = (index: number) => {
    setApp((prev) => ({
      ...prev,
      tradeReferences: prev.tradeReferences.filter((_, i) => i !== index),
    }));
  };

  // Quick load benchmark sample
  const handleLoadSample = () => {
    const sample = createSampleBenchmarkApplication();
    setApp(sample);
    toast.success("Loaded benchmark sample data: Apex Precision Engineering Inc.");
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    if (step === 0) {
      const errs = validateStep0(app.business);
      setErrors(errs);
      const keys = Object.keys(errs);
      if (keys.length > 0) {
        toast.error(errs[keys[0]]);
        return false;
      }
    }

    if (step === 1) {
      const errs = validateStep1(app.financials, app.paymentProcessing);
      setErrors(errs);
      const keys = Object.keys(errs);
      if (keys.length > 0) {
        toast.error(errs[keys[0]]);
        return false;
      }
    }

    if (step === 2) {
      const { general, fieldErrors } = validateStep2(app.owners);
      setOwnerErrors(fieldErrors);
      if (general) {
        toast.error(general);
        return false;
      }
      const ownerKeys = Object.keys(fieldErrors);
      if (ownerKeys.length > 0) {
        const firstIdx = Number(ownerKeys[0]);
        const firstErrKey = Object.keys(fieldErrors[firstIdx])[0];
        toast.error(`Principal ${firstIdx + 1}: ${fieldErrors[firstIdx][firstErrKey]}`);
        return false;
      }
    }

    if (step === 5) {
      const errs = validateStep5(app.authorization);
      setErrors(errs);
      const keys = Object.keys(errs);
      if (keys.length > 0) {
        toast.error(errs[keys[0]]);
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setSubmitting(true);
    try {
      // Sync signer name with primary owner if empty
      const primaryOwner = app.owners.find((o) => o.isPrimary) || app.owners[0];
      const signerName = app.authorization.signerName || `${primaryOwner.firstName} ${primaryOwner.lastName}`.trim();
      const dateSigned = app.authorization.dateSigned || new Date().toISOString().split("T")[0];

      const finalizedApp: BusinessFinancingApplication = {
        ...app,
        status: "submitted",
        updatedAt: new Date().toISOString(),
        authorization: {
          ...app.authorization,
          signerName,
          signerTitle: app.authorization.signerTitle || primaryOwner.title || "President / Owner",
          dateSigned,
          ipAddress: "Client Browser E-Sign",
        },
      };

      const saved = await financingStore.saveApplication(finalizedApp);

      // Clear draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      toast.success("Application submitted successfully!");
      if (onSubmitSuccess) {
        onSubmitSuccess(saved);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalEquity = app.owners.reduce((s, o) => s + (Number(o.ownershipPercentage) || 0), 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Header Card */}
      <Card className="border-border/80 shadow-md bg-card overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-border/60 bg-gradient-to-r from-cyan-950/20 via-background to-background flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <FinancingLogo height={42} />
            <div className="border-l border-border/80 pl-4">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Commercial Capital Application
              </h1>
              <p className="text-xs text-muted-foreground">
                Multi-Lender Automated Underwriting & Instant Document Generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSmartIntakeOpen(true)}
              className="text-xs h-8 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
            >
              <ClipboardPaste className="w-3.5 h-3.5 mr-1 text-cyan-600" />
              Smart Paste Intake
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              className="text-xs h-8 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-cyan-600" />
              Fill Sample Data
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs h-8">
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="p-4 sm:p-6 bg-muted/10 border-b border-border/60">
          <FinancingStepper currentStep={currentStep} onStepClick={(step) => setCurrentStep(step)} />
        </div>
      </Card>

      {/* Form Step Body */}
      <div className="space-y-6">
        {/* STEP 0: BUSINESS INFORMATION */}
        {currentStep === 0 && (
          <Card className="rounded-2xl border-border/80 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Business Information</CardTitle>
                  <CardDescription className="text-xs">
                    Please provide the legal operating and tax registration details of your company
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Legal Corporate Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Apex Precision Engineering Inc."
                    value={app.business.legalName}
                    onChange={(e) => updateBusiness("legalName", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={cn("text-sm", errors.legalName && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.legalName && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.legalName}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Trade Name / DBA (if different)</Label>
                  <Input
                    placeholder="e.g. Apex Dynamics"
                    value={app.business.tradeName}
                    onChange={(e) => updateBusiness("tradeName", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Business Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="(555) 000-0000"
                    value={app.business.businessPhone}
                    onChange={(e) => updateBusiness("businessPhone", e.target.value)}
                    onBlur={(e) => updateBusiness("businessPhone", formatPhone(e.target.value))}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={cn("text-sm", errors.businessPhone && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.businessPhone && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.businessPhone}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Business Email</Label>
                  <Input
                    type="email"
                    placeholder="finance@company.com"
                    value={app.business.businessEmail}
                    onChange={(e) => updateBusiness("businessEmail", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={cn("text-sm", errors.businessEmail && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.businessEmail && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.businessEmail}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Website (Optional)</Label>
                  <Input
                    placeholder="www.company.com"
                    value={app.business.website || ""}
                    onChange={(e) => updateBusiness("website", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <SmartAddressInput
                  label="Physical Operating Street Address"
                  streetValue={typeof app.business.physicalAddress === "string" ? app.business.physicalAddress : app.business.physicalAddress?.street || ""}
                  onStreetChange={(str) => {
                    const prev = typeof app.business.physicalAddress === "object" ? app.business.physicalAddress : { city: "", province: "ON", postalCode: "" };
                    updateBusiness("physicalAddress", { ...prev, street: str });
                  }}
                  onAddressParsed={(parsed) => {
                    updateBusiness("physicalAddress", {
                      street: parsed.street,
                      city: parsed.city,
                      province: parsed.province,
                      postalCode: parsed.postalCode,
                    });
                    if (parsed.city) updateBusiness("city", parsed.city);
                    if (parsed.province) updateBusiness("province", parsed.province);
                    if (parsed.postalCode) updateBusiness("postalCode", parsed.postalCode);
                    if (parsed.country) updateBusiness("country", parsed.country);
                  }}
                  required
                />
                {errors.physicalAddress && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.physicalAddress}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">City</Label>
                  <Input
                    placeholder="Toronto / New York"
                    value={app.business.city}
                    onChange={(e) => updateBusiness("city", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Province / State</Label>
                  <Input
                    placeholder="ON / NY"
                    value={app.business.province}
                    onChange={(e) => updateBusiness("province", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Postal / ZIP Code</Label>
                  <Input
                    placeholder="M5V 2T6"
                    value={app.business.postalCode}
                    onChange={(e) => updateBusiness("postalCode", e.target.value)}
                    onBlur={(e) => updateBusiness("postalCode", formatPostalCode(e.target.value))}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={cn("text-sm", errors.postalCode && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.postalCode && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.postalCode}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Country</Label>
                  <Select
                    value={app.business.country || "Canada"}
                    onValueChange={(val) => updateBusiness("country", val)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="USA">United States</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/50">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Federal Tax ID / EIN / Business #</Label>
                  <Input
                    placeholder="e.g. 123456789 RT0001"
                    value={app.business.federalTaxId}
                    onChange={(e) => updateBusiness("federalTaxId", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Entity Structure</Label>
                  <Select
                    value={app.business.structureType}
                    onValueChange={(val) => updateBusiness("structureType", val as any)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporation">Corporation (Inc./Ltd./Corp)</SelectItem>
                      <SelectItem value="llc">LLC / Limited Company</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Date Established / Incorporated</Label>
                  <FinancingDatePicker
                    mode="established"
                    value={app.business.dateEstablished}
                    onChange={(val) => updateBusiness("dateEstablished", val)}
                    placeholder="YYYY-MM-DD"
                  />
                  {errors.dateEstablished && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.dateEstablished}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Length of Ownership</Label>
                  <Input
                    placeholder="e.g. 7 years"
                    value={app.business.lengthOfOwnership}
                    onChange={(e) => updateBusiness("lengthOfOwnership", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Industry / Sector</Label>
                  <Input
                    placeholder="e.g. Manufacturing / Precision CNC"
                    value={app.business.industry}
                    onChange={(e) => updateBusiness("industry", e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nature of Business</Label>
                  <Input
                    placeholder="e.g. Aerospace & Automotive Parts"
                    value={app.business.natureOfBusiness || ""}
                    onChange={(e) => updateBusiness("natureOfBusiness", e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 1: FINANCIALS & SALES */}
        {currentStep === 1 && (
          <Card className="rounded-2xl border-border/80 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Financial Profile & Merchant Processing</CardTitle>
                  <CardDescription className="text-xs">
                    Input your annual and monthly turnover, funding request, and credit card sales volume
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Funding Request Banner */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-cyan-900 dark:text-cyan-200">
                    Amount Requested ($) <span className="text-destructive">*</span>
                  </Label>
                  <FormattedNumberInput
                    prefix="$"
                    placeholder="150,000"
                    value={app.financials.amountRequested || ""}
                    onValueChange={(val) => updateFinancials("amountRequested", val || 0)}
                    className={cn("text-lg font-bold bg-background", errors.amountRequested && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.amountRequested && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.amountRequested}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-cyan-900 dark:text-cyan-200">Use of Funds</Label>
                  <Input
                    placeholder="e.g. Equipment Purchase, Working Capital"
                    value={app.financials.useOfFunds}
                    onChange={(e) => updateFinancials("useOfFunds", e.target.value)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="text-sm bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-cyan-900 dark:text-cyan-200">Preferred Term</Label>
                  <Select
                    value={app.financials.preferredTerm || "12 months"}
                    onValueChange={(val) => updateFinancials("preferredTerm", val)}
                  >
                    <SelectTrigger className="text-sm bg-background">
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6 months">6 Months</SelectItem>
                      <SelectItem value="9 months">9 Months</SelectItem>
                      <SelectItem value="12 months">12 Months</SelectItem>
                      <SelectItem value="18 months">18 Months</SelectItem>
                      <SelectItem value="24 months">24 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Revenue Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Gross Annual Sales ($) <span className="text-destructive">*</span>
                  </Label>
                  <FormattedNumberInput
                    prefix="$"
                    placeholder="2,850,000"
                    value={app.financials.annualGrossRevenue || ""}
                    onValueChange={(val) => updateFinancials("annualGrossRevenue", val || 0)}
                    className={cn("text-sm", errors.annualGrossRevenue && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors.annualGrossRevenue && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.annualGrossRevenue}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Average Monthly Sales ($)</Label>
                  <FormattedNumberInput
                    prefix="$"
                    placeholder="237,500"
                    value={app.financials.averageMonthlyRevenue || ""}
                    onValueChange={(val) => updateFinancials("averageMonthlyRevenue", val || 0)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Average Bank Balance ($)</Label>
                  <FormattedNumberInput
                    prefix="$"
                    placeholder="45,000"
                    value={app.financials.averageBankBalance || ""}
                    onValueChange={(val) => updateFinancials("averageBankBalance", val || 0)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Merchant / Credit Card Processing Section */}
              <div className="pt-4 border-t border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Credit Card & Debit Processing</h3>
                    <p className="text-xs text-muted-foreground">Does your business accept credit and debit card payments?</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accepts-cards"
                      checked={app.paymentProcessing.acceptsCreditCards}
                      onCheckedChange={(checked) => updatePaymentProcessing("acceptsCreditCards", !!checked)}
                    />
                    <label htmlFor="accepts-cards" className="text-xs font-semibold cursor-pointer">
                      Yes, We Accept Cards
                    </label>
                  </div>
                </div>

                {app.paymentProcessing.acceptsCreditCards && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Card Types Accepted (Check all that apply)</Label>
                      <div className="flex flex-wrap gap-4 pt-1">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={app.paymentProcessing.visa}
                            onCheckedChange={(c) => updatePaymentProcessing("visa", !!c)}
                          />
                          <span>Visa</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={app.paymentProcessing.mastercard}
                            onCheckedChange={(c) => updatePaymentProcessing("mastercard", !!c)}
                          />
                          <span>Mastercard</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={app.paymentProcessing.amex}
                            onCheckedChange={(c) => updatePaymentProcessing("amex", !!c)}
                          />
                          <span>American Express</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={app.paymentProcessing.debit}
                            onCheckedChange={(c) => updatePaymentProcessing("debit", !!c)}
                          />
                          <span>Interac / Debit</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Current Card Processor</Label>
                        <Input
                          placeholder="e.g. Moneris, Chase, Stripe"
                          value={app.paymentProcessing.currentProcessor || ""}
                          onChange={(e) => updatePaymentProcessing("currentProcessor", e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Avg Monthly Card Volume ($)</Label>
                        <FormattedNumberInput
                          prefix="$"
                          placeholder="42,000"
                          value={app.paymentProcessing.averageMonthlyProcessingVolume || ""}
                          onValueChange={(val) => updatePaymentProcessing("averageMonthlyProcessingVolume", val || 0)}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">High Volume Month</Label>
                        <Input
                          placeholder="e.g. October ($68,000)"
                          value={app.paymentProcessing.highMonth || ""}
                          onChange={(e) => updatePaymentProcessing("highMonth", e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Low Volume Month</Label>
                        <Input
                          placeholder="e.g. February ($25,000)"
                          value={app.paymentProcessing.lowMonth || ""}
                          onChange={(e) => updatePaymentProcessing("lowMonth", e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: PRINCIPALS & OWNERS */}
        {currentStep === 2 && (
          <Card className="rounded-2xl border-border/80 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">Principals & Ownership Structure</CardTitle>
                    <CardDescription className="text-xs">
                      Provide details for all beneficial owners with 20%+ ownership
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={totalEquity === 100 ? "default" : "outline"}
                    className={`text-xs ${totalEquity === 100 ? "bg-emerald-600" : "text-amber-600 border-amber-300"}`}
                  >
                    {totalEquity}% Total Equity Accounted For
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOwner}
                    className="h-8 text-xs text-purple-700 dark:text-purple-400 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Owner
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {app.owners.map((owner, idx) => (
                <div
                  key={owner.id || idx}
                  className="p-5 rounded-2xl border border-border/80 bg-muted/15 space-y-4 relative"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                        Principal #{idx + 1}
                      </span>
                      {idx === 0 && (
                        <Badge variant="secondary" className="text-[10px]">Primary Signer</Badge>
                      )}
                    </div>
                    {app.owners.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOwner(idx)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove Owner
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        First Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="John"
                        value={owner.firstName}
                        onChange={(e) => updateOwner(idx, "firstName", e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className={cn("text-sm", ownerErrors[idx]?.firstName && "border-destructive focus-visible:ring-destructive")}
                      />
                      {ownerErrors[idx]?.firstName && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].firstName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Last Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="Doe"
                        value={owner.lastName}
                        onChange={(e) => updateOwner(idx, "lastName", e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className={cn("text-sm", ownerErrors[idx]?.lastName && "border-destructive focus-visible:ring-destructive")}
                      />
                      {ownerErrors[idx]?.lastName && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].lastName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Title</Label>
                      <Input
                        placeholder="President / CEO"
                        value={owner.title}
                        onChange={(e) => updateOwner(idx, "title", e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-purple-900 dark:text-purple-200">
                        Ownership % <span className="text-destructive">*</span>
                      </Label>
                      <FormattedNumberInput
                        suffix="%"
                        max={100}
                        placeholder="100"
                        value={owner.ownershipPercentage || ""}
                        onValueChange={(val) => updateOwner(idx, "ownershipPercentage", val || 0)}
                        className={cn("text-sm font-bold", ownerErrors[idx]?.ownershipPercentage && "border-destructive focus-visible:ring-destructive")}
                      />
                      {ownerErrors[idx]?.ownershipPercentage && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].ownershipPercentage}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">SSN / SIN</Label>
                      <Input
                        placeholder="999-999-999"
                        value={owner.ssnOrSin}
                        onChange={(e) => updateOwner(idx, "ssnOrSin", e.target.value)}
                        onBlur={(e) => updateOwner(idx, "ssnOrSin", formatSinOrSsn(e.target.value))}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className={cn("text-sm", ownerErrors[idx]?.ssnOrSin && "border-destructive focus-visible:ring-destructive")}
                      />
                      {ownerErrors[idx]?.ssnOrSin && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].ssnOrSin}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Date of Birth <span className="text-destructive">*</span>
                      </Label>
                      <FinancingDatePicker
                        mode="dob"
                        value={owner.dob}
                        onChange={(val) => updateOwner(idx, "dob", val)}
                        placeholder="YYYY-MM-DD"
                      />
                      {ownerErrors[idx]?.dob && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].dob}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Mobile Phone <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="(555) 000-0000"
                        value={owner.mobilePhone}
                        onChange={(e) => updateOwner(idx, "mobilePhone", e.target.value)}
                        onBlur={(e) => updateOwner(idx, "mobilePhone", formatPhone(e.target.value))}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className={cn("text-sm", ownerErrors[idx]?.mobilePhone && "border-destructive focus-visible:ring-destructive")}
                      />
                      {ownerErrors[idx]?.mobilePhone && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].mobilePhone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <SmartAddressInput
                        label="Home Street Address"
                        streetValue={owner.homeAddress || (typeof owner.address === "object" ? owner.address?.street : "") || ""}
                        onStreetChange={(str) => {
                          updateOwner(idx, "homeAddress", str);
                          const prevAddr = typeof owner.address === "object" ? owner.address : { city: "", province: "ON", postalCode: "" };
                          updateOwner(idx, "address", { ...prevAddr, street: str });
                        }}
                        onAddressParsed={(parsed) => {
                          updateOwner(idx, "homeAddress", parsed.street);
                          updateOwner(idx, "address", {
                            street: parsed.street,
                            city: parsed.city,
                            province: parsed.province,
                            postalCode: parsed.postalCode,
                          });
                          if (parsed.city) updateOwner(idx, "city", parsed.city);
                          if (parsed.province) updateOwner(idx, "province", parsed.province);
                          if (parsed.postalCode) updateOwner(idx, "postalCode", parsed.postalCode);
                        }}
                        required
                      />
                      {ownerErrors[idx]?.homeAddress && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].homeAddress}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Personal Email</Label>
                      <Input
                        type="email"
                        placeholder="john.doe@gmail.com"
                        value={owner.email}
                        onChange={(e) => updateOwner(idx, "email", e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className={cn("text-sm", ownerErrors[idx]?.email && "border-destructive focus-visible:ring-destructive")}
                      />
                      {ownerErrors[idx]?.email && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">City</Label>
                      <Input
                        placeholder="Toronto"
                        value={owner.city}
                        onChange={(e) => updateOwner(idx, "city", e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Province / State</Label>
                      <Input
                        placeholder="ON"
                        value={owner.province}
                        onChange={(e) => updateOwner(idx, "province", e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Postal / ZIP Code</Label>
                      <Input
                        placeholder="M4B 1B3"
                        value={owner.postalCode}
                        onChange={(e) => updateOwner(idx, "postalCode", e.target.value)}
                        onBlur={(e) => updateOwner(idx, "postalCode", formatPostalCode(e.target.value))}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className={cn("text-sm", ownerErrors[idx]?.postalCode && "border-destructive focus-visible:ring-destructive")}
                      />
                      {ownerErrors[idx]?.postalCode && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {ownerErrors[idx].postalCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* STEP 3: EXISTING FINANCING */}
        {currentStep === 3 && (
          <Card className="rounded-2xl border-border/80 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Existing Financing & Debt Schedule</CardTitle>
                  <CardDescription className="text-xs">
                    Disclose any current active commercial loans, lines of credit, or MCA advances
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="p-4 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Do you have existing commercial financing or MCA?</h3>
                  <p className="text-xs text-muted-foreground">Lenders require transparency on existing liens and daily remittances</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-financing"
                    checked={app.existingFinancing.hasExistingFinancing}
                    onCheckedChange={(checked) => updateExistingFinancing("hasExistingFinancing", !!checked)}
                  />
                  <label htmlFor="has-financing" className="text-xs font-semibold cursor-pointer">
                    Yes, We Have Existing Financing
                  </label>
                </div>
              </div>

              {app.existingFinancing.hasExistingFinancing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Lender / Funder Name</Label>
                    <Input
                      placeholder="e.g. OnDeck, Clearco, Bank of Montreal"
                      value={app.existingFinancing.lenderName || ""}
                      onChange={(e) => updateExistingFinancing("lenderName", e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="text-sm bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Approximate Balance ($)</Label>
                    <FormattedNumberInput
                      prefix="$"
                      placeholder="28,000"
                      value={app.existingFinancing.approximateBalance || ""}
                      onValueChange={(val) => updateExistingFinancing("approximateBalance", val || 0)}
                      className="text-sm bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Daily or Weekly Payment ($)</Label>
                    <FormattedNumberInput
                      prefix="$"
                      placeholder="1,200"
                      value={app.existingFinancing.dailyOrWeeklyPayment || ""}
                      onValueChange={(val) => updateExistingFinancing("dailyOrWeeklyPayment", val || 0)}
                      className="text-sm bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Position</Label>
                    <Select
                      value={app.existingFinancing.position || "1st"}
                      onValueChange={(val) => updateExistingFinancing("position", val)}
                    >
                      <SelectTrigger className="text-sm bg-background">
                        <SelectValue placeholder="Position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st">1st Position</SelectItem>
                        <SelectItem value="2nd">2nd Position</SelectItem>
                        <SelectItem value="3rd">3rd Position</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-border rounded-xl">
                  No existing debt declared. Your application is eligible for 1st position rates.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 4: COMMERCIAL PROPERTY & TRADE */}
        {currentStep === 4 && (
          <Card className="rounded-2xl border-border/80 shadow-sm animate-fade-in">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Commercial Property & Trade References</CardTitle>
                  <CardDescription className="text-xs">
                    Information regarding your operating facility and wholesale vendor relationships
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Premises status */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground">Facility & Property Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Premises Type</Label>
                    <Select
                      value={app.property.locationType}
                      onValueChange={(val) => updateProperty("locationType", val as any)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leased">Commercial Lease</SelectItem>
                        <SelectItem value="owned">Owned Real Estate</SelectItem>
                        <SelectItem value="home">Home-based Office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Landlord / Mortgagee Name</Label>
                    <Input
                      placeholder="e.g. Skyline Commercial REIT"
                      value={app.property.landlordOrMortgagee || ""}
                      onChange={(e) => updateProperty("landlordOrMortgagee", e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Monthly Rent / Mortgage ($)</Label>
                    <FormattedNumberInput
                      prefix="$"
                      placeholder="8,500"
                      value={app.property.monthlyRentOrMortgage || ""}
                      onValueChange={(val) => updateProperty("monthlyRentOrMortgage", val || 0)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Landlord / Contact Phone</Label>
                    <Input
                      placeholder="(555) 000-0000"
                      value={app.property.landlordPhone || ""}
                      onChange={(e) => updateProperty("landlordPhone", e.target.value)}
                      onBlur={(e) => updateProperty("landlordPhone", formatPhone(e.target.value))}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Trade References */}
              <div className="pt-4 border-t border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Supplier / Trade References</h3>
                    <p className="text-xs text-muted-foreground">Up to 2 wholesale vendors required for CanaCap underwriting</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTradeReference}
                    disabled={app.tradeReferences.length >= 2}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Supplier
                  </Button>
                </div>

                <div className="space-y-4">
                  {app.tradeReferences.map((tr, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-border/60 bg-muted/15 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Supplier #{idx + 1}</span>
                        {app.tradeReferences.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTradeReference(idx)}
                            className="h-6 text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Company / Supplier Name</Label>
                          <Input
                            placeholder="e.g. AlumaCraft Extrusions"
                            value={tr.companyName}
                            onChange={(e) => updateTradeReference(idx, "companyName", e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Account Number</Label>
                          <Input
                            placeholder="e.g. AC-99214"
                            value={tr.accountNumber || ""}
                            onChange={(e) => updateTradeReference(idx, "accountNumber", e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Contact Person</Label>
                          <Input
                            placeholder="e.g. Gary Vance"
                            value={tr.contactPerson || ""}
                            onChange={(e) => updateTradeReference(idx, "contactPerson", e.target.value)}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold">Contact Phone</Label>
                          <Input
                            placeholder="(555) 000-0000"
                            value={tr.phone || ""}
                            onChange={(e) => updateTradeReference(idx, "phone", e.target.value)}
                            onBlur={(e) => updateTradeReference(idx, "phone", formatPhone(e.target.value))}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: REVIEW & SIGN */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            {/* Review Summary */}
            <FinancingReviewSummary
              application={app}
              onEditSection={(step) => setCurrentStep(step)}
              showSignatures={false}
            />

            {/* Credit Authorization Legal Card */}
            <Card className="rounded-2xl border-cyan-800/40 shadow-md bg-card">
              <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">
                      Credit Inquiry & Commercial Information Authorization
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Legal disclosure & digital execution under the Fair Credit Reporting Act (FCRA) and PIPEDA
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div className="p-4 rounded-xl bg-muted/40 border border-border/80 text-xs text-muted-foreground leading-relaxed max-h-36 overflow-y-auto space-y-2">
                  <p>
                    By signing below, the undersigned individual(s) and applicant business entity hereby authorize QuickFlo Financial, its direct lending affiliates, assignees, and underwriting partners to obtain commercial and consumer credit reports, verify bank account statements, tax filings, and trade references in connection with this application.
                  </p>
                  <p>
                    The applicant represents and warrants that all statements and information contained in this application are true, correct, and complete. The applicant understands that false statements or omissions may constitute commercial fraud. This digital authorization shall be valid and enforceable as an original document pursuant to the Electronic Signatures in Global and National Commerce Act (E-SIGN) and the Uniform Electronic Commerce Act (UECA).
                  </p>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                  <Checkbox
                    id="credit-consent"
                    checked={app.authorization.creditCheckConsent}
                    onCheckedChange={(checked) => updateAuthorization("creditCheckConsent", !!checked)}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor="credit-consent"
                      className="text-xs font-bold text-foreground cursor-pointer block"
                    >
                      I agree and authorize QuickFlo Financial & underwriting partners to perform credit and banking verifications <span className="text-destructive">*</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      I confirm I am authorized to bind the business and consent to soft and/or hard credit inquiries for financing evaluation.
                    </p>
                    {errors.creditCheckConsent && (
                      <p className="text-[11px] font-medium text-destructive flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.creditCheckConsent}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Signer Legal Name</Label>
                    <Input
                      placeholder="Full Legal Name"
                      value={
                        app.authorization.signerName ||
                        (app.owners[0] ? `${app.owners[0].firstName} ${app.owners[0].lastName}`.trim() : "")
                      }
                      onChange={(e) => updateAuthorization("signerName", e.target.value)}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date Signed</Label>
                    <FinancingDatePicker
                      mode="signed"
                      value={app.authorization.dateSigned || new Date().toISOString().split("T")[0]}
                      onChange={(val) => updateAuthorization("dateSigned", val)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>

                {/* Digital Signature Pad */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-bold text-foreground block">
                    Principal E-Signature <span className="text-destructive">*</span>
                  </Label>
                  <FinancingSignaturePad
                    value={app.authorization.signatureDataUrl}
                    signerName={
                      app.authorization.signerName ||
                      (app.owners[0] ? `${app.owners[0].firstName} ${app.owners[0].lastName}` : "")
                    }
                    onChange={(dataUrl) => updateAuthorization("signatureDataUrl", dataUrl)}
                  />
                  {errors.signatureDataUrl && (
                    <p className="text-[11px] font-medium text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.signatureDataUrl}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <SmartIntakeModal
        open={smartIntakeOpen}
        onOpenChange={setSmartIntakeOpen}
        onApplyData={(updater) => setApp(updater)}
      />

      {/* Navigation Footer */}
      <Card className="rounded-2xl border-border/80 shadow-md p-4 bg-card flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || submitting}
          className="text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Previous Step
        </Button>

        <div className="text-xs text-muted-foreground hidden sm:block">
          Step {currentStep + 1} of 6: {["Business", "Financials", "Owners", "Financing", "Property", "Review & Sign"][currentStep]}
        </div>

        {currentStep < 5 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Submitting & Generating PDFs...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Complete & Submit Application
              </>
            )}
          </Button>
        )}
      </Card>
    </div>
  );
}
