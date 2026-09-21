import React, { useState, useEffect } from "react";
import { BusinessFinancingApplication } from "@/types/financing";
import {
  generateWhiteLabelPdf,
  generateCanaCapPdf,
  generatePrintableQuickFloPdf,
  generateAllLenderPdfsZip,
  validateForWhiteLabel,
  validateForCanaCap,
  downloadPdfBlob,
} from "@/lib/lender-pdf-engine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Printer,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface FinancingPdfPreviewModalProps {
  application: BusinessFinancingApplication | null;
  isOpen: boolean;
  onClose: () => void;
  initialLender?: "white-label" | "canacap" | "quickflo-printable";
}

export function FinancingPdfPreviewModal({
  application,
  isOpen,
  onClose,
  initialLender = "white-label",
}: FinancingPdfPreviewModalProps) {
  const [selectedLender, setSelectedLender] = useState<"white-label" | "canacap" | "quickflo-printable">(initialLender);
  const [loading, setLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    setSelectedLender(initialLender);
  }, [initialLender]);

  useEffect(() => {
    if (!isOpen || !application) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    let active = true;
    setLoading(true);

    const generate = async () => {
      try {
        let blob: Blob;
        if (selectedLender === "white-label") {
          blob = await generateWhiteLabelPdf(application);
        } else if (selectedLender === "canacap") {
          blob = await generateCanaCapPdf(application);
        } else {
          blob = await generatePrintableQuickFloPdf(application);
        }

        if (active) {
          const url = URL.createObjectURL(blob);
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
          }
          setPdfUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error generating PDF preview:", err);
        toast.error("Failed to render PDF preview");
        if (active) setLoading(false);
      }
    };

    generate();

    return () => {
      active = false;
    };
  }, [isOpen, selectedLender, application]);

  if (!application) return null;

  const whiteLabelAudit = validateForWhiteLabel(application);
  const canacapAudit = validateForCanaCap(application);
  const currentAudit =
    selectedLender === "white-label"
      ? whiteLabelAudit
      : selectedLender === "canacap"
      ? canacapAudit
      : { isValid: true, completenessPercentage: 100, missingFields: [], missingRequiredFields: [], warnings: [], audits: [] };

  const handleDownloadCurrent = async () => {
    try {
      if (selectedLender === "white-label") {
        const blob = await generateWhiteLabelPdf(application);
        const name = `${application.business.legalName || "Application"}_Business_Financing.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadPdfBlob(blob, name);
      } else if (selectedLender === "canacap") {
        const blob = await generateCanaCapPdf(application);
        const name = `${application.business.legalName || "Application"}_CanaCap_Financing.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadPdfBlob(blob, name);
      } else {
        const blob = await generatePrintableQuickFloPdf(application);
        const name = `${application.business.legalName || "Application"}_QuickFlo_Printable_Intake.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadPdfBlob(blob, name);
      }
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const zipBlob = await generateAllLenderPdfsZip(application);
      const name = `${application.business.legalName || "Application"}_All_Lender_Applications.zip`.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(zipBlob, name);
      toast.success("Complete Lender PDF Package (ZIP) downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to bundle ZIP package");
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-card border-border">
        {/* Header Bar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span>Lender PDF Viewer</span>
                <span className="text-xs font-normal text-muted-foreground">•</span>
                <span className="text-xs font-medium text-foreground">{application.business.legalName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Automated precision PDF mapping & compliance engine
              </DialogDescription>
            </div>
          </div>

          {/* Lender Select Tabs */}
          <div className="flex items-center gap-2">
            <Tabs
              value={selectedLender}
              onValueChange={(val) => setSelectedLender(val as any)}
            >
              <TabsList className="h-9">
                <TabsTrigger value="white-label" className="text-xs flex items-center gap-1.5 px-3">
                  Business Financing (EN)
                  {whiteLabelAudit.isValid ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="canacap" className="text-xs flex items-center gap-1.5 px-3">
                  CanaCap Application
                  {canacapAudit.isValid ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="quickflo-printable" className="text-xs flex items-center gap-1.5 px-3">
                  QuickFlo Fillable Form
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCurrent}
              className="h-9 text-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download {selectedLender === "white-label" ? "Form 1" : selectedLender === "canacap" ? "Form 2" : "QuickFlo Form"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="h-9 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
            >
              {downloadingZip ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileArchive className="w-3.5 h-3.5 mr-1.5" />
              )}
              Download All (ZIP)
            </Button>
          </div>
        </div>

        {/* Sub-bar: Compliance / Validation Audit Strip */}
        <div className="px-5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-muted-foreground">Compliance Audit:</span>
            {currentAudit.isValid ? (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-[11px] gap-1 py-0.5">
                <CheckCircle2 className="w-3 h-3" /> 100% Required Fields Present
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[11px] gap-1 py-0.5">
                <AlertTriangle className="w-3 h-3" /> {currentAudit.missingFields.length} Missing Fields
              </Badge>
            )}
            {currentAudit.warnings.length > 0 && (
              <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                ({currentAudit.warnings[0]})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
            <span>Layout: Standard Letter (612 × 792 pt)</span>
            <span>•</span>
            <span>Digital Signature: Embedded</span>
            {pdfUrl && (
              <>
                <span>•</span>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground inline-flex items-center gap-1 font-medium text-cyan-600 dark:text-cyan-400"
                >
                  <ExternalLink className="w-3 h-3" /> Open in New Tab
                </a>
              </>
            )}
          </div>
        </div>

        {/* Main PDF Viewer Body */}
        <div className="flex-1 bg-slate-900/90 relative overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-sm font-medium">Generating precision PDF overlay...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="Lender PDF Preview"
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="text-slate-400 text-sm">Failed to load preview</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
