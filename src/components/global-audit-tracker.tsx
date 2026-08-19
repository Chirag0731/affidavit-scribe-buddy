import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Scan, Download, CheckCircle2, Loader2, X, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { backgroundAuditService, type OsapActiveAuditJob } from "@/lib/osap-background-audit";
import { generateBatchAuditSessionPdf, downloadPdfBlob } from "@/lib/osap-pdf-generator";

export function GlobalAuditTracker() {
  const [job, setJob] = useState<OsapActiveAuditJob | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const unsub = backgroundAuditService.subscribe((currentJob) => {
      setJob(currentJob);
      if (currentJob?.status === "running") {
        setDismissed(false);
      }
    });

    const handleCompletedEvent = (e: any) => {
      const report = e.detail;
      toast.success(`Batch Audit Completed for ${report.batchName}! (${report.totalAudited} students)`, {
        action: {
          label: "Download PDF",
          onClick: async () => {
            try {
              const blob = await generateBatchAuditSessionPdf(report);
              downloadPdfBlob(blob, `OSAP_Audit_Session_${report.batchName.replace(/\s+/g, "_")}.pdf`);
            } catch {
              toast.error("Failed to generate PDF");
            }
          },
        },
        duration: 10000,
      });
    };

    window.addEventListener("neptora_audit_completed", handleCompletedEvent);

    return () => {
      unsub();
      window.removeEventListener("neptora_audit_completed", handleCompletedEvent);
    };
  }, []);

  if (!job || dismissed || job.status === "idle" || job.status === "cancelled") {
    return null;
  }

  const isRunning = job.status === "running";
  const isCompleted = job.status === "completed";
  const progress = job.totalCount > 0 ? Math.round((job.currentIndex / job.totalCount) * 100) : 0;

  const handleDownloadPdf = async () => {
    if (!job.completedReport) return;
    setDownloading(true);
    try {
      const blob = await generateBatchAuditSessionPdf(job.completedReport);
      const filename = `OSAP_Audit_Session_${job.completedReport.batchName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPdfBlob(blob, filename);
      toast.success("Batch Audit Session PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF report");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-fade-in shadow-2xl">
      <div className={`p-4 rounded-xl border-2 backdrop-blur-md transition-all ${
        isRunning
          ? "bg-card/95 border-gold/60 shadow-gold/10"
          : "bg-card/95 border-emerald-500/60 shadow-emerald-500/10"
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isRunning ? "bg-gold/20 text-gold" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">
                  {isRunning ? "Background Audit Active" : "Audit Session Completed"}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-muted text-muted-foreground">
                  {job.batchName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
                {isRunning ? (
                  <span>Auditing: <strong className="text-foreground">{job.currentClientName}</strong></span>
                ) : (
                  <span>{job.totalCount} student records processed & synced.</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
            title="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar while running */}
        {isRunning && (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span>{job.currentIndex} of {job.totalCount} completed</span>
              <span className="font-mono text-gold">{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="bg-gold h-2 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action button row */}
        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2 text-xs">
          <Link
            to="/dashboard/osap/audit-center"
            className="text-gold hover:text-gold-dark font-semibold inline-flex items-center gap-1 hover:underline"
          >
            <span>View in Audit Center</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          {isCompleted && job.completedReport && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloading ? "Compiling..." : "Download Session PDF"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
