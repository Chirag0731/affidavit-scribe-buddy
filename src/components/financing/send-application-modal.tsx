import React, { useState } from "react";
import { BusinessFinancingApplication } from "@/types/financing";
import {
  generatePrintableQuickFloPdf,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Copy,
  Check,
  Download,
  ExternalLink,
  Mail,
  Printer,
  ShieldCheck,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";

interface SendApplicationModalProps {
  application: BusinessFinancingApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendApplicationModal({
  application,
  open,
  onOpenChange,
}: SendApplicationModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!application) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://portal.quickflo.com";
  const clientUrl = `${origin}/apply?id=${application.id}`;

  const primaryOwner = application.owners.find((o) => o.isPrimary) || application.owners[0];
  const clientName = primaryOwner?.firstName ? `${primaryOwner.firstName} ${primaryOwner.lastName}` : "Client";
  const clientEmail = application.business.businessEmail || primaryOwner?.email || "";

  const emailSubject = `QuickFlo Financial - Commercial Capital Application (${application.business.legalName || "Funding"})`;
  const emailBody = `Dear ${primaryOwner?.firstName || "Valued Client"},

Thank you for choosing QuickFlo Financial for your business financing requirements.

Your digital funding application has been prepared and is ready for your review:
${clientUrl}

Instructions:
1. Click the link above to review your pre-filled corporate and financial details.
2. Complete any remaining information and provide your digital signature.
3. Click "Submit Application" - your file will automatically transmit to our underwriting dashboard for immediate review.

Alternatively, an editable, printable PDF copy is available upon request.

If you have any questions or require assistance during the process, please contact our direct intake desk at (800) 518-8092.

Sincerely,
QuickFlo Financial Underwriting Team
https://quickflo.com`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopiedLink(true);
      toast.success("Application link copied to clipboard");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
      setCopiedEmail(true);
      toast.success("Email invitation copied to clipboard");
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      toast.error("Failed to copy email");
    }
  };

  const handleDownloadFillablePdf = async () => {
    try {
      setDownloadingPdf(true);
      const blob = await generatePrintableQuickFloPdf(application);
      const name = `${application.business.legalName || "Application"}_QuickFlo_Fillable_Intake.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, name);
      toast.success("Printable and fillable PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenMailto = () => {
    const mailto = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-600">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Send Application to Client</DialogTitle>
              <DialogDescription className="text-xs">
                Share a live digital application or downloadable fillable PDF. Completed submissions sync directly to your dashboard.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status info banner */}
          <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-950 dark:text-cyan-200 block">
                Real-Time Dashboard Synchronization
              </span>
              <span className="text-cyan-800 dark:text-cyan-300 text-[11px] leading-relaxed">
                When your client completes this form and submits, it will immediately appear in your Business Financing Dashboard as "Submitted" with all lender PDFs automatically generated.
              </span>
            </div>
          </div>

          {/* 1. Direct Web Application Link */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Client Digital Application Link</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={clientUrl}
                className="text-xs font-mono bg-muted/30 select-all"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="h-9 px-3 text-xs shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => window.open(clientUrl, "_blank")}
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                title="Open client link in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 2. Download Printable & Fillable PDF */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Printer className="w-4 h-4 text-cyan-600" />
              <div>
                <span className="text-xs font-bold text-foreground block">Printable & Fillable Intake PDF</span>
                <span className="text-[11px] text-muted-foreground block">
                  Branded QuickFlo Form with AcroForm editable fields and printed direct-sync link
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadFillablePdf}
              disabled={downloadingPdf}
              className="h-8 text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-cyan-600" />
              {downloadingPdf ? "Generating..." : "Download PDF"}
            </Button>
          </div>

          {/* 3. Email Invitation Template */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-600" />
                Email Invitation Template
              </Label>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyEmail}
                  className="h-6 px-2 text-[11px] text-cyan-700 dark:text-cyan-400"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-emerald-600" />
                      Email Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy Email Draft
                    </>
                  )}
                </Button>
                {clientEmail && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenMailto}
                    className="h-6 px-2 text-[11px]"
                  >
                    Open Mail Client
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              readOnly
              value={`Subject: ${emailSubject}\n\n${emailBody}`}
              rows={6}
              className="text-xs font-mono bg-muted/20 resize-none leading-relaxed"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
