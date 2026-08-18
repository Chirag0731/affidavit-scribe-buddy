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

type BatchScope = "all" | "action_required" | "stale" | "selected";

function OsapAuditCenterPage() {
  const [clients, setClients] = useState<OsapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [batchScope, setBatchScope] = useState<BatchScope>("all");
  const [batchScenario, setBatchScenario] = useState<AuditScenario>("live_file_audit");

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
      const b = c.batch_name || "General Batch";
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
      list = list.filter((c) => (c.batch_name || "General Batch") === selectedBatch);
    }
    if (batchScope === "action_required") {
      list = list.filter((c) => c.action_required);
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
    toast.info(`⚡ Batch audit started for ${targetList.length} clients! It will continue in the background if you leave this page.`);

    const report = await backgroundAuditService.startBatchAudit(
      targetList,
      selectedBatch,
      batchScenario,
      "Staff Coordinator"
    );

    if (report) {
      setLastSessionReport(report);
      await loadClients();
    }
  };

  const handleCancelAudit = () => {
    backgroundAuditService.cancelAudit();
    setIsRunning(false);
    toast.info("Active audit cancelled.");
  };

  const handleDownloadSessionPdf = async (reportToDownload = lastSessionReport) => {
    if (!reportToDownload) return;
    setGeneratingPdf(true);
    try {
      const blob = await generateBatchAuditSessionPdf(reportToDownload);
      const filename = `OSAP_Audit_Session_${reportToDownload.batchName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPdfBlob(blob, filename);
      toast.success("📥 Batch Audit Session PDF Report successfully downloaded!");
    } catch {
      toast.error("Failed to generate PDF report");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-heading">OSAP Audit Center</h1>
        <p className="text-muted-foreground mt-1">
          Execute automated batch audits by spreadsheet sheet/batch, test edge cases, and detect changes across all student cohorts.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Batch Configurator */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sliders className="w-5 h-5 text-gold" />
            <h3 className="font-semibold text-foreground text-base">Batch Audit Configuration</h3>
          </div>

          <div className="space-y-4">
            {/* Batch / Page Selector */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                <span>Select Target Batch / Page</span>
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
                <option value="all">🌐 All Batches / Entire Portfolio ({clients.length} clients)</option>
                {batchOptions.map(([name, count]) => (
                  <option key={name} value={name}>
                    📁 {name} ({count} clients)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Filter Within Batch</label>
              <select
                value={batchScope}
                onChange={(e) => setBatchScope(e.target.value as BatchScope)}
                disabled={isRunning}
                className="input-base text-sm"
              >
                <option value="all">All Clients in Selected Batch</option>
                <option value="action_required">
                  Action Required Clients Only
                </option>
                <option value="stale">
                  Unaudited / Stale Files Only
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Audit Scenario / Mode</label>
              <select
                value={batchScenario}
                onChange={(e) => setBatchScenario(e.target.value as AuditScenario)}
                disabled={isRunning}
                className="input-base text-sm font-medium border-gold/40"
              >
                <option value="live_portal_login">🔴 Live Government Portal Login & Crawler (Physical OAN & Pass)</option>
                <option value="live_file_audit">⚡ Smart Live Audit (Inspects Real MSFAA, Docs & Discrepancies)</option>
                <option value="payment_released">💰 Payment Released Verification (Only Updates Files with Confirmed Disbursement)</option>
                <option value="msfaa_incomplete">⚠️ Flag Incomplete MSFAA on Batch</option>
                <option value="rejected_documents">📄 Detect Rejected Documents</option>
                <option value="documents_under_review">⏳ Documents Under Review Queue</option>
                <option value="approved">✅ Simulated Approved State</option>
                <option value="processing">📊 Simulated In-Assessment State</option>
                <option value="denied">❌ Simulated Denied State</option>
                <option value="mfa_required">🔐 Simulate MFA 2FA Login Pause</option>
                <option value="portal_unavailable">🔌 Simulate Portal Timeout Failure</option>
                <option value="manual_review">📝 Flag for Manual Coordinator Review</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {batchScenario === "live_portal_login"
                  ? "Uses stored OAN & Password to physically authenticate and scrape real-time OSAP status snapshots (only marks verified releases as funded)."
                  : batchScenario === "payment_released"
                  ? "Scans every student file and ONLY updates files that have confirmed payment release / disbursement."
                  : batchScenario === "live_file_audit"
                  ? "Evaluates each student's real file attributes (MSFAA completion, SIN discrepancies, hold notes, document statuses)."
                  : "Simulates test cases, detects changes against previous snapshots, and produces action items."}
              </p>
            </div>

            <div className="p-4 bg-muted/20 border border-border rounded-lg text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Batch:</span>
                <strong className="text-gold font-medium truncate max-w-[170px]">
                  {selectedBatch === "all" ? "All Batches" : selectedBatch}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target records:</span>
                <strong className="text-foreground">{targetList.length} clients</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Safe rate limiting:</span>
                <span className="text-emerald-400">Enabled (Background Runner)</span>
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
                  {generatingPdf ? "Compiling PDF..." : "📥 Download Session Audit PDF"}
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
