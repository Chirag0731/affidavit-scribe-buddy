import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Scan,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Trash2,
  Edit,
  Download,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOsapClients, saveOsapClient, deleteOsapClient, resetOsapClientsToSpreadsheet } from "@/lib/osap-db";
import { maskOan } from "@/lib/osap-crypto";
import { exportClientsToExcel } from "@/lib/osap-excel";
import type {
  OsapClient,
  OsapApplicationStatus,
  OsapDocumentStatus,
  OsapMsfaaStatus,
  OsapPriority,
  OsapCredentialStatus,
} from "@/types/osap";
import {
  APPLICATION_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  MSFAA_STATUS_LABELS,
  PRIORITY_CONFIG,
  CREDENTIAL_STATUS_CONFIG,
  OSAP_BATCH_ORDER,
} from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/clients/")({
  validateSearch: (search: Record<string, unknown>): { status?: string; msfaa?: string; add?: string } => ({
    status: typeof search.status === "string" ? search.status : undefined,
    msfaa: typeof search.msfaa === "string" ? search.msfaa : undefined,
    add: typeof search.add === "string" ? search.add : undefined,
  }),
  component: OsapClientsPage,
  ssr: false,
});

function OsapClientsPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();

  const [clients, setClients] = useState<OsapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.status || "all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [credentialFilter, setCredentialFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [msfaaFilter, setMsfaaFilter] = useState<string>(searchParams.msfaa || "all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add / Edit Client Modal State
  const [modalOpen, setModalOpen] = useState(searchParams.add === "true");
  const [editingClient, setEditingClient] = useState<OsapClient | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state with requested defaults
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formOan, setFormOan] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formSchool, setFormSchool] = useState("Eight Branches");
  const [formProgram, setFormProgram] = useState("Acupuncture 50 weeks");
  const [formStudyPeriod, setFormStudyPeriod] = useState("Full-Time (50 weeks)");
  const [formYear, setFormYear] = useState("2026");
  const [formBatch, setFormBatch] = useState("March 2026");
  const [formStaff, setFormStaff] = useState("Sales");
  const [formPriority, setFormPriority] = useState<OsapPriority>("medium");
  const [formAppStatus, setFormAppStatus] = useState<OsapApplicationStatus>("not_started");
  const [formNotes, setFormNotes] = useState("");

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

  const openAddModal = () => {
    setEditingClient(null);
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormPhone("");
    setFormOan("");
    setFormPassword("");
    setFormSchool("Eight Branches");
    setFormProgram("Acupuncture 50 weeks");
    setFormStudyPeriod("Full-Time (50 weeks)");
    setFormYear("2026");
    setFormBatch("March 2026");
    setFormStaff("Sales");
    setFormPriority("medium");
    setFormAppStatus("not_started");
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditModal = (c: OsapClient) => {
    setEditingClient(c);
    setFormFirstName(c.first_name);
    setFormLastName(c.last_name);
    setFormEmail(c.email || "");
    setFormPhone(c.phone || "");
    setFormOan(c.oan || "");
    setFormPassword("");
    setFormSchool(c.school || "Eight Branches");
    setFormProgram(c.program || "Acupuncture 50 weeks");
    setFormStudyPeriod(c.study_period || "Full-Time (50 weeks)");
    setFormYear(c.application_year || "2026");
    setFormBatch(c.batch_name || "March 2026");
    setFormStaff(c.assigned_staff || "Sales");
    setFormPriority(c.priority);
    setFormAppStatus(c.application_status);
    setFormNotes(c.notes || "");
    setModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formLastName.trim()) {
      toast.error("First and Last name are required");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fullName = `${formFirstName.trim()} ${formLastName.trim()}`;
      await saveOsapClient(
        {
          id: editingClient?.id,
          first_name: formFirstName.trim(),
          last_name: formLastName.trim(),
          full_name: fullName,
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          oan: formOan.trim() || null,
          rawPassword: formPassword.trim() || undefined,
          school: formSchool.trim() || null,
          program: formProgram.trim() || null,
          study_period: formStudyPeriod.trim() || null,
          application_year: formYear.trim() || "2026",
          batch_name: formBatch.trim() || null,
          assigned_staff: formStaff.trim() || null,
          priority: formPriority,
          application_status: formAppStatus,
          notes: formNotes.trim() || null,
        },
        user.id,
      );

      toast.success(editingClient ? "Client updated" : "Client created successfully");
      setModalOpen(false);
      await loadClients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Delete OSAP client "${name}" and all associated audit records?`)) return;
    try {
      await deleteOsapClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success("Client deleted");
    } catch {
      toast.error("Failed to delete client");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const uniqueBatches = useMemo(() => {
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

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matches =
          c.full_name.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.oan && c.oan.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q)) ||
          (c.school && c.school.toLowerCase().includes(q)) ||
          (c.program && c.program.toLowerCase().includes(q)) ||
          (c.batch_name && c.batch_name.toLowerCase().includes(q)) ||
          (c.assigned_staff && c.assigned_staff.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (batchFilter !== "all" && (c.batch_name || "General Batch") !== batchFilter) return false;
      if (statusFilter !== "all" && c.application_status !== statusFilter) return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
      if (credentialFilter !== "all" && c.credential_status !== credentialFilter) return false;

      // MSFAA filtering
      if (msfaaFilter === "pending") {
        if (c.msfaa_status === "submitted") return false;
      } else if (msfaaFilter === "submitted") {
        if (c.msfaa_status !== "submitted") return false;
      } else if (msfaaFilter !== "all" && c.msfaa_status !== msfaaFilter) {
        return false;
      }

      return true;
    });
  }, [clients, searchTerm, batchFilter, statusFilter, priorityFilter, credentialFilter, msfaaFilter]);

  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, page, pageSize]);

  const handleExportSelected = () => {
    const toExport = selectedIds.size > 0
      ? clients.filter((c) => selectedIds.has(c.id))
      : filteredClients;
    exportClientsToExcel(toExport, `OSAP_Clients_${Date.now()}.xlsx`);
    toast.success(`Exported ${toExport.length} clients to Excel`);
  };

  const handleResetToSpreadsheet = () => {
    if (window.confirm("Reload and re-sync all 421 student files directly from the latest spreadsheet data?")) {
      const fresh = resetOsapClientsToSpreadsheet();
      setClients(fresh);
      toast.success(`Synced ${fresh.length} student records from spreadsheet!`);
    }
  };

  const pendingMsfaaClients = useMemo(() => clients.filter((c) => c.msfaa_status !== "submitted"), [clients]);
  const holdDiscrepancyClients = useMemo(() => clients.filter((c) => c.batch_name === "Hold" || c.notes?.toLowerCase().includes("discrepancy")), [clients]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-heading">OSAP Clients</h1>
          <p className="text-muted-foreground mt-1">
            Search, manage student files, monitor credential connections, and inspect pending MSFAA agreements by batch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetToSpreadsheet}
            className="btn-secondary flex items-center gap-2 text-sm border-gold/40 text-gold hover:bg-gold/10"
            title="Reload fresh data directly from spreadsheet"
          >
            <RotateCcw className="w-4 h-4" /> Re-sync Spreadsheet Data
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Client
          </button>
          <Link to="/dashboard/osap/import-export" className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowUpDown className="w-4 h-4" /> Import Excel
          </Link>
          <button onClick={handleExportSelected} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export ({selectedIds.size > 0 ? selectedIds.size : "All"})
          </button>
        </div>
      </div>

      {/* Quick Filter Status Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => {
            setMsfaaFilter("all");
            setStatusFilter("all");
            setBatchFilter("all");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-smooth whitespace-nowrap ${
            msfaaFilter === "all" && statusFilter === "all" && batchFilter === "all"
              ? "bg-gold text-black border-gold font-semibold shadow-xs"
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All Students ({clients.length})
        </button>

        <button
          onClick={() => {
            setMsfaaFilter("pending");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-smooth whitespace-nowrap flex items-center gap-1.5 ${
            msfaaFilter === "pending"
              ? "bg-amber-500/20 text-amber-300 border-amber-500 font-semibold"
              : "bg-card border-border text-amber-400/80 hover:text-amber-300"
          }`}
        >
          <span>⚠️ Pending MSFAA</span>
          <span className="px-1.5 py-0.2 bg-amber-500/30 rounded-full font-mono text-[10px]">
            {pendingMsfaaClients.length}
          </span>
        </button>

        <button
          onClick={() => {
            setBatchFilter("Hold");
            setMsfaaFilter("all");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-smooth whitespace-nowrap flex items-center gap-1.5 ${
            batchFilter === "Hold"
              ? "bg-rose-500/20 text-rose-300 border-rose-500 font-semibold"
              : "bg-card border-border text-rose-400/80 hover:text-rose-300"
          }`}
        >
          <span>🚨 Holds & Discrepancies</span>
          <span className="px-1.5 py-0.2 bg-rose-500/30 rounded-full font-mono text-[10px]">
            {holdDiscrepancyClients.length}
          </span>
        </button>

        <button
          onClick={() => {
            setMsfaaFilter("submitted");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-smooth whitespace-nowrap flex items-center gap-1.5 ${
            msfaaFilter === "submitted"
              ? "bg-sky-500/20 text-sky-300 border-sky-500 font-semibold"
              : "bg-card border-border text-sky-400/80 hover:text-sky-300"
          }`}
        >
          <span>✅ MSFAA Submitted</span>
          <span className="px-1.5 py-0.2 bg-sky-500/30 rounded-full font-mono text-[10px]">
            {clients.length - pendingMsfaaClients.length}
          </span>
        </button>

        <button
          onClick={() => {
            setStatusFilter("completed");
            setMsfaaFilter("all");
            setBatchFilter("all");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg border font-medium transition-smooth whitespace-nowrap flex items-center gap-1.5 ${
            statusFilter === "completed" || statusFilter === "funded"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 font-semibold"
              : "bg-card border-border text-emerald-400/80 hover:text-emerald-300"
          }`}
        >
          <span>💰 Funded & Completed</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/30 rounded-full font-mono text-[10px]">
            {clients.filter((c) => c.application_status === "completed" || c.application_status === "funded").length}
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="grid md:grid-cols-6 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, OAN, batch, school..."
              className="input-base pl-10"
            />
          </div>

          <div>
            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setPage(1);
              }}
              className="input-base border-gold/40 text-xs font-medium"
            >
              <option value="all">📁 All Batches ({clients.length})</option>
              {uniqueBatches.map(([b, count]) => (
                <option key={b} value={b}>
                  📁 {b} ({count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={msfaaFilter}
              onChange={(e) => {
                setMsfaaFilter(e.target.value);
                setPage(1);
              }}
              className="input-base text-xs font-medium"
            >
              <option value="all">All MSFAA Statuses</option>
              <option value="pending">⚠️ Pending / Incomplete MSFAA ({pendingMsfaaClients.length})</option>
              <option value="submitted">✅ Submitted MSFAA ({clients.length - pendingMsfaaClients.length})</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-base text-xs"
            >
              <option value="all">All Application Statuses</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-base text-xs"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Active Filter Banner */}
        {(batchFilter !== "all" || msfaaFilter === "pending") && (
          <div className="flex items-center justify-between bg-muted/40 border border-border px-4 py-2.5 rounded-lg text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">Active Filter:</span>
              {batchFilter !== "all" && (
                <span className="px-2 py-0.5 bg-gold/15 text-gold font-mono font-semibold rounded border border-gold/30">
                  Batch: {batchFilter}
                </span>
              )}
              {msfaaFilter === "pending" && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-semibold rounded border border-amber-500/40">
                  ⚠️ Showing {filteredClients.length} Students with Pending MSFAA
                </span>
              )}
            </div>
            <Link
              to="/dashboard/osap/audit-center"
              className="btn-primary py-1 px-3 text-xs flex items-center gap-1.5"
            >
              <Scan className="w-3.5 h-3.5" /> Run Smart Audit on Filtered List
            </Link>
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-gold/10 border border-gold/30 px-4 py-2.5 rounded-lg text-xs">
            <span className="font-medium text-gold">
              {selectedIds.size} client(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard/osap/audit-center"
                className="px-3 py-1 bg-gold text-black font-semibold rounded hover:bg-gold-dark transition-smooth flex items-center gap-1.5"
              >
                <Scan className="w-3.5 h-3.5" /> Run Batch Audit on Selected
              </Link>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2 py-1 text-muted-foreground hover:text-foreground"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-gold animate-spin" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold text-foreground text-base">No OSAP Clients Found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {clients.length === 0
                ? "Get started by importing an Excel spreadsheet or adding your first student record."
                : "No clients match your search and filter criteria."}
            </p>
            {clients.length === 0 && (
              <div className="flex items-center justify-center gap-3">
                <button onClick={openAddModal} className="btn-primary inline-flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Add Client
                </button>
                <Link to="/dashboard/osap/import-export" className="btn-secondary inline-flex items-center gap-2 text-sm">
                  <ArrowUpDown className="w-4 h-4" /> Import Excel
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                <tr>
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredClients.length && filteredClients.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="p-4">Student / Client</th>
                  <th className="p-4">Batch / Sheet</th>
                  <th className="p-4">OAN & Credentials</th>
                  <th className="p-4">School & Program</th>
                  <th className="p-4">OSAP Status</th>
                  <th className="p-4">Docs & MSFAA</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedClients.map((client) => {
                  const appStatus = APPLICATION_STATUS_LABELS[client.application_status];
                  const docStatus = DOCUMENT_STATUS_LABELS[client.document_status];
                  const msfaaStatus = MSFAA_STATUS_LABELS[client.msfaa_status];
                  const priority = PRIORITY_CONFIG[client.priority];
                  const credStatus = CREDENTIAL_STATUS_CONFIG[client.credential_status];
                  const isSelected = selectedIds.has(client.id);

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-muted/20 transition-smooth ${
                        isSelected ? "bg-gold/5" : ""
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(client.id)}
                          className="rounded border-border"
                        />
                      </td>

                      <td className="p-4">
                        <Link
                          to="/dashboard/osap/clients/$id"
                          params={{ id: client.id }}
                          className="font-medium text-foreground hover:text-gold transition-smooth block"
                        >
                          {client.full_name}
                        </Link>
                        <span className="text-xs text-muted-foreground block">
                          {client.email || client.phone || "No contact info"}
                        </span>
                      </td>

                      <td className="p-4 text-xs">
                        <span
                          className="inline-block px-2 py-0.5 rounded bg-muted/60 border border-border text-foreground font-mono font-medium text-[11px] truncate max-w-[130px]"
                          title={client.batch_name || "General Batch"}
                        >
                          {client.batch_name || "General Batch"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-mono text-xs text-foreground">
                          {maskOan(client.oan)}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 ${credStatus.bg} ${credStatus.color}`}
                        >
                          <Shield className="w-2.5 h-2.5" /> {credStatus.label}
                        </span>
                      </td>

                      <td className="p-4 text-xs">
                        <div className="font-medium text-foreground truncate max-w-[160px]">
                          {client.school || "—"}
                        </div>
                        <div className="text-muted-foreground truncate max-w-[160px]">
                          {client.program || "—"} {client.application_year ? `(${client.application_year})` : ""}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-block text-xs px-2.5 py-1 rounded-full border font-medium ${appStatus.bg} ${appStatus.color} ${appStatus.border}`}
                        >
                          {appStatus.label}
                        </span>
                        {client.funding_status && (
                          <span className="text-[11px] text-muted-foreground block mt-1 truncate max-w-[140px]">
                            {client.funding_status}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-xs space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-[11px]">Docs:</span>
                          <span className={`text-[11px] font-medium ${docStatus.color}`}>
                            {docStatus.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-[11px]">MSFAA:</span>
                          <span className={`text-[11px] font-medium ${msfaaStatus.color}`}>
                            {msfaaStatus.label}
                          </span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${priority.bg} ${priority.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
                          {priority.label}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to="/dashboard/osap/clients/$id"
                            params={{ id: client.id }}
                            className="px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded font-medium transition-smooth"
                          >
                            Profile
                          </Link>
                          <button
                            onClick={() => openEditModal(client)}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-smooth"
                            title="Edit Client"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id, client.full_name)}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-smooth"
                            title="Delete Client"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredClients.length > 0 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs bg-muted/10">
            <span className="text-muted-foreground">
              Showing <strong>{Math.min(filteredClients.length, (page - 1) * pageSize + 1)}</strong> to <strong>{Math.min(filteredClients.length, page * pageSize)}</strong> of <strong>{filteredClients.length}</strong> clients
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="input-base text-xs py-1 px-2 h-auto"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>All (400+)</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 border border-border rounded bg-card hover:bg-muted disabled:opacity-40 font-medium"
                >
                  Previous
                </button>
                <span className="px-2 font-medium">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 border border-border rounded bg-card hover:bg-muted disabled:opacity-40 font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Client Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in my-8">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-foreground">
                  {editingClient ? "Edit OSAP Client" : "Add New OSAP Client"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter student details. Passwords will be encrypted via WebCrypto AES-GCM.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    required
                    placeholder="e.g. Gurpreet"
                    className="input-base text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    required
                    placeholder="e.g. Singh"
                    className="input-base text-sm"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="input-base text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(416) 555-0192"
                    className="input-base text-sm"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/20 border border-border rounded-lg space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gold">
                  Secure OSAP Credentials
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">OAN (Ontario Access Number)</label>
                    <input
                      type="text"
                      value={formOan}
                      onChange={(e) => setFormOan(e.target.value)}
                      placeholder="e.g. 987654321"
                      className="input-base text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      OSAP Password {editingClient && "(Leave blank to keep unchanged)"}
                    </label>
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="input-base text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Batch / Sheet</label>
                  <input
                    type="text"
                    list="batch-form-presets"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    placeholder="March 2026"
                    className="input-base text-sm font-medium"
                  />
                  <datalist id="batch-form-presets">
                    {uniqueBatches.map(([b]) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">School / College</label>
                  <input
                    type="text"
                    list="school-presets"
                    value={formSchool}
                    onChange={(e) => setFormSchool(e.target.value)}
                    placeholder="Eight Branches"
                    className="input-base text-sm"
                  />
                  <datalist id="school-presets">
                    <option value="Eight Branches" />
                    <option value="Canadian College of Business Science & Technology - Etobicoke" />
                    <option value="Sheridan College" />
                    <option value="Seneca College" />
                    <option value="Humber College" />
                    <option value="George Brown College" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Program of Study</label>
                  <input
                    type="text"
                    list="program-presets"
                    value={formProgram}
                    onChange={(e) => setFormProgram(e.target.value)}
                    placeholder="Acupuncture 50 weeks"
                    className="input-base text-sm"
                  />
                  <datalist id="program-presets">
                    <option value="Acupuncture 50 weeks" />
                    <option value="HUMAN RESOURCE MANAGEMENT" />
                    <option value="Computer Programming" />
                    <option value="Business Administration" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Application Year</label>
                  <input
                    type="text"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="2026"
                    className="input-base text-sm"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Application Status</label>
                  <select
                    value={formAppStatus}
                    onChange={(e) => setFormAppStatus(e.target.value as OsapApplicationStatus)}
                    className="input-base text-sm"
                  >
                    {Object.entries(APPLICATION_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as OsapPriority)}
                    className="input-base text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Assigned Staff / Role</label>
                  <select
                    value={formStaff}
                    onChange={(e) => setFormStaff(e.target.value)}
                    className="input-base text-sm"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Firas (Sales)">Firas (Sales)</option>
                    <option value="JB (Operations)">JB (Operations)</option>
                    <option value="Abdul (Operations)">Abdul (Operations)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Staff Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional background notes, marital status appeals, or specific instructions..."
                  rows={3}
                  className="input-base text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving..." : editingClient ? "Update Client" : "Create Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
