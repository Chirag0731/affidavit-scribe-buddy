import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { getOsapClients } from "@/lib/osap-db";
import type { OsapClient } from "@/types/osap";
import { APPLICATION_STATUS_LABELS, OSAP_BATCH_ORDER } from "@/types/osap";
import { exportClientsToExcel } from "@/lib/osap-excel";

export const Route = createFileRoute("/_authenticated/dashboard/osap/applications")({
  component: OsapApplicationsPage,
  ssr: false,
});

function OsapApplicationsPage() {
  const [clients, setClients] = useState<OsapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getOsapClients();
      setClients(data);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const batches = Array.from(new Set(clients.map((c) => c.batch_name || "General Batch"))).sort((a, b) => {
    const idxA = OSAP_BATCH_ORDER.indexOf(a);
    const idxB = OSAP_BATCH_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const filtered = clients.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        c.full_name.toLowerCase().includes(q) ||
        (c.school && c.school.toLowerCase().includes(q)) ||
        (c.batch_name && c.batch_name.toLowerCase().includes(q)) ||
        (c.program && c.program.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (batchFilter !== "all" && (c.batch_name || "General Batch") !== batchFilter) return false;
    if (yearFilter !== "all" && c.application_year !== yearFilter) return false;
    if (statusFilter !== "all" && c.application_status !== statusFilter) return false;
    return true;
  });

  const years = Array.from(new Set(clients.map((c) => c.application_year || "2026"))).sort();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-heading">OSAP Applications</h1>
          <p className="text-muted-foreground mt-1">
            Track student application submissions, calculated grants & loans, and academic year stages across all spreadsheet batches.
          </p>
        </div>

        <button
          onClick={() => {
            exportClientsToExcel(filtered, "OSAP_Applications.xlsx");
            toast.success("Applications exported to Excel");
          }}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" /> Export Applications ({filtered.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 grid md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, batch, school..."
            className="input-base pl-10 text-sm"
          />
        </div>

        <div>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="input-base text-sm font-medium border-gold/40"
          >
            <option value="all">📁 All Batches ({clients.length})</option>
            {batches.map((b) => (
              <option key={b} value={b}>📁 {b}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="input-base text-sm"
          >
            <option value="all">All Academic Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y} Academic Year</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base text-sm"
          >
            <option value="all">All Application Statuses</option>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-foreground text-base">No OSAP Applications Found</h3>
            <p className="text-xs text-muted-foreground mt-1">Import client data to view application statuses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                <tr>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Batch / Sheet</th>
                  <th className="p-4">Year & Institution</th>
                  <th className="p-4">Program & Period</th>
                  <th className="p-4">Funding Status</th>
                  <th className="p-4">Application Status</th>
                  <th className="p-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => {
                  const status = APPLICATION_STATUS_LABELS[c.application_status];
                  return (
                    <tr key={c.id} className="hover:bg-muted/20 transition-smooth">
                      <td className="p-4 font-medium text-foreground">
                        <Link to="/dashboard/osap/clients/$id" params={{ id: c.id }} className="hover:text-gold transition-smooth">
                          {c.full_name}
                        </Link>
                        <span className="text-xs text-muted-foreground block">{c.email || c.phone || "—"}</span>
                      </td>
                      <td className="p-4 text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-muted/60 border border-border text-foreground font-mono font-medium text-[11px]">
                          {c.batch_name || "General Batch"}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        <span className="font-semibold text-foreground">{c.application_year || "2026"}</span>
                        <span className="text-muted-foreground block">{c.school || "—"}</span>
                      </td>
                      <td className="p-4 text-xs">
                        <span className="font-medium text-foreground">{c.program || "—"}</span>
                        <span className="text-muted-foreground block">{c.study_period || "Full-Time"}</span>
                      </td>
                      <td className="p-4 text-xs font-mono font-medium text-foreground">
                        {c.funding_status || "Pending Calculation"}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${status.bg} ${status.color} ${status.border}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to="/dashboard/osap/clients/$id"
                          params={{ id: c.id }}
                          className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 text-foreground rounded font-medium transition-smooth"
                        >
                          View File
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
    </div>
  );
}
