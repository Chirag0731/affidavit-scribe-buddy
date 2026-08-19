import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  History,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  ExternalLink,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getOsapAudits, getOsapClients } from "@/lib/osap-db";
import { generateSingleAuditPdf, downloadPdfBlob } from "@/lib/osap-pdf-generator";
import type { OsapAudit, OsapClient } from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/audit-history")({
  validateSearch: (search: Record<string, unknown>): { status?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: OsapAuditHistoryPage,
  ssr: false,
});

function OsapAuditHistoryPage() {
  const searchParams = Route.useSearch();
  const [audits, setAudits] = useState<OsapAudit[]>([]);
  const [clients, setClients] = useState<OsapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.status || "all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [auditData, clientData] = await Promise.all([getOsapAudits(), getOsapClients()]);
      setAudits(auditData);
      setClients(clientData);
    } catch {
      toast.error("Failed to load audit history");
    } finally {
      setLoading(false);
    }
  };

  const filtered = audits.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        (a.client_name && a.client_name.toLowerCase().includes(q)) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        (a.conducted_by && a.conducted_by.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleDownloadAuditPdf = async (audit: OsapAudit) => {
    setDownloadingId(audit.id);
    try {
      let client = clients.find((c) => c.id === audit.client_id);
      if (!client) {
        client = {
          id: audit.client_id,
          user_id: audit.user_id || "system",
          first_name: (audit.client_name || "Client").split(" ")[0] || "Client",
          last_name: (audit.client_name || "").split(" ").slice(1).join(" ") || "",
          full_name: audit.client_name || "Client",
          school: "College",
          program: "Acupuncture 50 weeks",
          application_year: "2026",
          application_status: "submitted",
          document_status: "approved",
          msfaa_status: "submitted",
          credential_status: "connected",
          priority: "medium",
          action_required: false,
          created_at: audit.created_at,
          updated_at: audit.created_at,
        };
      }
      const blob = await generateSingleAuditPdf(audit, client);
      const filename = `OSAP_Audit_${(client.full_name || "Client").replace(/\s+/g, "_")}_${audit.created_at.slice(0, 10)}.pdf`;
      downloadPdfBlob(blob, filename);
      toast.success(`📥 Audit report downloaded for ${client.full_name}`);
    } catch {
      toast.error("Failed to generate audit PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-heading">OSAP Audit History & Change Log</h1>
        <p className="text-muted-foreground mt-1">
          Complete, immutable timeline of every OSAP portal audit with detected changes and snapshot logs.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit summary, student name, auditor..."
            className="input-base pl-10 text-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base text-sm"
          >
            <option value="all">All Audit Statuses</option>
            <option value="changes_detected">Changes Detected</option>
            <option value="success">Success (No Changes)</option>
            <option value="mfa_required">MFA Paused</option>
            <option value="failed">Failed / Timeout</option>
            <option value="manual_review_required">Manual Review Required</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-foreground text-base">No Audits Recorded</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Trigger single or batch audits from the Audit Center to start tracking portal changes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((a) => (
              <div key={a.id} className="p-6 hover:bg-muted/10 transition-smooth space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-foreground text-base">
                      {a.client_name || "Client Audit"}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                        a.status === "changes_detected"
                          ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40"
                          : a.status === "mfa_required"
                          ? "bg-amber-900/30 text-amber-400 border border-amber-800/40"
                          : a.status === "failed"
                          ? "bg-rose-900/30 text-rose-400 border border-rose-800/40"
                          : "bg-blue-900/30 text-blue-400"
                      }`}
                    >
                      {a.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Auditor: <strong className="text-foreground">{a.conducted_by || "System"}</strong></span>
                    <span>•</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                    <button
                      onClick={() => handleDownloadAuditPdf(a)}
                      disabled={downloadingId === a.id}
                      className="px-2.5 py-1 bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-smooth"
                    >
                      {downloadingId === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      <span>{downloadingId === a.id ? "Generating PDF..." : "Download PDF"}</span>
                    </button>
                    {a.client_id && (
                      <Link
                        to="/dashboard/osap/clients/$id"
                        params={{ id: a.client_id }}
                        className="text-gold hover:text-gold-dark font-medium inline-flex items-center gap-1 ml-1"
                      >
                        Client File <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">{a.summary}</p>

                {/* Changes Detected Table */}
                {a.changes_detected && a.changes_detected.length > 0 && (
                  <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs space-y-1.5 mt-2">
                    <span className="font-bold text-emerald-400 block tracking-wide uppercase text-[10px]">
                      Changes Detected ({a.changes_detected.length})
                    </span>
                    <div className="divide-y divide-emerald-900/30">
                      {a.changes_detected.map((c) => (
                        <div key={c.id} className="py-1.5 flex items-center justify-between gap-4 text-emerald-300">
                          <span className="font-medium">{c.field_name}:</span>
                          <span className="font-mono">
                            <span className="line-through text-emerald-500/70 mr-2">{c.previous_value}</span>
                            <span className="text-emerald-400 font-bold">→ {c.new_value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
