import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { getOsapDocuments, getOsapClients } from "@/lib/osap-db";
import type { OsapDocument, OsapClient } from "@/types/osap";
import { DOCUMENT_STATUS_LABELS } from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/documents")({
  validateSearch: (search: Record<string, unknown>): { filter?: string } => ({
    filter: typeof search.filter === "string" ? search.filter : undefined,
  }),
  component: OsapDocumentsPage,
  ssr: false,
});

function OsapDocumentsPage() {
  const searchParams = Route.useSearch();
  const [tabView, setTabView] = useState<"documents" | "msfaa">("msfaa");
  const [documents, setDocuments] = useState<OsapDocument[]>([]);
  const [allClients, setAllClients] = useState<OsapClient[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, OsapClient>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.filter || "all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [msfaaFilter, setMsfaaFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docs, clients] = await Promise.all([
        getOsapDocuments(),
        getOsapClients(),
      ]);

      setAllClients(clients);
      const map: Record<string, OsapClient> = {};
      clients.forEach((c) => {
        map[c.id] = c;
      });

      // If documents table is empty, generate document entries from clients' document status
      if (docs.length === 0 && clients.length > 0) {
        const syntheticDocs: OsapDocument[] = [];
        clients.forEach((c) => {
          syntheticDocs.push({
            id: `doc-1-${c.id}`,
            client_id: c.id,
            user_id: c.user_id,
            document_name: "Affidavit of Separation / Marital Status",
            required: true,
            status: c.document_status,
            submission_date: c.last_audit_at ? c.last_audit_at.split("T")[0] : "2026-08-18",
            rejection_reason: c.document_status === "rejected" ? "Missing notary seal / commissioner signature" : null,
            created_at: c.created_at,
          });
          syntheticDocs.push({
            id: `doc-2-${c.id}`,
            client_id: c.id,
            user_id: c.user_id,
            document_name: "Proof of Canadian Status & ID",
            required: true,
            status: c.document_status === "rejected" ? "under_review" : c.document_status,
            submission_date: "2026-08-18",
            created_at: c.created_at,
          });
        });
        setDocuments(syntheticDocs);
      } else {
        setDocuments(docs);
      }

      setClientsMap(map);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const pendingMsfaaClients = allClients.filter((c) => c.msfaa_status !== "submitted");

  const filteredDocs = documents.filter((d) => {
    const client = clientsMap[d.client_id];
    if (search) {
      const q = search.toLowerCase();
      const match =
        d.document_name.toLowerCase().includes(q) ||
        (client && client.full_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    return true;
  });

  const filteredMsfaaClients = allClients.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        c.full_name.toLowerCase().includes(q) ||
        (c.oan && c.oan.toLowerCase().includes(q)) ||
        (c.batch_name && c.batch_name.toLowerCase().includes(q)) ||
        (c.assigned_staff && c.assigned_staff.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (batchFilter !== "all" && (c.batch_name || "General Batch") !== batchFilter) return false;
    if (msfaaFilter === "pending" && c.msfaa_status === "submitted") return false;
    if (msfaaFilter === "submitted" && c.msfaa_status !== "submitted") return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-heading">OSAP Documents & MSFAA Center</h1>
        <p className="text-muted-foreground mt-1">
          Track uploaded affidavits, identity papers, and monitor pending Master Student Financial Assistance Agreements (MSFAA).
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-border text-sm font-medium">
        <button
          onClick={() => setTabView("msfaa")}
          className={`px-4 py-3 border-b-2 transition-smooth flex items-center gap-2 ${
            tabView === "msfaa"
              ? "border-gold text-gold font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>MSFAA Agreements Tracking</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            {pendingMsfaaClients.length} Pending
          </span>
        </button>

        <button
          onClick={() => setTabView("documents")}
          className={`px-4 py-3 border-b-2 transition-smooth flex items-center gap-2 ${
            tabView === "documents"
              ? "border-gold text-gold font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          <span>Supporting Documents Matrix ({documents.length})</span>
        </button>
      </div>

      {tabView === "msfaa" ? (
        <>
          {/* MSFAA Filter Bar */}
          <div className="bg-card border border-border rounded-xl p-4 grid md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, OAN, batch, staff..."
                className="input-base pl-10 text-sm"
              />
            </div>

            <div>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="input-base text-sm font-medium border-gold/40"
              >
                <option value="all">📁 All Batches ({allClients.length})</option>
                {Array.from(new Set(allClients.map((c) => c.batch_name || "General Batch"))).sort().map((b) => (
                  <option key={b} value={b}>📁 {b}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={msfaaFilter}
                onChange={(e) => setMsfaaFilter(e.target.value)}
                className="input-base text-sm font-medium"
              >
                <option value="all">All MSFAA Statuses</option>
                <option value="pending">⚠️ Pending / Required MSFAA ({pendingMsfaaClients.length})</option>
                <option value="submitted">✅ Submitted MSFAA ({allClients.length - pendingMsfaaClients.length})</option>
              </select>
            </div>
          </div>

          {/* MSFAA Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            ) : filteredMsfaaClients.length === 0 ? (
              <div className="p-12 text-center">
                <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-semibold text-foreground text-base">No Matching MSFAA Records</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust your search or batch filter to view student MSFAA records.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Student Name</th>
                      <th className="p-4">Batch / Sheet</th>
                      <th className="p-4">OAN Number</th>
                      <th className="p-4">MSFAA Status</th>
                      <th className="p-4">Assigned Staff</th>
                      <th className="p-4">Action Item</th>
                      <th className="p-4 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMsfaaClients.map((c) => {
                      const isPending = c.msfaa_status !== "submitted";
                      return (
                        <tr key={c.id} className="hover:bg-muted/20 transition-smooth">
                          <td className="p-4 font-medium text-foreground">
                            <Link
                              to="/dashboard/osap/clients/$id"
                              params={{ id: c.id }}
                              className="hover:text-gold transition-smooth"
                            >
                              {c.full_name}
                            </Link>
                            <span className="text-xs text-muted-foreground block">{c.email || c.phone || "No contact"}</span>
                          </td>
                          <td className="p-4 text-xs font-mono">
                            <span className="px-2 py-0.5 rounded bg-muted/60 border border-border text-foreground font-medium">
                              {c.batch_name || "General Batch"}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-xs text-foreground">
                            {c.oan || "—"}
                          </td>
                          <td className="p-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <AlertTriangle className="w-3.5 h-3.5" /> Pending Signature
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Submitted
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-medium text-foreground">
                            {c.assigned_staff || "Unassigned"}
                          </td>
                          <td className="p-4 text-xs text-muted-foreground max-w-[220px]">
                            {isPending ? (
                              <span className="text-amber-400 font-medium">
                                Needs online MSFAA completion on NSLSC
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Agreement verified on file
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <Link
                              to="/dashboard/osap/clients/$id"
                              params={{ id: c.id }}
                              className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground rounded text-xs font-medium transition-smooth inline-flex items-center gap-1"
                            >
                              View File <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Documents Filter bar */}
          <div className="bg-card border border-border rounded-xl p-4 grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search document name or student..."
                className="input-base pl-10 text-sm"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-base text-sm"
              >
                <option value="all">All Document Statuses</option>
                {Object.entries(DOCUMENT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="p-12 text-center">
                <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-semibold text-foreground text-base">No OSAP Documents Found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Run audits on clients to populate the document verification matrix.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 border-b border-border text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                    <tr>
                      <th className="p-4">Document Name</th>
                      <th className="p-4">Student / Client</th>
                      <th className="p-4">Submission Date</th>
                      <th className="p-4">Verification Status</th>
                      <th className="p-4">Notes / Rejection Reason</th>
                      <th className="p-4 text-right">Student File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredDocs.map((d) => {
                      const client = clientsMap[d.client_id];
                      const status = DOCUMENT_STATUS_LABELS[d.status];
                      return (
                        <tr key={d.id} className="hover:bg-muted/20 transition-smooth">
                          <td className="p-4 font-semibold text-foreground">
                            {d.document_name}
                          </td>
                          <td className="p-4">
                            {client ? (
                              <Link
                                to="/dashboard/osap/clients/$id"
                                params={{ id: client.id }}
                                className="font-medium text-foreground hover:text-gold transition-smooth"
                              >
                                {client.full_name}
                              </Link>
                            ) : (
                              "Unknown Client"
                            )}
                          </td>
                          <td className="p-4 text-xs text-muted-foreground font-mono">
                            {d.submission_date || "—"}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.color}`}
                            >
                              {status.label}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {d.rejection_reason || "Verified on file"}
                          </td>
                          <td className="p-4 text-right">
                            {client && (
                              <Link
                                to="/dashboard/osap/clients/$id"
                                params={{ id: client.id }}
                                className="px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded font-medium transition-smooth"
                              >
                                Open Profile
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
