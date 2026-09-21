import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BusinessFinancingApplication } from "@/types/financing";
import { financingStore } from "@/lib/financing-db";
import { FinancingLogo } from "@/components/financing/financing-logo";
import { FinancingClientForm } from "@/components/financing/financing-client-form";
import { FinancingPdfPreviewModal } from "@/components/financing/financing-pdf-preview-modal";
import {
  generateAllLenderPdfsZip,
  generatePrintableQuickFloPdf,
  downloadPdfBlob,
} from "@/lib/lender-pdf-engine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  Download,
  Eye,
  Clock,
  FileCheck2,
  RefreshCw,
  Loader2,
  Printer,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/apply")({
  validateSearch: (search: Record<string, unknown>): { id?: string } => {
    return {
      id: typeof search.id === "string" ? search.id : undefined,
    };
  },
  component: PublicApplyPage,
  ssr: false,
});

function PublicApplyPage() {
  const { id } = Route.useSearch();
  const [initialApp, setInitialApp] = useState<BusinessFinancingApplication | null>(null);
  const [loadingApp, setLoadingApp] = useState<boolean>(Boolean(id));
  const [submittedApp, setSubmittedApp] = useState<BusinessFinancingApplication | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingPrintable, setDownloadingPrintable] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoadingApp(false);
      return;
    }
    let active = true;
    financingStore
      .getApplicationById(id)
      .then((found: BusinessFinancingApplication | null) => {
        if (active && found) {
          setInitialApp(found);
          toast.success(`Loaded application for ${found.business.legalName || "your business"}`);
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to load application by id:", err);
      })
      .finally(() => {
        if (active) setLoadingApp(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

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

  const handleDownloadPrintable = async () => {
    if (!submittedApp) return;
    try {
      setDownloadingPrintable(true);
      const blob = await generatePrintableQuickFloPdf(submittedApp);
      const name = `${submittedApp.business.legalName || "Application"}_QuickFlo_Fillable_Intake.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, name);
      toast.success("Downloaded printable and fillable application PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingPrintable(false);
    }
  };

  if (loadingApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">
            Loading your secure funding application...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FinancingLogo height={44} />
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-xs">
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
                  Your commercial financing application for{" "}
                  <span className="font-semibold text-foreground">{submittedApp.business.legalName}</span>{" "}
                  has been securely transmitted to underwriting.
                </p>

                <div className="mt-6 p-4 rounded-2xl bg-muted/30 border border-border/80 w-full text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Application Reference ID:</span>
                    <span className="font-mono font-bold text-foreground">
                      QF-{submittedApp.id.slice(0, 8).toUpperCase()}
                    </span>
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
                  <div className="flex justify-between items-center pt-1 border-t border-border/60">
                    <span className="text-muted-foreground font-medium">Live Dashboard Sync:</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Synchronized with Advisor Dashboard
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                    className="h-11 text-xs border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-semibold"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview PDFs
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadPrintable}
                    disabled={downloadingPrintable}
                    className="h-11 text-xs font-semibold"
                  >
                    {downloadingPrintable ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4 mr-2 text-cyan-600" />
                    )}
                    Printable PDF
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
                    Download ZIP
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

                <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
                  <Link
                    to="/dashboard/saved"
                    search={{ tab: "financing" }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white transition-smooth shadow-sm"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Return to Advisor Dashboard</span>
                  </Link>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSubmittedApp(null);
                      setInitialApp(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Submit Another Application
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          /* Main 6-Step Application Wizard */
          <FinancingClientForm
            key={initialApp?.id || "new-app"}
            initialData={initialApp || undefined}
            isAdminMode={false}
            onSubmitSuccess={(app) => setSubmittedApp(app)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 bg-card/60 backdrop-blur-sm py-6 px-4">
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
