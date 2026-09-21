import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BusinessFinancingApplication } from "@/types/financing";
import { FinancingLogo } from "@/components/financing/financing-logo";
import { FinancingClientForm } from "@/components/financing/financing-client-form";
import { FinancingPdfPreviewModal } from "@/components/financing/financing-pdf-preview-modal";
import { generateAllLenderPdfsZip } from "@/lib/lender-pdf-engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Lock,
  PhoneCall,
  CheckCircle2,
  Download,
  Eye,
  ArrowRight,
  Clock,
  Sparkles,
  FileCheck2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/apply")({
  component: PublicApplyPage,
  ssr: false,
});

function PublicApplyPage() {
  const [submittedApp, setSubmittedApp] = useState<BusinessFinancingApplication | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadZip = async () => {
    if (!submittedApp) return;
    try {
      setDownloadingZip(true);
      const zipBytes = await generateAllLenderPdfsZip(submittedApp);
      const blob = new Blob([zipBytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = `${submittedApp.business.legalName || "Application"}_QuickFlo_Package.zip`.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Downloaded your complete application package");
    } catch (err) {
      console.error(err);
      toast.error("Failed to package files");
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-200/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-border shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FinancingLogo height={44} />
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-xs">
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground font-medium">
              <PhoneCall className="w-4 h-4 text-cyan-600" />
              <span>Direct Underwriting: (800) 518-8092</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>256-Bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {submittedApp ? (
          /* Submission Success State */
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center">
            <Card className="rounded-3xl border-emerald-500/30 shadow-2xl bg-card overflow-hidden">
              <div className="p-8 sm:p-10 bg-gradient-to-b from-emerald-500/10 via-background to-background flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border-4 border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 shadow-lg">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <Badge className="bg-emerald-600 text-white font-semibold text-xs px-3 py-1 mb-2">
                  Application Received & Underwritten
                </Badge>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Thank You, {submittedApp.owners[0]?.firstName || "Applicant"}!
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Your commercial financing application for <span className="font-semibold text-foreground">{submittedApp.business.legalName}</span> has been securely transmitted to underwriting.
                </p>

                <div className="mt-6 p-4 rounded-2xl bg-muted/30 border border-border/80 w-full text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Application Reference ID:</span>
                    <span className="font-mono font-bold text-foreground">QF-{submittedApp.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Requested Funding:</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">
                      ${submittedApp.financials.amountRequested?.toLocaleString() || "0"} USD
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Status:</span>
                    <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30 text-[10px]">
                      Underwriting Review (2-4 hrs)
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                    className="h-11 text-xs border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-semibold"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview Generated PDFs
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={downloadingZip}
                    className="h-11 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
                  >
                    {downloadingZip ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download Package (ZIP)
                  </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60 w-full text-left space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What happens next?</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                      <span>An underwriter will review your business revenue history within 2 to 4 business hours.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <FileCheck2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                      <span>If pre-approved, your dedicated capital advisor will reach out to present funding options and term structures.</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSubmittedApp(null)}
                  className="mt-6 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Submit Another Application
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          /* Main 6-Step Application Wizard */
          <FinancingClientForm
            isAdminMode={false}
            onSubmitSuccess={(app) => setSubmittedApp(app)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FinancingLogo height={28} />
            <span className="text-[11px]">© {new Date().getFullYear()} QuickFlo Financial Services Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> Banking-Grade Encryption
            </span>
          </div>
        </div>
      </footer>

      {/* PDF Preview Modal */}
      {submittedApp && (
        <FinancingPdfPreviewModal
          application={submittedApp}
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
