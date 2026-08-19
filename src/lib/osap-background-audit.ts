import { runClientAudit, type AuditScenario } from "./osap-audit-engine";
import { recordOsapAudit, saveOsapClient, saveOsapAction, saveOsapDocument } from "./osap-db";
import { generateBatchAuditSessionPdf, downloadPdfBlob, type OsapBatchSessionReport, type BatchAuditItemSummary } from "./osap-pdf-generator";
import type { OsapClient } from "@/types/osap";

const ACTIVE_JOB_KEY = "neptora_active_audit_job_v1";
const SESSIONS_HISTORY_KEY = "neptora_audit_sessions_history_v1";
const LATEST_SESSION_KEY = "neptora_latest_audit_session_v1";

export interface OsapActiveAuditJob {
  id: string;
  batchName: string;
  scenario: AuditScenario;
  totalCount: number;
  currentIndex: number;
  currentClientName: string;
  status: "idle" | "running" | "completed" | "cancelled" | "error";
  logs: Array<{ name: string; batch?: string | null; status: string; message: string }>;
  sessionItems: BatchAuditItemSummary[];
  completedReport: OsapBatchSessionReport | null;
  startedAt: string;
  completedAt?: string;
}

type AuditListener = (job: OsapActiveAuditJob | null) => void;

class OsapBackgroundAuditManager {
  private activeJob: OsapActiveAuditJob | null = null;
  private listeners: Set<AuditListener> = new Set();
  private cancelRequested = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.restoreFromStorage();
    }
  }

  private restoreFromStorage() {
    try {
      const raw = localStorage.getItem(ACTIVE_JOB_KEY);
      if (raw) {
        this.activeJob = JSON.parse(raw);
      }
    } catch {
      this.activeJob = null;
    }
  }

  private persistState() {
    if (typeof window === "undefined") return;
    try {
      if (this.activeJob) {
        localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(this.activeJob));
      } else {
        localStorage.removeItem(ACTIVE_JOB_KEY);
      }
    } catch {}
  }

  private notify() {
    this.persistState();
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeJob ? { ...this.activeJob } : null);
      } catch (err) {
        console.error("Audit listener error:", err);
      }
    });
  }

  public subscribe(listener: AuditListener): () => void {
    this.listeners.add(listener);
    listener(this.activeJob ? { ...this.activeJob } : null);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getActiveJob(): OsapActiveAuditJob | null {
    return this.activeJob ? { ...this.activeJob } : null;
  }

  public getLatestSession(): OsapBatchSessionReport | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LATEST_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public getSessionsHistory(): OsapBatchSessionReport[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(SESSIONS_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveSessionReport(report: OsapBatchSessionReport) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LATEST_SESSION_KEY, JSON.stringify(report));
      const history = this.getSessionsHistory();
      const updated = [report, ...history.filter((s) => s.id !== report.id)].slice(0, 20);
      localStorage.setItem(SESSIONS_HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save session history:", err);
    }
  }

  public cancelAudit() {
    this.cancelRequested = true;
    if (this.activeJob) {
      this.activeJob.status = "cancelled";
      this.notify();
    }
  }

  public async startBatchAudit(
    targetList: OsapClient[],
    batchName: string,
    scenario: AuditScenario = "live_portal_crawl",
    conductedBy = "Live OSAP Portal Crawler"
  ): Promise<OsapBatchSessionReport | null> {
    if (targetList.length === 0) return null;

    this.cancelRequested = false;

    const job: OsapActiveAuditJob = {
      id: crypto.randomUUID(),
      batchName: batchName === "all" ? "All Batches / Entire Portfolio" : batchName,
      scenario,
      totalCount: targetList.length,
      currentIndex: 0,
      currentClientName: targetList[0].full_name,
      status: "running",
      logs: [],
      sessionItems: [],
      completedReport: null,
      startedAt: new Date().toISOString(),
    };

    this.activeJob = job;
    this.notify();

    const sessionItems: BatchAuditItemSummary[] = [];

    for (let i = 0; i < targetList.length; i++) {
      if (this.cancelRequested) {
        job.status = "cancelled";
        this.notify();
        return null;
      }

      const client = targetList[i];
      job.currentIndex = i + 1;
      job.currentClientName = client.full_name;
      this.notify();

      // Safe pace delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      const res = runClientAudit(client, scenario);

      // Save audit and updates to DB
      await recordOsapAudit(res.audit);
      await saveOsapClient(res.client, client.user_id);
      for (const act of res.newActions) {
        await saveOsapAction(act);
      }
      for (const doc of res.updatedDocuments) {
        await saveOsapDocument(doc);
      }

      const itemSummary: BatchAuditItemSummary = {
        client: res.client,
        status: res.status,
        message: res.message,
        msfaaStatus: res.client.msfaa_status,
        notes: res.client.notes || res.client.action_required_summary || "",
      };

      sessionItems.push(itemSummary);
      job.sessionItems = sessionItems;

      job.logs = [
        {
          name: client.full_name,
          batch: client.batch_name,
          status: res.status,
          message: res.message,
        },
        ...job.logs,
      ];

      this.notify();
    }

    const report: OsapBatchSessionReport = {
      id: job.id,
      title: `Audit Session - ${job.batchName}`,
      batchName: job.batchName,
      scenario: scenario.replace(/_/g, " "),
      conductedBy,
      createdAt: new Date().toISOString(),
      totalAudited: targetList.length,
      updatedCount: sessionItems.filter((i) => i.status === "success" || i.client.application_status === "completed").length,
      pendingMsfaaCount: sessionItems.filter((i) => i.client.msfaa_status !== "submitted").length,
      holdCount: sessionItems.filter((i) => i.client.batch_name === "Hold" || i.client.notes?.toLowerCase().includes("discrepancy")).length,
      fundedCount: sessionItems.filter((i) => i.client.application_status === "completed" || i.client.application_status === "funded").length,
      items: sessionItems,
    };

    job.status = "completed";
    job.completedReport = report;
    job.completedAt = new Date().toISOString();
    this.saveSessionReport(report);
    this.notify();

    // Trigger persistent global event so any active page shows the download prompt
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("neptora_audit_completed", { detail: report }));
    }

    return report;
  }
}

export const backgroundAuditService = new OsapBackgroundAuditManager();
