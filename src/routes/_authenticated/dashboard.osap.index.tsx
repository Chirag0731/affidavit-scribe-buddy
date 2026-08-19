import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileCheck,
  FileX,
  FileText,
  ShieldAlert,
  HelpCircle,
  ArrowUpDown,
  Scan,
  Plus,
  ArrowRight,
  TrendingUp,
  Loader2,
  Activity,
  FileSpreadsheet,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import { getOsapClients, getOsapAudits, getOsapActions } from "@/lib/osap-db";
import type { OsapClient, OsapAudit, OsapActionItem } from "@/types/osap";
import {
  APPLICATION_STATUS_LABELS,
  PRIORITY_CONFIG,
  ACTION_SEVERITY_CONFIG,
  OSAP_BATCH_ORDER,
} from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/")({
  component: OsapDashboardPage,
  ssr: false,
});

function OsapDashboardPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<OsapClient[]>([]);
  const [audits, setAudits] = useState<OsapAudit[]>([]);
  const [actions, setActions] = useState<OsapActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allClients, allAudits, allActions] = await Promise.all([
        getOsapClients(),
        getOsapAudits(),
        getOsapActions(),
      ]);
      setClients(allClients);
      setAudits(allAudits);
      setActions(allActions);
    } catch {
      toast.error("Failed to load OSAP dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Metrics computation
  const totalClients = clients.length;
  const approvedCount = clients.filter((c) => c.application_status === "approved").length;
  const processingCount = clients.filter((c) => c.application_status === "processing" || c.application_status === "submitted").length;
  const deniedCount = clients.filter((c) => c.application_status === "denied").length;
  const actionReqCount = clients.filter((c) => c.action_required || c.application_status === "action_required").length;
  const docsReviewCount = clients.filter((c) => c.document_status === "under_review" || c.application_status === "documents_under_review").length;
  const docsRejectedCount = clients.filter((c) => c.document_status === "rejected").length;
  const msfaaReqCount = clients.filter((c) => c.msfaa_status === "required" || c.msfaa_status === "action_required").length;
  const auditFailedCount = clients.filter((c) => c.application_status === "audit_failed").length;
  const manualReviewCount = clients.filter((c) => c.application_status === "manual_review_required").length;

  const urgentClients = clients.filter((c) => c.action_required || c.priority === "urgent" || c.priority === "high").slice(0, 6);
  const openActions = actions.filter((a) => a.status === "open" || a.status === "in_progress").slice(0, 5);
  const recentAudits = audits.slice(0, 5);

  const batchBreakdown = useMemo(() => {
    const map: Record<string, { total: number; submittedMsfaa: number; pendingMsfaa: number; holdCount: number; fundedCount: number }> = {};
    clients.forEach((c) => {
      const b = c.batch_name || "General Batch";
      if (!map[b]) map[b] = { total: 0, submittedMsfaa: 0, pendingMsfaa: 0, holdCount: 0, fundedCount: 0 };
      map[b].total++;
      if (c.msfaa_status === "submitted") map[b].submittedMsfaa++;
      else map[b].pendingMsfaa++;
      if (c.batch_name === "Hold" || c.notes?.toLowerCase().includes("discrepancy")) map[b].holdCount++;
      if (c.application_status === "completed" || c.application_status === "funded") map[b].fundedCount++;
    });

    return Object.entries(map).sort((a, b) => {
      const idxA = OSAP_BATCH_ORDER.indexOf(a[0]);
      const idxB = OSAP_BATCH_ORDER.indexOf(b[0]);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [clients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="section-heading">OSAP Management Dashboard</h1>
            <span className="text-xs bg-gold/15 text-gold border border-gold/30 px-2 py-0.5 rounded font-semibold uppercase">
              Live Portal Hub
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Real-time client tracking, document audits, and actionable OSAP status intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/dashboard/osap/import-export"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ArrowUpDown className="w-4 h-4" /> Import / Export
          </Link>
          <Link
            to="/dashboard/osap/audit-center"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Scan className="w-4 h-4" /> Run Batch Audit
          </Link>
        </div>
      </div>

      {/* Main Metric Cards Grid (Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Clients */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/clients" })}
          className="bg-card border border-border hover:border-gold/60 p-4 rounded-xl text-left transition-smooth group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Clients</span>
            <Users className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-smooth" />
          </div>
          <div className="text-3xl font-serif font-bold text-foreground">{totalClients}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Active client records</span>
        </button>

        {/* Approved */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/clients", search: { status: "approved" } as never })}
          className="bg-card border border-border hover:border-emerald-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-emerald-400">{approvedCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Funding finalized</span>
        </button>

        {/* Processing */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/clients", search: { status: "processing" } as never })}
          className="bg-card border border-border hover:border-amber-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">Processing</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-amber-400">{processingCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Under assessment</span>
        </button>

        {/* Action Required */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/actions" })}
          className="bg-card border border-border hover:border-rose-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-rose-400 font-medium uppercase tracking-wider">Action Req.</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-rose-400">{actionReqCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Urgent intervention</span>
        </button>

        {/* Denied */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/clients", search: { status: "denied" } as never })}
          className="bg-card border border-border hover:border-rose-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-rose-400 font-medium uppercase tracking-wider">Denied</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-rose-400">{deniedCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Appeals / Ineligible</span>
        </button>

        {/* Documents Under Review */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/documents", search: { filter: "under_review" } as never })}
          className="bg-card border border-border hover:border-cyan-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-cyan-400 font-medium uppercase tracking-wider">Docs Review</span>
            <FileCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-cyan-400">{docsReviewCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Staff / FAO reviewing</span>
        </button>

        {/* Documents Rejected */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/documents", search: { filter: "rejected" } as never })}
          className="bg-card border border-border hover:border-rose-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-rose-400 font-medium uppercase tracking-wider">Docs Rejected</span>
            <FileX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-rose-400">{docsRejectedCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Needs re-upload</span>
        </button>

        {/* MSFAA Required */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/clients", search: { msfaa: "required" } as never })}
          className="bg-card border border-border hover:border-amber-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-medium uppercase tracking-wider">MSFAA Missing</span>
            <FileText className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-amber-400">{msfaaReqCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Loan agreement needed</span>
        </button>

        {/* Audit Failed */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/audit-history", search: { status: "failed" } as never })}
          className="bg-card border border-border hover:border-rose-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-rose-400 font-medium uppercase tracking-wider">Audit Failed</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-rose-400">{auditFailedCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Portal / Auth issue</span>
        </button>

        {/* Manual Review */}
        <button
          onClick={() => navigate({ to: "/dashboard/osap/clients", search: { status: "manual_review_required" } as never })}
          className="bg-card border border-border hover:border-purple-500/60 p-4 rounded-xl text-left transition-smooth group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-purple-400 font-medium uppercase tracking-wider">Manual Review</span>
            <HelpCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-serif font-bold text-purple-400">{manualReviewCount}</div>
          <span className="text-[11px] text-muted-foreground mt-1 block">Staff check required</span>
        </button>
      </div>

      {/* Spreadsheet Dated Batches & Cohorts Grid */}
      <div className="bg-card border-2 border-gold/30 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-gold/15 text-gold font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                <span>Spreadsheet Dated Batches & Cohorts</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold/20 text-gold font-mono font-semibold">
                  {batchBreakdown.length} Batches ({totalClients} Students)
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Dated cohorts matching each page from the College Google Workbook.
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/osap/clients"
            className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Folder className="w-3.5 h-3.5 text-gold" /> View All in Clients Directory
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {batchBreakdown.map(([batchName, stats]) => {
            const isHold = batchName === "Hold";
            return (
              <div
                key={batchName}
                className={`p-4 rounded-xl border transition-smooth bg-muted/20 hover:bg-muted/40 ${
                  isHold ? "border-rose-500/40 hover:border-rose-500" : "border-border hover:border-gold/60"
                } space-y-3 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{isHold ? "🚨" : "📁"}</span>
                      <h4 className="font-bold text-foreground text-sm truncate" title={batchName}>
                        {batchName}
                      </h4>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                      isHold ? "bg-rose-500/20 text-rose-300" : "bg-gold/20 text-gold"
                    }`}>
                      {stats.total}
                    </span>
                  </div>

                  {/* Status Breakdown Pills */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] mt-3">
                    <div className="p-1.5 rounded bg-card border border-border">
                      <span className="text-muted-foreground block text-[10px]">MSFAA Done</span>
                      <span className="font-bold text-emerald-400 font-mono">{stats.submittedMsfaa}</span>
                    </div>
                    <div className="p-1.5 rounded bg-card border border-border">
                      <span className="text-muted-foreground block text-[10px]">MSFAA Pending</span>
                      <span className={`font-bold font-mono ${stats.pendingMsfaa > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {stats.pendingMsfaa}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <Link
                    to="/dashboard/osap/clients"
                    search={{ batch: batchName }}
                    className="flex-1 text-center py-1.5 px-2.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-semibold text-foreground transition-smooth flex items-center justify-center gap-1"
                  >
                    <span>View Batch</span>
                    <ArrowRight className="w-3 h-3 text-gold" />
                  </Link>
                  <Link
                    to="/dashboard/osap/audit-center"
                    search={{ batch: batchName }}
                    className="py-1.5 px-2.5 rounded-lg bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 text-xs font-semibold transition-smooth"
                    title="Audit this batch"
                  >
                    <Scan className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Action Required & Urgent Attention Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-semibold text-foreground text-lg">Action Required Queue</h3>
              </div>
              <Link
                to="/dashboard/osap/actions"
                className="text-xs text-gold hover:text-gold-dark transition-smooth flex items-center gap-1 font-medium"
              >
                View all actions <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {urgentClients.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/10">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium text-foreground">No urgent actions pending</p>
                <p className="text-xs text-muted-foreground mt-0.5">All audited client applications are currently in good standing.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {urgentClients.map((client) => {
                  const statusConfig = APPLICATION_STATUS_LABELS[client.application_status];
                  const priorityConfig = PRIORITY_CONFIG[client.priority];
                  return (
                    <div key={client.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/dashboard/osap/clients/$id"
                            params={{ id: client.id }}
                            className="font-medium text-foreground hover:text-gold transition-smooth truncate"
                          >
                            {client.full_name}
                          </Link>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                            {statusConfig.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${priorityConfig.bg} ${priorityConfig.color}`}>
                            {priorityConfig.label} Priority
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {client.action_required_summary || `${client.school || "School not set"} • ${client.program || "Program not set"}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          to="/dashboard/osap/clients/$id"
                          params={{ id: client.id }}
                          className="px-3 py-1.5 text-xs bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 rounded-md font-medium transition-smooth"
                        >
                          Review Client
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions / Getting Started Card */}
          <div className="bg-gradient-to-r from-card to-card/80 border border-gold/30 rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-serif font-bold text-lg text-foreground">Manage OSAP with Spreadsheets</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
                  Upload an Excel spreadsheet with student columns to immediately import, detect duplicates, and trigger batch audits across all active applications.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/dashboard/osap/import-export" className="btn-primary flex items-center gap-2 text-sm">
                  <ArrowUpDown className="w-4 h-4" /> Import Spreadsheet
                </Link>
                <Link to="/dashboard/osap/clients" search={{ add: "true" } as never} className="btn-secondary flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Add Single Client
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Audits & Change Feed */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-foreground text-lg">Recent Audits</h3>
              </div>
              <Link
                to="/dashboard/osap/audit-history"
                className="text-xs text-gold hover:text-gold-dark transition-smooth flex items-center gap-1 font-medium"
              >
                Full history <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentAudits.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg bg-muted/10">
                <Scan className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                <p className="text-sm font-medium text-foreground">No audits recorded yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Run your first audit from the Audit Center.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentAudits.map((audit) => (
                  <div key={audit.id} className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{audit.client_name || "Client Audit"}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(audit.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{audit.summary}</p>
                    {audit.changes_detected && audit.changes_detected.length > 0 && (
                      <span className="inline-block px-1.5 py-0.5 bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 rounded text-[10px] font-medium">
                        ✓ {audit.changes_detected.length} change(s) detected
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
