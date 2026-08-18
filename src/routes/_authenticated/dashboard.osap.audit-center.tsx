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
} from "lucide-react";
import { toast } from "sonner";
import { getOsapClients, recordOsapAudit, saveOsapClient, saveOsapAction, saveOsapDocument } from "@/lib/osap-db";
import { runClientAudit, type AuditScenario } from "@/lib/osap-audit-engine";
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

  useEffect(() => {
    loadClients();
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

    setIsRunning(true);
    setProgress(0);
    setAuditLogs([]);

    for (let i = 0; i < targetList.length; i++) {
      const client = targetList[i];
      setCurrentClientName(client.full_name);

      // Safe rate-limited step
      await new Promise((resolve) => setTimeout(resolve, 250));

      const res = runClientAudit(client, batchScenario);

      // Save audit and updates
      await recordOsapAudit(res.audit);
      await saveOsapClient(res.client, client.user_id);
      for (const act of res.newActions) {
        await saveOsapAction(act);
      }
      for (const doc of res.updatedDocuments) {
        await saveOsapDocument(doc);
      }

      setAuditLogs((prev) => [
        {
          name: client.full_name,
          batch: client.batch_name,
          status: res.status,
          message: res.message,
        },
        ...prev,
      ]);

      setProgress(Math.round(((i + 1) / targetList.length) * 100));
    }

    setIsRunning(false);
    toast.success(`Batch audit completed for ${targetList.length} clients${selectedBatch !== "all" ? ` in batch "${selectedBatch}"` : ""}`);
    await loadClients();
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
                <option value="live_file_audit">⚡ Smart Live Audit (Inspects Real MSFAA, Docs & Discrepancies)</option>
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
                {batchScenario === "live_file_audit"
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
                <span className="text-emerald-400">Enabled (250ms delay)</span>
              </div>
            </div>

            <button
              onClick={handleStartBatchAudit}
              disabled={isRunning || targetList.length === 0}
              className="w-full btn-primary flex items-center justify-center gap-2 text-sm py-3 shadow-md"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isRunning ? `Auditing (${progress}%)...` : `Audit ${selectedBatch === "all" ? "All Clients" : `"${selectedBatch}"`} (${targetList.length})`}
            </button>
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
