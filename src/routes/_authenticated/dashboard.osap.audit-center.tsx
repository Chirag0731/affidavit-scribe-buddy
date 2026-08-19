import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Scan,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Loader2,
  RefreshCw,
  Sliders,
  CheckCircle,
  HelpCircle,
  Download,
  FileText,
  CheckCheck,
  X,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { getOsapClients } from "@/lib/osap-db";
import { type AuditScenario } from "@/lib/osap-audit-engine";
import { backgroundAuditService, type OsapActiveAuditJob } from "@/lib/osap-background-audit";
import {
  generateBatchAuditSessionPdf,
  downloadPdfBlob,
  type OsapBatchSessionReport,
} from "@/lib/osap-pdf-generator";
import type { OsapClient } from "@/types/osap";
import { OSAP_BATCH_ORDER } from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/audit-center")({
  component: OsapAuditCenterPage,
  ssr: false,
});

type BatchScope = "all" | "action_required" | "pending_msfaa" | "stale";

function OsapAuditCenterPage() {
  const [clients, setClients] = useState<OsapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [batchScope, setBatchScope] = useState<BatchScope>("all");

  // Batch runner state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClientName, setCurrentClientName] = useState("");
  const [auditLogs, setAuditLogs] = useState<Array<{ name: string; batch?: string | null; status: string; message: string }>>([]);
  const [lastSessionReport, setLastSessionReport] = useState<OsapBatchSessionReport | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    loadClients();

    // Check for previous completed session
    const latest = backgroundAuditService.getLatestSession();
    if (latest) {
      setLastSessionReport(latest);
    }

    // Subscribe to persistent background audit
    const unsub = backgroundAuditService.subscribe((job: OsapActiveAuditJob | null) => {
      if (job) {
        if (job.status === "running") {
          setIsRunning(true);
          setCurrentClientName(job.currentClientName);
          setProgress(job.totalCount > 0 ? Math.round((job.currentIndex / job.totalCount) * 100) : 0);
          setAuditLogs(job.logs);
        } else if (job.status === "completed" && job.completedReport) {
          setIsRunning(false);
          setProgress(100);
          setLastSessionReport(job.completedReport);
          setAuditLogs(job.logs);
        } else if (job.status === "cancelled") {
          setIsRunning(false);
        }
      }
    });

    return () => {
      unsub();
    };
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getOsapClients();
      setClients(data);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  // Group unique batches with client counts sorted by OSAP_BATCH_ORDER
  const batchOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach((c) => {
      const b = c.batch_name || "July 27th List";
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => {
      const idxA = OSAP_BATCH_ORDER.indexOf(a[0]);
      const idxB = OSAP_BATCH_ORDER.indexOf(b[0]);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [clients]);

  const getTargetClients = (): OsapClient[] => {
    let list = clients;
    if (selectedBatch !== "all") {
      list = list.filter((c) => (c.batch_name || "July 27th List") === selectedBatch);
    }
    if (batchScope === "action_required") {
      list = list.filter((c) => c.action_required);
    } else if (batchScope === "pending_msfaa") {
      list = list.filter((c) => c.msfaa_status !== "completed" && c.msfaa_status !== "submitted");
    } else if (batchScope === "stale") {
      list = list.filter((c) => !c.last_audit_at);
    }
    return list;
  };

  const targetList = getTargetClients();

  const handleStartBatchAudit = async () => {
    if (targetList.length === 0) {
      toast.error("No clients match the selected batch criteria");
      return;
    }

    setLastSessionReport(null);
    setAuditLogs([]);
    setIsRunning(true);
    toast.info(`Live portal audit initiated for ${targetList.length} clients.`);

    try {
      await backgroundAuditService.startBatchAudit(
        targetList,
        selectedBatch,
        "live_portal_crawl",
        "Staff Coordinator"
      );
      loadClients();
    } catch {
      toast.error("Failed to execute batch audit");
      setIsRunning(false);
    }
  };

  const handleCancelAudit = () => {
    backgroundAuditService.cancelAudit();
    setIsRunning(false);
    toast.info("Batch audit cancelled");
  };

  const handleExportPdfReport = async (reportToDownload = lastSessionReport) => {
    if (!reportToDownload) return;
    setGeneratingPdf(true);
    try {
      const blob = await generateBatchAuditSessionPdf(reportToDownload);
      downloadPdfBlob(blob, `OSAP-Live-Audit-${reportToDownload.batchName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Audit session PDF report generated");
    } catch {
      toast.error("Failed to generate PDF report");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadSessionPdf = handleExportPdfReport;

  if (loading && clients.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="w-6 h-6 text-gold" />
          Live OSAP Portal Audit Center
        </h2>
        <p className="text-muted-foreground mt-1">
          Unified live government crawler scanning document approvals, MSFAA online completion, estimated release dates, and fund deposits.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Batch Configurator */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sliders className="w-5 h-5 text-gold" />
            <h3 className="font-semibold text-foreground text-base">Live Audit Scanner</h3>
          </div>

          <div className="space-y-4">
            {/* Batch / Page Selector */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                <span>Target Student Batch / Cohort</span>
                <span className="text-gold text-[11px] font-mono font-normal">
                  {batchOptions.length} batches available
                </span>
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                disabled={isRunning}
                className="input-base text-sm font-medium border-gold/40"
              >
                <option value="all">All Batches / Entire Portfolio ({clients.length} clients)</option>
                {batchOptions.map(([name, count]) => (
                  <option key={name} value={name}>
                    {name} ({count} clients)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Scope Filter</label>
              <select
                value={batchScope}
                onChange={(e) => setBatchScope(e.target.value as BatchScope)}
                disabled={isRunning}
                className="input-base text-sm"
              >
                <option value="all">All Accounts in Selected Batch</option>
                <option value="action_required">Action Required / Holds Only</option>
                <option value="pending_msfaa">Pending MSFAA Signatures Only</option>
                <option value="stale">Unaudited / Stale Accounts Only</option>
              </select>
            </div>

            {/* Live Crawler Verification Checks Card */}
            <div className="p-3.5 bg-muted/25 border border-border rounded-lg space-y-2.5">
              <span className="text-xs font-semibold text-gold block flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live Verification Criteria:
              </span>
              <ul className="text-[11px] text-muted-foreground space-y-1.5 leading-snug">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Document Review:</strong> Verifies approved forms & flags specific docs waiting on FAO review or rejected.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>MSFAA Agreement:</strong> Verifies online registration status and MSFAA reference number.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Payment & Release Dates:</strong> Extracts scheduled release windows, COE status, or direct bank deposits.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Holds & Discrepancies:</strong> Detects SIN/ESDC registry holds and eligibility flags.</span>
                </li>
              </ul>
            </div>

            <div className="p-3.5 bg-muted/20 border border-border rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Batch:</span>
                <strong className="text-gold font-medium truncate max-w-[170px]">
                  {selectedBatch === "all" ? "All Batches" : selectedBatch}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Accounts:</span>
                <strong className="text-foreground">{targetList.length} clients</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scan Mode:</span>
                <span className="text-emerald-400 font-medium">Live Portal Crawler</span>
              </div>
            </div>

            {isRunning ? (
              <div className="space-y-2">
                <button
                  onClick={handleCancelAudit}
                  className="w-full btn-secondary text-rose-400 hover:text-rose-300 border-rose-500/40 hover:bg-rose-500/10 flex items-center justify-center gap-2 text-sm py-2.5 shadow-sm"
                >
                  <X className="w-4 h-4" /> Cancel Active Audit
                </button>
                <p className="text-[11px] text-center text-muted-foreground">
                  Running in background. You can safely browse other pages while this runs.
                </p>
              </div>
            ) : (
              <button
                onClick={handleStartBatchAudit}
                disabled={targetList.length === 0}
                className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-3 shadow-md"
              >
                <Play className="w-4 h-4" />
                Audit {selectedBatch === "all" ? "All Clients" : `"${selectedBatch}"`} ({targetList.length})
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Audit Execution Monitor */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-gold" />
              <h3 className="font-semibold text-foreground text-base">Execution Monitor & Progress</h3>
            </div>
            {isRunning && (
              <span className="text-xs text-gold flex items-center gap-1.5 animate-pulse font-medium">
                <span className="w-2 h-2 rounded-full bg-gold" /> Auditing: {currentClientName}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Batch Progress</span>
              <span className="text-foreground font-mono">{progress}% Complete</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gold h-2.5 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Session PDF Download Banner */}
          {lastSessionReport && !isRunning && (
            <div className="p-4 bg-gold/10 border-2 border-gold/40 rounded-xl space-y-3 animate-fade-in shadow-sm">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/25 border border-gold/40 flex items-center justify-center font-bold text-gold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span>Batch Audit Session PDF Ready</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                        {lastSessionReport.totalAudited} Files Audited
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Complete PDF session report for <strong>{lastSessionReport.batchName}</strong> with all updated statuses, MSFAA conditions, and pending action items.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadSessionPdf(lastSessionReport)}
                  disabled={generatingPdf}
                  className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2 shadow-md hover:scale-102 transition-transform"
                >
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {generatingPdf ? "Compiling PDF..." : "Download Session Audit PDF"}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gold/20 text-xs">
                <div className="p-2 rounded bg-card/60 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Updated / Synced</span>
                  <span className="font-bold text-emerald-400">{lastSessionReport.updatedCount}</span>
                </div>
                <div className="p-2 rounded bg-card/60 border border-border">
                  <span className="text-muted-foreground block text-[10px]">MSFAA Pending</span>
                  <span className="font-bold text-amber-400">{lastSessionReport.pendingMsfaaCount}</span>
                </div>
                <div className="p-2 rounded bg-card/60 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Holds / Discrepancies</span>
                  <span className="font-bold text-rose-400">{lastSessionReport.holdCount}</span>
                </div>
                <div className="p-2 rounded bg-card/60 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Funded / Completed</span>
                  <span className="font-bold text-emerald-300">{lastSessionReport.fundedCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Real-time checklist */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-lg">
                <Scan className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">Audit monitor standing by</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your target scope on the left and click "Run Batch Audit" to begin.
                </p>
              </div>
            ) : (
              auditLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted/20 border border-border rounded-lg flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {log.status === "changes_detected" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : log.status === "mfa_required" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    ) : log.status === "failed" ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm block">{log.name}</span>
                        {log.batch && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted/60 border border-border rounded text-muted-foreground font-mono">
                            {log.batch}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5">{log.message}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase flex-shrink-0 ${
                      log.status === "changes_detected"
                        ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"
                        : log.status === "mfa_required"
                        ? "bg-amber-900/30 text-amber-400 border border-amber-800/40"
                        : log.status === "failed"
                        ? "bg-rose-900/30 text-rose-400 border border-rose-800/40"
                        : "bg-blue-900/30 text-blue-400"
                    }`}
                  >
                    {log.status.replace("_", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
