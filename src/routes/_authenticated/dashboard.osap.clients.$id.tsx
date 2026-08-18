import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Users,
  Shield,
  FileText,
  Scan,
  History,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Download,
  Plus,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getOsapClientById,
  saveOsapClient,
  getOsapAudits,
  recordOsapAudit,
  getOsapActions,
  saveOsapAction,
  getOsapDocuments,
  saveOsapDocument,
  getOsapNotes,
  addOsapNote,
} from "@/lib/osap-db";
import { maskOan } from "@/lib/osap-crypto";
import { runClientAudit, type AuditScenario } from "@/lib/osap-audit-engine";
import { downloadStorageFile } from "@/lib/storage";
import type {
  OsapClient,
  OsapAudit,
  OsapActionItem,
  OsapDocument,
  OsapNote,
  OsapApplicationStatus,
} from "@/types/osap";
import {
  APPLICATION_STATUS_LABELS,
  DOCUMENT_STATUS_LABELS,
  MSFAA_STATUS_LABELS,
  PRIORITY_CONFIG,
  CREDENTIAL_STATUS_CONFIG,
  ACTION_STATUS_CONFIG,
  ACTION_SEVERITY_CONFIG,
} from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/clients/$id")({
  component: OsapClientProfilePage,
  ssr: false,
});

type TabType = "overview" | "affidavits" | "osap" | "documents" | "audits" | "notes" | "actions";

function OsapClientProfilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState<OsapClient | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);

  // Sub-data
  const [matchingAffidavits, setMatchingAffidavits] = useState<any[]>([]);
  const [audits, setAudits] = useState<OsapAudit[]>([]);
  const [actions, setActions] = useState<OsapActionItem[]>([]);
  const [documents, setDocuments] = useState<OsapDocument[]>([]);
  const [notes, setNotes] = useState<OsapNote[]>([]);

  // Audit Dialog state
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditScenario, setAuditScenario] = useState<AuditScenario>("approved");
  const [auditing, setAuditing] = useState(false);

  // New Note state
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // New Action state
  const [actionTitle, setActionTitle] = useState("");
  const [actionSeverity, setActionSeverity] = useState<any>("medium");
  const [addingAction, setAddingAction] = useState(false);

  useEffect(() => {
    loadClientData();
  }, [id]);

  const loadClientData = async () => {
    setLoading(true);
    try {
      const c = await getOsapClientById(id);
      if (!c) {
        toast.error("Client not found");
        navigate({ to: "/dashboard/osap/clients" });
        return;
      }
      setClient(c);

      // Load sub-collections in parallel
      const [auds, acts, docs, nts] = await Promise.all([
        getOsapAudits(c.id),
        getOsapActions(c.id),
        getOsapDocuments(c.id),
        getOsapNotes(c.id),
      ]);

      setAudits(auds);
      setActions(acts);
      setDocuments(docs);
      setNotes(nts);

      // Query matching affidavits by full_name or first/last
      try {
        const { data: affs } = await supabase
          .from("affidavits" as never)
          .select("*")
          .ilike("client_name", `%${c.full_name}%`);
        setMatchingAffidavits((affs as any[]) || []);
      } catch {
        /* ignore */
      }
    } catch {
      toast.error("Failed to load client profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    if (!client) return;
    setAuditing(true);
    try {
      const res = runClientAudit(client, auditScenario);

      // Save audit, changes, updated client & new actions
      await recordOsapAudit(res.audit);
      await saveOsapClient(res.client, client.user_id);
      for (const act of res.newActions) {
        await saveOsapAction(act);
      }
      for (const doc of res.updatedDocuments) {
        await saveOsapDocument(doc);
      }

      setClient(res.client);
      setAudits((prev) => [res.audit, ...prev]);
      if (res.newActions.length > 0) {
        setActions((prev) => [...res.newActions, ...prev]);
      }
      if (res.updatedDocuments.length > 0) {
        setDocuments(res.updatedDocuments);
      }

      toast.success(res.message);
      setAuditModalOpen(false);
    } catch (err) {
      toast.error("Audit execution failed");
    } finally {
      setAuditing(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !noteContent.trim()) return;
    setAddingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newNote: OsapNote = {
        id: crypto.randomUUID(),
        client_id: client.id,
        user_id: client.user_id,
        author_name: user?.email ? user.email.split("@")[0] : "Staff",
        content: noteContent.trim(),
        created_at: new Date().toISOString(),
      };
      await addOsapNote(newNote);
      setNotes((prev) => [newNote, ...prev]);
      setNoteContent("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !actionTitle.trim()) return;
    setAddingAction(true);
    try {
      const newAction: OsapActionItem = {
        id: crypto.randomUUID(),
        client_id: client.id,
        client_name: client.full_name,
        user_id: client.user_id,
        title: actionTitle.trim(),
        severity: actionSeverity,
        status: "open",
        created_at: new Date().toISOString(),
      };
      await saveOsapAction(newAction);
      setActions((prev) => [newAction, ...prev]);
      setActionTitle("");
      toast.success("Action item created");
    } catch {
      toast.error("Failed to create action");
    } finally {
      setAddingAction(false);
    }
  };

  const handleUpdateActionStatus = async (action: OsapActionItem, newStatus: any) => {
    const updated = { ...action, status: newStatus, resolved_at: newStatus === "completed" ? new Date().toISOString() : null };
    await saveOsapAction(updated);
    setActions((prev) => prev.map((a) => (a.id === action.id ? updated : a)));
    toast.success(`Action marked as ${newStatus.replace("_", " ")}`);
  };

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const appStatus = APPLICATION_STATUS_LABELS[client.application_status];
  const credStatus = CREDENTIAL_STATUS_CONFIG[client.credential_status];
  const priority = PRIORITY_CONFIG[client.priority];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Header */}
      <div>
        <button
          onClick={() => navigate({ to: "/dashboard/osap/clients" })}
          className="flex items-center gap-2 text-gold hover:text-gold-dark transition-smooth text-sm font-medium mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to OSAP Clients
        </button>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gold/15 border border-gold/30 rounded-xl flex items-center justify-center flex-shrink-0 text-gold font-serif font-bold text-2xl">
                {client.first_name[0]}{client.last_name[0] || ""}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-serif font-bold text-foreground">{client.full_name}</h1>
                  <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${appStatus.bg} ${appStatus.color} ${appStatus.border}`}>
                    {appStatus.label}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${priority.bg} ${priority.color}`}>
                    {priority.label} Priority
                  </span>
                  {client.batch_name && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-muted border border-border text-foreground font-medium">
                      📁 Batch: {client.batch_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                  <span>Batch: <strong className="text-gold font-mono">{client.batch_name || "General Batch"}</strong></span>
                  <span>OAN: <strong className="text-foreground font-mono">{maskOan(client.oan)}</strong></span>
                  <span>School: <strong className="text-foreground">{client.school || "—"}</strong></span>
                  <span>Program: <strong className="text-foreground">{client.program || "—"}</strong></span>
                  <span>Staff: <strong className="text-foreground">{client.assigned_staff || "Unassigned"}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setAuditModalOpen(true)}
                className="btn-primary flex items-center gap-2 text-sm shadow-md"
              >
                <Scan className="w-4 h-4" /> Run OSAP Audit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto text-sm font-medium">
        {[
          { id: "overview", label: "Overview", icon: Users },
          { id: "affidavits", label: `Affidavits (${matchingAffidavits.length})`, icon: FileText },
          { id: "osap", label: "OSAP Status", icon: Shield },
          { id: "documents", label: `Documents (${documents.length})`, icon: FileCheck },
          { id: "audits", label: `Audit History (${audits.length})`, icon: History },
          { id: "notes", label: `Notes (${notes.length})`, icon: MessageSquare },
          { id: "actions", label: `Actions (${actions.length})`, icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-smooth whitespace-nowrap ${
                isActive
                  ? "border-gold text-gold font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        {/* 1. OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground text-base border-b border-border pb-3">
              Basic Student Information
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Full Legal Name</span>
                <span className="font-medium text-foreground">{client.full_name}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Email Address</span>
                <span className="font-medium text-foreground">{client.email || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Phone Number</span>
                <span className="font-medium text-foreground">{client.phone || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Institution / School</span>
                <span className="font-medium text-foreground">{client.school || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Program of Study</span>
                <span className="font-medium text-foreground">{client.program || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Study Period / Term</span>
                <span className="font-medium text-foreground">{client.study_period || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Application Year</span>
                <span className="font-medium text-foreground">{client.application_year || "2026"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Assigned Case Staff</span>
                <span className="font-medium text-foreground">{client.assigned_staff || "Unassigned"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Credential Vault Status</span>
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${credStatus.bg} ${credStatus.color}`}>
                  <Shield className="w-3 h-3" /> {credStatus.label}
                </span>
              </div>
            </div>

            {client.notes && (
              <div className="mt-6 pt-6 border-t border-border">
                <span className="text-xs text-muted-foreground block mb-2 font-semibold">General Background Notes</span>
                <p className="text-sm text-foreground bg-muted/20 p-4 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. AFFIDAVITS TAB */}
        {activeTab === "affidavits" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-base">Affidavit Documents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Affidavits generated in the system for this student.
                </p>
              </div>
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="btn-primary flex items-center gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Generate Affidavit
              </button>
            </div>

            {matchingAffidavits.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-lg">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-foreground">No affidavits generated yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Create a marital status, OSAP separation, or proof of independence affidavit.
                </p>
                <button
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="btn-primary text-xs inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Affidavit
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {matchingAffidavits.map((aff) => (
                  <div key={aff.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center flex-shrink-0 text-gold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{aff.template_name || "Affidavit"}</h4>
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(aff.created_at).toLocaleDateString()} • Ref: {aff.matter_reference || "OSAP"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => aff.pdf_path && downloadStorageFile(aff.pdf_path, `${aff.client_name}.pdf`)}
                        disabled={!aff.pdf_path}
                        className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-smooth flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button
                        onClick={() => aff.docx_path && downloadStorageFile(aff.docx_path, `${aff.client_name}.docx`)}
                        disabled={!aff.docx_path}
                        className="px-3 py-1.5 text-xs border border-border text-foreground rounded hover:bg-muted transition-smooth flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> DOCX
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. OSAP DETAILS TAB */}
        {activeTab === "osap" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground text-base border-b border-border pb-3">
              OSAP Application Details & Funding Calculation
            </h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gold">Status Breakdown</div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Application Status:</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${appStatus.bg} ${appStatus.color}`}>
                    {appStatus.label}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Calculated Funding:</span>
                  <span className="font-semibold text-foreground">{client.funding_status || "Pending"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">MSFAA Loan Agreement:</span>
                  <span className="font-medium text-foreground">{client.msfaa_status.toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Document Status:</span>
                  <span className="font-medium text-foreground">{client.document_status.replace("_", " ").toUpperCase()}</span>
                </div>
              </div>

              <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-gold">Audit & Verification Times</div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Last Audit:</span>
                  <span className="font-medium text-foreground">
                    {client.last_audit_at ? new Date(client.last_audit_at).toLocaleString() : "Never"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Next Scheduled Audit:</span>
                  <span className="font-medium text-foreground">
                    {client.next_audit_at ? new Date(client.next_audit_at).toLocaleDateString() : "Automated Daily"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Action Required:</span>
                  <span className={`font-semibold ${client.action_required ? "text-rose-400" : "text-emerald-400"}`}>
                    {client.action_required ? "YES — " + (client.action_required_summary || "See Action Center") : "No action needed"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. DOCUMENTS TAB */}
        {activeTab === "documents" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground text-base">OSAP Document Requirements & Verification Matrix</h3>
            {documents.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Run an OSAP audit to synchronize and populate the student's document matrix.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {documents.map((doc) => {
                  const dStatus = DOCUMENT_STATUS_LABELS[doc.status];
                  return (
                    <div key={doc.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{doc.document_name}</h4>
                        <span className="text-xs text-muted-foreground">
                          {doc.submission_date ? `Submitted ${doc.submission_date}` : "Not yet submitted"}
                          {doc.rejection_reason && ` • Rejection Reason: ${doc.rejection_reason}`}
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${dStatus.bg} ${dStatus.color} ${dStatus.border}`}>
                        {dStatus.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. AUDITS TAB */}
        {activeTab === "audits" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground text-base">Complete OSAP Audit Trail</h3>
            {audits.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <p className="text-sm text-muted-foreground">No audits recorded for this student yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {audits.map((a) => (
                  <div key={a.id} className="p-4 bg-muted/20 border border-border rounded-lg space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        Audit • {new Date(a.created_at).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">By {a.conducted_by || "System"}</span>
                    </div>
                    <p className="text-muted-foreground text-xs">{a.summary}</p>
                    {a.changes_detected && a.changes_detected.length > 0 && (
                      <div className="p-2.5 bg-emerald-900/20 border border-emerald-800/40 rounded text-xs space-y-1">
                        <span className="font-semibold text-emerald-400 block">Changes Detected:</span>
                        {a.changes_detected.map((c) => (
                          <div key={c.id} className="text-emerald-300">
                            ✓ {c.field_name}: <span className="line-through opacity-70">{c.previous_value}</span> → <strong>{c.new_value}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. NOTES TAB */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground text-base">Staff Notes & Case Memo</h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Type a case note regarding this OSAP file..."
                rows={3}
                className="input-base text-sm"
              />
              <button
                type="submit"
                disabled={addingNote || !noteContent.trim()}
                className="btn-primary text-xs flex items-center gap-2"
              >
                {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Case Note
              </button>
            </form>

            <div className="space-y-3 pt-4 border-t border-border">
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No notes logged yet.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="p-3 bg-muted/20 border border-border rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">{n.author_name}</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 7. ACTIONS TAB */}
        {activeTab === "actions" && (
          <div className="space-y-6">
            <h3 className="font-semibold text-foreground text-base">Action Required Items</h3>
            <form onSubmit={handleAddAction} className="flex gap-3 items-center flex-wrap">
              <input
                type="text"
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                placeholder="New action item (e.g. Request marriage certificate from student)..."
                className="input-base text-sm flex-1 min-w-[240px]"
              />
              <select
                value={actionSeverity}
                onChange={(e) => setActionSeverity(e.target.value)}
                className="input-base text-sm w-36"
              >
                <option value="low">Low Severity</option>
                <option value="medium">Medium Severity</option>
                <option value="high">High Severity</option>
                <option value="critical">Critical Severity</option>
              </select>
              <button
                type="submit"
                disabled={addingAction || !actionTitle.trim()}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </form>

            <div className="space-y-3 pt-4 border-t border-border">
              {actions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No action items pending for this client.</p>
              ) : (
                actions.map((act) => {
                  const actStatus = ACTION_STATUS_CONFIG[act.status];
                  const actSev = ACTION_SEVERITY_CONFIG[act.severity];
                  return (
                    <div key={act.id} className="p-4 bg-muted/20 border border-border rounded-lg text-sm flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{act.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${actSev.bg} ${actSev.color}`}>
                            {actSev.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${actStatus.bg} ${actStatus.color}`}>
                            {actStatus.label}
                          </span>
                        </div>
                        {act.description && <p className="text-xs text-muted-foreground">{act.description}</p>}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <select
                          value={act.status}
                          onChange={(e) => handleUpdateActionStatus(act, e.target.value)}
                          className="input-base text-xs py-1 h-auto"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="waiting_on_client">Waiting on Client</option>
                          <option value="completed">Completed</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Audit Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl space-y-6 animate-fade-in">
            <div>
              <h3 className="text-lg font-serif font-bold text-foreground">Run OSAP Portal Audit</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Execute an automated simulation scenario or audit against current OSAP portal records for <strong>{client.full_name}</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-foreground">Select Simulation Scenario</label>
              <select
                value={auditScenario}
                onChange={(e) => setAuditScenario(e.target.value as AuditScenario)}
                className="input-base text-sm"
              >
                <option value="approved">Approved Application ($9,450 Calculated Funding)</option>
                <option value="processing">Processing / Under Assessment</option>
                <option value="rejected_documents">Rejected Documents (Needs Replacement Upload)</option>
                <option value="documents_under_review">Documents Under Review by FAO</option>
                <option value="msfaa_incomplete">MSFAA Incomplete (Loan Blocked)</option>
                <option value="denied">Application Denied (Eligibility Threshold)</option>
                <option value="mfa_required">MFA Challenge Paused (SMS Code Required)</option>
                <option value="portal_unavailable">Portal Unavailable / Timeout</option>
                <option value="manual_review">Manual Staff Review Required</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setAuditModalOpen(false)}
                className="btn-secondary text-sm"
                disabled={auditing}
              >
                Cancel
              </button>
              <button
                onClick={handleRunAudit}
                disabled={auditing}
                className="btn-primary text-sm flex items-center gap-2"
              >
                {auditing && <Loader2 className="w-4 h-4 animate-spin" />}
                {auditing ? "Connecting to Portal..." : "Execute Audit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
