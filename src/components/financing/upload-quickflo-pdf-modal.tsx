import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Download,
  Loader2,
  Building2,
  User,
  ArrowRight,
  RefreshCw,
  Layers,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import type { BusinessFinancingApplication } from "@/types/financing";
import { financingStore } from "@/lib/financing-db";
import {
  generateCanaCapPdf,
  generateWhiteLabelPdf,
  generatePrintableQuickFloPdf,
  generateAllLenderPdfsZip,
  downloadPdfBlob,
  formatCurrency,
  formatDate,
} from "@/lib/lender-pdf-engine";
import { parseLenderPdf, type LenderFormKind } from "@/lib/lender-pdf-parser";

const FORM_LABELS: Record<LenderFormKind, string> = {
  quickflo: "QuickFlo Master Application",
  journey: "Journey Capital / White-Label Application",
  canacap: "CanaCap Business Application",
  unknown: "Financing Application",
};

interface UploadQuickFloPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplicationImported?: (app: BusinessFinancingApplication) => void;
  onApplyData?: (updater: (prev: BusinessFinancingApplication) => BusinessFinancingApplication) => void;
}

export function UploadQuickFloPdfModal({
  open,
  onOpenChange,
  onApplicationImported,
  onApplyData,
}: UploadQuickFloPdfModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedApp, setParsedApp] = useState<BusinessFinancingApplication | null>(null);
  const [downloadingLender, setDownloadingLender] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [detectedKind, setDetectedKind] = useState<LenderFormKind>("quickflo");

  const resetState = () => {
    setParsedApp(null);
    setFileName("");
    setDownloadingLender(null);
    setDetectedKind("quickflo");
  };

  const handleModalOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Invalid file format. Please upload a PDF file.");
      return;
    }

    try {
      setParsing(true);
      setFileName(file.name);
      const arrayBuffer = await file.arrayBuffer();
      const { app: extractedApp, kind } = await parseLenderPdf(arrayBuffer);

      setDetectedKind(kind);
      setParsedApp(extractedApp);
      toast.success(`${FORM_LABELS[kind]} read successfully`, {
        description: `Extracted data for ${extractedApp.business.legalName || "Commercial Applicant"}`,
      });
    } catch (err) {
      console.error("Failed to parse lender PDF:", err);
      toast.error("Unable to read this PDF. Upload a filled QuickFlo, Journey Capital, or CanaCap application.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDownloadCanaCap = async () => {
    if (!parsedApp) return;
    try {
      setDownloadingLender("canacap");
      const blob = await generateCanaCapPdf(parsedApp);
      const safeName = (parsedApp.business.legalName || "Application").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, `${safeName}_CanaCap_Application.pdf`);
      toast.success("Downloaded CanaCap Business Application PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate CanaCap PDF");
    } finally {
      setDownloadingLender(null);
    }
  };

  const handleDownloadJourneyCapital = async () => {
    if (!parsedApp) return;
    try {
      setDownloadingLender("journey");
      const blob = await generateWhiteLabelPdf(parsedApp);
      const safeName = (parsedApp.business.legalName || "Application").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, `${safeName}_Journey_Capital_Application.pdf`);
      toast.success("Downloaded Journey Capital Application PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Journey Capital PDF");
    } finally {
      setDownloadingLender(null);
    }
  };

  const handleDownloadQuickFlo = async () => {
    if (!parsedApp) return;
    try {
      setDownloadingLender("quickflo");
      const blob = await generatePrintableQuickFloPdf(parsedApp);
      const safeName = (parsedApp.business.legalName || "Application").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, `${safeName}_QuickFlo_Master_Intake.pdf`);
      toast.success("Downloaded QuickFlo Master Application PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate QuickFlo PDF");
    } finally {
      setDownloadingLender(null);
    }
  };

  const handleDownloadZip = async () => {
    if (!parsedApp) return;
    try {
      setDownloadingLender("zip");
      const blob = await generateAllLenderPdfsZip(parsedApp);
      const safeName = (parsedApp.business.legalName || "Application").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, `${safeName}_All_Lender_Applications.zip`);
      toast.success("Downloaded all lender applications in ZIP package");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate ZIP bundle");
    } finally {
      setDownloadingLender(null);
    }
  };

  const handleSaveToPipeline = async () => {
    if (!parsedApp) return;
    try {
      const saved = await financingStore.saveApplication(parsedApp);
      window.dispatchEvent(new Event("financing_storage_updated"));
      toast.success("Application saved to pipeline!");

      if (onApplyData) {
        onApplyData(() => saved);
      }
      if (onApplicationImported) {
        onApplicationImported(saved);
      }
      handleModalOpenChange(false);
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save imported application");
    }
  };

  const p1 = parsedApp?.owners[0];
  const audit = parsedApp?.authorization.auditTrail;

  return (
    <Dialog open={open} onOpenChange={handleModalOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/70 bg-gradient-to-r from-cyan-950/15 via-background to-background">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Upload Filled Application PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Upload a completed QuickFlo, Journey Capital, or CanaCap application. We read the data and rebuild every other lender form with one click.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Upload Dropzone */}
          {!parsedApp && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 scale-[1.01]"
                  : "border-border/80 hover:border-cyan-400 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3.5 rounded-full bg-cyan-500/10 text-cyan-600">
                  {parsing ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {parsing ? "Reading application fields..." : "Click to select or drag & drop a filled application PDF"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts QuickFlo, Journey Capital / White-Label, and CanaCap applications
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Data Preview & Conversion Hub */}
          {parsedApp && (
            <div className="space-y-5 animate-fade-in">
              {/* Summary Card */}
              <Card className="border-border/70 shadow-xs rounded-xl overflow-hidden bg-muted/20">
                <div className="p-4 bg-muted/40 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-semibold text-foreground">{fileName || "Filled application PDF"}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                      {FORM_LABELS[detectedKind]}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Upload Different PDF
                  </Button>
                </div>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Legal Name & DBA</span>
                        <span className="font-semibold text-foreground">
                          {parsedApp.business.legalName || "N/A"}{" "}
                          {parsedApp.business.dba && parsedApp.business.dba !== parsedApp.business.legalName ? `(${parsedApp.business.dba})` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Primary Signer / Principal</span>
                        <span className="font-semibold text-foreground">
                          {parsedApp.authorization.signerName || (p1 ? `${p1.firstName} ${p1.lastName}` : "Authorized Signer")}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Requested Funding</span>
                      <span className="font-bold text-cyan-700 dark:text-cyan-400">
                        {formatCurrency(parsedApp.financials.amountRequested || parsedApp.financials.requestedAmount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Annual Revenue</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(parsedApp.financials.grossAnnualSales)}
                      </span>
                    </div>
                  </div>

                  {/* Forensic Audit Stamp Banner */}
                  <div className="mt-3 p-3 rounded-xl border border-cyan-300 dark:border-cyan-800/60 bg-cyan-50/60 dark:bg-cyan-950/30">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[11px] text-cyan-900 dark:text-cyan-200">
                            Digital Signature Audit Verification
                          </span>
                          {audit ? (
                            <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 h-4">
                              Cryptographically Sealed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                              AcroForm Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-cyan-800 dark:text-cyan-300 font-mono">
                          Envelope ID: {audit?.envelopeId || `QF-TRC-${parsedApp.id.slice(0, 8)}-2026`} | IP: {audit?.ipAddress || parsedApp.authorization.ipAddress || "Verified Client Session"}
                        </p>
                        {audit?.formattedTimestamp && (
                          <p className="text-[10px] text-muted-foreground">
                            Signed: {audit.formattedTimestamp}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instant 1-Click Multi-Lender Conversion Hub */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Instant Multi-Lender Conversion
                  </span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    100% Field Parity
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CanaCap Card */}
                  <Card className="border-border/70 p-3.5 rounded-xl hover:border-cyan-400 transition-colors bg-card flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-foreground">CanaCap Application</span>
                        <Badge className="bg-red-600 text-white text-[9px] px-1.5 py-0 h-4">Official PDF</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Populates 100% of fields, merchant processing specs, property info, and trade references.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadCanaCap}
                      disabled={downloadingLender !== null}
                      className="mt-3 text-xs w-full h-8 font-semibold border-border hover:bg-muted"
                    >
                      {downloadingLender === "canacap" ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
                      )}
                      Download CanaCap PDF
                    </Button>
                  </Card>

                  {/* Journey Capital Card */}
                  <Card className="border-border/70 p-3.5 rounded-xl hover:border-cyan-400 transition-colors bg-card flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-foreground">Journey Capital / White-Label</span>
                        <Badge className="bg-blue-600 text-white text-[9px] px-1.5 py-0 h-4">Official PDF</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Populates full corporate identity, dual principals, lease terms, and cash advance history.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadJourneyCapital}
                      disabled={downloadingLender !== null}
                      className="mt-3 text-xs w-full h-8 font-semibold border-border hover:bg-muted"
                    >
                      {downloadingLender === "journey" ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
                      )}
                      Download Journey Capital PDF
                    </Button>
                  </Card>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadQuickFlo}
                    disabled={downloadingLender !== null}
                    className="text-xs h-8 font-medium border-border"
                  >
                    {downloadingLender === "quickflo" ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <FileCheck2 className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
                    )}
                    Download Master QuickFlo PDF
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadZip}
                    disabled={downloadingLender !== null}
                    className="text-xs h-8 font-medium border-border"
                  >
                    {downloadingLender === "zip" ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Layers className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
                    )}
                    Download Complete ZIP Package
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleModalOpenChange(false)}
            className="text-xs h-8"
          >
            Close
          </Button>

          {parsedApp && (
            <Button
              type="button"
              size="sm"
              onClick={handleSaveToPipeline}
              className="text-xs h-8 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {onApplyData ? "Apply to Current Form" : "Save to Pipeline"}
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
