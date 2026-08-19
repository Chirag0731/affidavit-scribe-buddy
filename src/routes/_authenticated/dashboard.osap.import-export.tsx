import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Download,
  Loader2,
  RefreshCw,
  X,
  Shield,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getOsapClients,
  bulkSaveOsapClients,
  getOsapImports,
  recordOsapImport,
} from "@/lib/osap-db";
import {
  parseExcelFile,
  analyzeImportRows,
  exportClientsToExcel,
  TARGET_COLUMNS,
  type ParsedSpreadsheet,
} from "@/lib/osap-excel";
import type { OsapClient, OsapImportRowConflict, OsapImportSummary } from "@/types/osap";

export const Route = createFileRoute("/_authenticated/dashboard/osap/import-export")({
  component: OsapImportExportPage,
  ssr: false,
});

type ImportStep = "upload" | "mapping" | "review" | "complete";

function OsapImportExportPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"import" | "export" | "history">("import");
  const [existingClients, setExistingClients] = useState<OsapClient[]>([]);
  const [importHistory, setImportHistory] = useState<OsapImportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Importer state
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [newRows, setNewRows] = useState<(Partial<OsapClient> & { rawPassword?: string })[]>([]);
  const [conflicts, setConflicts] = useState<OsapImportRowConflict[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<OsapImportSummary | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clients, history] = await Promise.all([
        getOsapClients(),
        getOsapImports(),
      ]);
      setExistingClients(clients);
      setImportHistory(history);
    } catch {
      toast.error("Failed to load import/export data");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseExcelFile(file);
      setParsedData(parsed);
      setColumnMapping(parsed.initialMapping);
      setStep("mapping");
      toast.success(`Loaded ${parsed.rows.length} rows from "${file.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    }
  };

  const handleProceedToReview = () => {
    if (!parsedData) return;
    const analysis = analyzeImportRows(parsedData.rows, columnMapping, existingClients);
    setNewRows(analysis.newRows);
    setConflicts(analysis.conflicts);
    setMissingCount(analysis.missingCount);
    setStep("review");
  };

  const handleConflictResolutionChange = (index: number, resolution: "keep_existing" | "update_existing" | "skip") => {
    setConflicts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, resolution } : c)),
    );
  };

  const handleBulkConflictResolution = (resolution: "keep_existing" | "update_existing" | "skip") => {
    setConflicts((prev) => prev.map((c) => ({ ...c, resolution })));
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;
    setImporting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare final client list
      const toInsert: (Partial<OsapClient> & { rawPassword?: string })[] = [...newRows];
      const toUpdate: (Partial<OsapClient> & { rawPassword?: string })[] = [];

      conflicts.forEach((c) => {
        if (c.resolution === "update_existing") {
          toUpdate.push({
            ...c.incoming,
            id: c.existing.id,
          });
        }
      });

      const allToProcess = [...toInsert, ...toUpdate];
      const result = await bulkSaveOsapClients(allToProcess, user.id);

      const summary: OsapImportSummary = {
        id: crypto.randomUUID(),
        file_name: parsedData.fileName,
        uploaded_by: user.email ? user.email.split("@")[0] : "Staff",
        total_records: parsedData.rows.length,
        new_clients: result.inserted,
        updated_clients: result.updated,
        duplicates: conflicts.length,
        errors: missingCount,
        status: missingCount > 0 ? "completed_with_errors" : "completed",
        created_at: new Date().toISOString(),
      };

      await recordOsapImport(summary);
      setImportSummary(summary);
      setImportHistory((prev) => [summary, ...prev]);
      setStep("complete");
      toast.success(`Import complete! (${result.inserted} added, ${result.updated} updated)`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setStep("upload");
    setParsedData(null);
    setColumnMapping({});
    setNewRows([]);
    setConflicts([]);
    setMissingCount(0);
    setImportSummary(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="section-heading">OSAP Import & Export Hub</h1>
        <p className="text-muted-foreground mt-1">
          Import client spreadsheets with smart column mapping, duplicate resolution, and encrypted credential migration.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto text-sm font-medium">
        {[
          { id: "import", label: "Import Excel Spreadsheet", icon: UploadCloud },
          { id: "export", label: "Export OSAP Data", icon: Download },
          { id: "history", label: `Import History (${importHistory.length})`, icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      {/* 1. IMPORT TAB */}
      {activeTab === "import" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-border hover:border-gold/60 rounded-xl p-12 text-center transition-smooth group cursor-pointer relative bg-muted/10">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <UploadCloud className="w-12 h-12 text-muted-foreground group-hover:text-gold mx-auto mb-4 transition-smooth" />
                <h3 className="font-bold text-foreground text-lg mb-1">
                  Click or drag Excel spreadsheet here
                </h3>
                <p className="text-xs text-muted-foreground">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV spreadsheets.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-gold/15 text-gold border border-gold/30 rounded-full text-xs font-medium">
                  <Shield className="w-3 h-3" /> Password columns will be auto-encrypted
                </div>
              </div>

              <div className="p-4 bg-muted/20 border border-border rounded-lg text-xs space-y-2 text-muted-foreground">
                <span className="font-semibold text-foreground block text-sm">Supported Columns</span>
                <p>
                  Full Name, First/Last Name, Email, Phone, OAN, OSAP Password, School, Program, Study Period, Year, Application Status, MSFAA Status, Document Status, Notes, Staff, Priority.
                </p>
                <p className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>The system automatically maps your headers and never requires all columns to be present.</span>
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === "mapping" && parsedData && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-foreground text-base">Map Spreadsheet Columns</h3>
                  <p className="text-xs text-muted-foreground">
                    File: <strong>{parsedData.fileName}</strong> ({parsedData.rows.length} rows detected)
                  </p>
                </div>
                <button onClick={resetImport} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel Upload
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {TARGET_COLUMNS.map((target) => (
                  <div key={target.key} className="p-3 bg-muted/20 border border-border rounded-lg space-y-1.5">
                    <label className="block text-xs font-semibold text-foreground">
                      {target.label} {target.required && "*"}
                    </label>
                    <select
                      value={columnMapping[target.key] || ""}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [target.key]: e.target.value,
                        }))
                      }
                      className="input-base text-xs"
                    >
                      <option value="">-- Do Not Map / Ignore --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          Column: {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={resetImport} className="btn-secondary text-sm">
                  Back
                </button>
                <button onClick={handleProceedToReview} className="btn-primary text-sm flex items-center gap-2">
                  Preview & Analyze Records <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & CONFLICT RESOLVER */}
          {step === "review" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-foreground text-base">Duplicate Analysis & Import Preview</h3>
                  <p className="text-xs text-muted-foreground">
                    New Clients: <strong className="text-emerald-400">{newRows.length}</strong> • Existing Matches: <strong className="text-amber-400">{conflicts.length}</strong> • Skipped/Empty: <strong>{missingCount}</strong>
                  </p>
                </div>

                {conflicts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkConflictResolution("update_existing")}
                      className="px-2.5 py-1 bg-amber-900/30 text-amber-400 border border-amber-800/40 hover:bg-amber-900/50 rounded text-xs font-medium transition-smooth"
                    >
                      Update All Matches
                    </button>
                    <button
                      onClick={() => handleBulkConflictResolution("skip")}
                      className="px-2.5 py-1 bg-muted hover:bg-muted/80 text-muted-foreground rounded text-xs font-medium transition-smooth"
                    >
                      Skip All Matches
                    </button>
                  </div>
                )}
              </div>

              {/* Conflicts List */}
              {conflicts.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                    Existing Clients Detected ({conflicts.length})
                  </span>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {conflicts.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-muted/20 border border-amber-500/30 rounded-lg text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-foreground text-sm">
                              {c.existing.full_name}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              (Matched by {c.incoming.oan && c.existing.oan === c.incoming.oan ? "OAN" : "Name / Email"})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-muted-foreground">Resolution:</label>
                            <select
                              value={c.resolution}
                              onChange={(e) =>
                                handleConflictResolutionChange(idx, e.target.value as any)
                              }
                              className="input-base text-xs py-1 h-auto"
                            >
                              <option value="update_existing">Update Existing Record</option>
                              <option value="keep_existing">Keep Existing (Ignore Incoming)</option>
                              <option value="skip">Skip Row</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 text-[11px] pt-1">
                          <div className="p-2 bg-card rounded border border-border">
                            <span className="text-muted-foreground font-semibold block mb-1">Current in Database:</span>
                            <div>School: {c.existing.school || "—"}</div>
                            <div>App Status: {c.existing.application_status}</div>
                            <div>Docs: {c.existing.document_status}</div>
                          </div>
                          <div className="p-2 bg-card rounded border border-border">
                            <span className="text-gold font-semibold block mb-1">Incoming Spreadsheet:</span>
                            <div>School: {c.incoming.school || "—"}</div>
                            <div>App Status: {c.incoming.application_status}</div>
                            <div>Docs: {c.incoming.document_status}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Clients Preview */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                  New Clients to Add ({newRows.length})
                </span>
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border text-xs">
                  {newRows.map((r, i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <span className="font-semibold text-foreground">{r.full_name}</span>
                      <span className="text-muted-foreground">{r.school || "No school"} • {r.application_year || "2026"}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button onClick={() => setStep("mapping")} className="btn-secondary text-sm" disabled={importing}>
                  Back to Mapping
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importing}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? "Importing & Encrypting..." : `Confirm & Import ${newRows.length + conflicts.filter((c) => c.resolution === "update_existing").length} Records`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETE */}
          {step === "complete" && importSummary && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
              <h3 className="font-serif font-bold text-2xl text-foreground">Import Successfully Completed</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Spreadsheet <strong>{importSummary.file_name}</strong> was imported. Client records and encrypted credentials have been saved.
              </p>

              <div className="p-4 bg-muted/20 border border-border rounded-lg max-w-md mx-auto text-xs grid grid-cols-2 gap-3 text-left">
                <div>New Clients Added: <strong className="text-emerald-400">{importSummary.new_clients}</strong></div>
                <div>Existing Records Updated: <strong className="text-amber-400">{importSummary.updated_clients}</strong></div>
                <div>Duplicate Conflicts: <strong>{importSummary.duplicates}</strong></div>
                <div>Skipped / Errors: <strong>{importSummary.errors}</strong></div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button onClick={() => navigate({ to: "/dashboard/osap/clients" })} className="btn-primary text-sm">
                  View Clients Table
                </button>
                <button onClick={resetImport} className="btn-secondary text-sm">
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. EXPORT TAB */}
      {activeTab === "export" && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-foreground text-base">Export OSAP Data to Excel</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate formatted Microsoft Excel spreadsheets with all client, application, and document details.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <button
              onClick={() => exportClientsToExcel(existingClients, "OSAP_All_Clients.xlsx")}
              className="p-5 bg-muted/20 border border-border hover:border-gold rounded-xl text-left transition-smooth space-y-2"
            >
              <FileSpreadsheet className="w-6 h-6 text-gold" />
              <h4 className="font-bold text-foreground text-sm">All OSAP Clients</h4>
              <p className="text-xs text-muted-foreground">Export all {existingClients.length} client files.</p>
            </button>

            <button
              onClick={() =>
                exportClientsToExcel(
                  existingClients.filter((c) => c.application_status === "approved"),
                  "OSAP_Approved_Clients.xlsx",
                )
              }
              className="p-5 bg-muted/20 border border-border hover:border-emerald-500 rounded-xl text-left transition-smooth space-y-2"
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <h4 className="font-bold text-foreground text-sm">Approved Applications</h4>
              <p className="text-xs text-muted-foreground">Export clients with finalized funding.</p>
            </button>

            <button
              onClick={() =>
                exportClientsToExcel(
                  existingClients.filter((c) => c.action_required),
                  "OSAP_Action_Required.xlsx",
                )
              }
              className="p-5 bg-muted/20 border border-border hover:border-rose-500 rounded-xl text-left transition-smooth space-y-2"
            >
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <h4 className="font-bold text-foreground text-sm">Action Required Queue</h4>
              <p className="text-xs text-muted-foreground">Export files with rejected docs or missing MSFAA.</p>
            </button>
          </div>
        </div>
      )}

      {/* 3. HISTORY TAB */}
      {activeTab === "history" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {importHistory.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="font-semibold text-foreground text-base">No Import History Yet</h3>
              <p className="text-xs text-muted-foreground mt-1">Upload a spreadsheet in the Import tab to begin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs uppercase text-muted-foreground tracking-wider font-semibold">
                  <tr>
                    <th className="p-4">File Name</th>
                    <th className="p-4">Uploaded By</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">New</th>
                    <th className="p-4">Updated</th>
                    <th className="p-4">Duplicates</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/20 transition-smooth">
                      <td className="p-4 font-semibold text-foreground">{h.file_name}</td>
                      <td className="p-4 text-xs text-muted-foreground">{h.uploaded_by}</td>
                      <td className="p-4 text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</td>
                      <td className="p-4 text-emerald-400 font-bold">{h.new_clients}</td>
                      <td className="p-4 text-amber-400 font-bold">{h.updated_clients}</td>
                      <td className="p-4 text-muted-foreground">{h.duplicates}</td>
                      <td className="p-4">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 font-medium">
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
