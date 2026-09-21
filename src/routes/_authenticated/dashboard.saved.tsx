import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Building2,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
  Pencil,
  Eye,
  Printer,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Briefcase,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type Affidavit, safeFilename } from "@/types/neptora";
import type { BusinessFinancingApplication } from "@/types/financing";
import { downloadStorageFile, deleteAffidavitFiles } from "@/lib/storage";
import { financingStore } from "@/lib/financing-db";
import {
  generateAllLenderPdfsZip,
  generatePrintableQuickFloPdf,
  downloadPdfBlob,
} from "@/lib/lender-pdf-engine";
import { FinancingPdfPreviewModal } from "@/components/financing/financing-pdf-preview-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/dashboard/saved")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  component: SavedAffidavitsPage,
});

type TabType = "all" | "affidavits" | "financing";

function SavedAffidavitsPage() {
  const navigate = useNavigate();
  const searchParams = Route.useSearch();
  const [activeTab, setActiveTab] = useState<TabType>(
    searchParams.tab === "financing"
      ? "financing"
      : searchParams.tab === "affidavits"
      ? "affidavits"
      : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [affidavits, setAffidavits] = useState<Affidavit[]>([]);
  const [financingApps, setFinancingApps] = useState<BusinessFinancingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal preview state for financing application
  const [selectedFinancingApp, setSelectedFinancingApp] =
    useState<BusinessFinancingApplication | null>(null);
  const [downloadingZipId, setDownloadingZipId] = useState<string | null>(null);
  const [downloadingPrintableId, setDownloadingPrintableId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllDocuments();

    // Listen to real-time events across components and tabs
    const handleFinancingUpdate = () => {
      fetchFinancingApps();
    };

    const handleAffidavitsUpdate = () => {
      fetchAffidavitsOnly();
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === "quickflo_business_financing_apps_v1" ||
        e.key === "quickflo_financing_ping" ||
        e.key === "neptora_saved_affidavits_cache"
      ) {
        fetchAllDocuments();
      }
    };

    window.addEventListener("financing_storage_updated", handleFinancingUpdate);
    window.addEventListener("neptora_affidavits_updated", handleAffidavitsUpdate);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener("financing_storage_updated", handleFinancingUpdate);
      window.removeEventListener("neptora_affidavits_updated", handleAffidavitsUpdate);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const fetchFinancingApps = async () => {
    try {
      const apps = await financingStore.getApplications();
      setFinancingApps(apps);
    } catch (err) {
      console.warn("Could not load financing applications:", err);
    }
  };

  const fetchAffidavitsOnly = async () => {
    try {
      let dbList: Affidavit[] = [];
      try {
        const { data, error: err } = await supabase
          .from("affidavits" as never)
          .select("*")
          .neq("status", "archived")
          .order("created_at", { ascending: false });
        if (!err && data) dbList = data as unknown as Affidavit[];
      } catch (e) {
        console.warn("Could not load affidavits from database (using local cache):", e);
      }

      let localList: Affidavit[] = [];
      try {
        const raw = localStorage.getItem("neptora_saved_affidavits_cache");
        if (raw) localList = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      // Filter out auto-synced financing items from the pure affidavit list so they don't double render
      const map = new Map<string, Affidavit>();
      dbList.forEach((a) => {
        if (!a.id.startsWith("financing-")) map.set(a.id, a);
      });
      localList.forEach((a) => {
        if (!a.id.startsWith("financing-") && !map.has(a.id)) {
          map.set(a.id, a);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
      );
      setAffidavits(merged);
    } catch (err) {
      console.warn("Failed to load affidavits:", err);
    }
  };

  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([fetchAffidavitsOnly(), fetchFinancingApps()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAffidavit = async (a: Affidavit) => {
    if (!window.confirm(`Delete affidavit for "${a.client_name}" and its files?`)) return;
    try {
      await deleteAffidavitFiles([a.docx_path, a.pdf_path].filter(Boolean) as string[]);
      try {
        await supabase.from("affidavits" as never).delete().eq("id", a.id);
      } catch {
        /* ignore db error */
      }

      try {
        const raw = localStorage.getItem("neptora_saved_affidavits_cache");
        if (raw) {
          const list: Affidavit[] = JSON.parse(raw);
          localStorage.setItem(
            "neptora_saved_affidavits_cache",
            JSON.stringify(list.filter((x) => x.id !== a.id))
          );
        }
      } catch {
        /* ignore */
      }

      setAffidavits((prev) => prev.filter((x) => x.id !== a.id));
      toast.success("Affidavit deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleDeleteFinancingApp = async (app: BusinessFinancingApplication) => {
    if (
      !window.confirm(
        `Are you sure you want to delete application for "${
          app.business.legalName || "Untitled Application"
        }"?`
      )
    )
      return;
    try {
      await financingStore.deleteApplication(app.id);
      setFinancingApps((prev) => prev.filter((x) => x.id !== app.id));
      toast.success("Financing application deleted");
    } catch (err) {
      toast.error("Failed to delete financing application");
    }
  };

  const handleDownloadZip = async (app: BusinessFinancingApplication) => {
    try {
      setDownloadingZipId(app.id);
      const zipBytes = await generateAllLenderPdfsZip(app);
      const blob = new Blob([zipBytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = `${app.business.legalName || "Application"}_All_Lenders.zip`.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Application package downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate application package");
    } finally {
      setDownloadingZipId(null);
    }
  };

  const handleDownloadPrintable = async (app: BusinessFinancingApplication) => {
    try {
      setDownloadingPrintableId(app.id);
      const blob = await generatePrintableQuickFloPdf(app);
      const name = `${
        app.business.legalName || "Application"
      }_QuickFlo_Fillable_Application.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, name);
      toast.success("Downloaded fillable application PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingPrintableId(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return (
          <Badge className="bg-blue-600 text-white font-medium text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> Submitted
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-amber-600 text-white font-medium text-[11px] gap-1">
            <Clock className="w-3 h-3" /> Under Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-emerald-600 text-white font-medium text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </Badge>
        );
      case "fund_offer_sent":
        return (
          <Badge className="bg-purple-600 text-white font-medium text-[11px] gap-1">
            <Briefcase className="w-3 h-3" /> Offer Sent
          </Badge>
        );
      case "funded":
        return (
          <Badge className="bg-teal-600 text-white font-medium text-[11px] gap-1">
            <ShieldCheck className="w-3 h-3" /> Funded
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-border text-muted-foreground text-[11px]">
            {status}
          </Badge>
        );
    }
  };

  // Filtered lists
  const filteredAffidavits = useMemo(() => {
    if (!searchQuery.trim()) return affidavits;
    const q = searchQuery.toLowerCase();
    return affidavits.filter(
      (a) =>
        (a.client_name || "").toLowerCase().includes(q) ||
        (a.template_name || "").toLowerCase().includes(q) ||
        (a.matter_reference || "").toLowerCase().includes(q)
    );
  }, [affidavits, searchQuery]);

  const filteredFinancingApps = useMemo(() => {
    if (!searchQuery.trim()) return financingApps;
    const q = searchQuery.toLowerCase();
    return financingApps.filter(
      (app) =>
        (app.business.legalName || "").toLowerCase().includes(q) ||
        (app.business.dba || app.business.tradeName || "").toLowerCase().includes(q) ||
        (app.id || "").toLowerCase().includes(q) ||
        app.owners.some((o) => `${o.firstName} ${o.lastName}`.toLowerCase().includes(q))
    );
  }, [financingApps, searchQuery]);

  const totalDocuments = affidavits.length + financingApps.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-heading mb-1">Saved Affidavits & Applications</h1>
          <p className="text-muted-foreground text-sm">
            All your generated legal affidavits, notarized records, and submitted business financing applications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="btn-primary inline-flex items-center gap-2 text-xs shadow-sm py-2 px-3.5"
          >
            <FileText className="w-4 h-4" /> New Affidavit
          </Link>
          <Link
            to="/dashboard/financing/new"
            className="inline-flex items-center gap-2 text-xs font-semibold py-2 px-3.5 rounded-lg border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 bg-cyan-50/60 dark:bg-cyan-950/40 hover:bg-cyan-100/60 transition-smooth"
          >
            <Building2 className="w-4 h-4 text-cyan-600" /> New Financing App
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-border/80">
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60 self-start">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-smooth flex items-center gap-1.5 ${
              activeTab === "all"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>All Documents</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold">
              {totalDocuments}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("affidavits")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-smooth flex items-center gap-1.5 ${
              activeTab === "affidavits"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-gold" />
            <span>Legal Affidavits</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold">
              {affidavits.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("financing")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-smooth flex items-center gap-1.5 ${
              activeTab === "financing"
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-cyan-600" />
            <span>Business Financing</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-bold">
              {financingApps.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ref, or ID..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* ZERO STATE */}
      {totalDocuments === 0 ? (
        <div className="border border-border rounded-2xl p-12 text-center bg-card shadow-xs">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground text-lg mb-2">No Saved Documents Yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Generate your first legal affidavit or fill out a commercial business financing application to see it here.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2 text-xs">
              <FileText className="w-4 h-4" /> Create Affidavit
            </Link>
            <Link
              to="/dashboard/financing/new"
              className="inline-flex items-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 bg-cyan-50/60 dark:bg-cyan-950/40 hover:bg-cyan-100/60 transition-smooth"
            >
              <Building2 className="w-4 h-4 text-cyan-600" /> New Financing App
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: BUSINESS FINANCING APPLICATIONS */}
          {(activeTab === "all" || activeTab === "financing") && filteredFinancingApps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="w-4 h-4 text-cyan-600" />
                  <span>Submitted Business Financing Applications ({filteredFinancingApps.length})</span>
                </div>
                <Link
                  to="/dashboard/financing"
                  className="text-xs text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open Pipeline Overview</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid gap-3.5">
                {filteredFinancingApps.map((app) => {
                  const primaryOwner = app.owners[0];
                  const requestedFormatted = (
                    Number(app.financials.amountRequested) || 0
                  ).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

                  return (
                    <div
                      key={app.id}
                      className="border border-border/80 rounded-2xl p-5 hover:shadow-md transition-smooth bg-card group"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-foreground">
                                {app.business.legalName || "Untitled Application"}
                              </h3>
                              {app.business.dba && app.business.dba !== app.business.legalName && (
                                <span className="text-xs text-muted-foreground">
                                  (DBA: {app.business.dba})
                                </span>
                              )}
                              {getStatusBadge(app.status)}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                              <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                                {requestedFormatted} Requested
                              </span>
                              <span>•</span>
                              <span>
                                Principal: {primaryOwner ? `${primaryOwner.firstName} ${primaryOwner.lastName}` : "Applicant"}
                              </span>
                              <span>•</span>
                              <span>Ref: QF-{app.id.slice(0, 8).toUpperCase()}</span>
                              <span>•</span>
                              <span>
                                {new Date(app.createdAt || app.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-border/60 w-full lg:w-auto justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedFinancingApp(app)}
                            className="h-9 text-xs border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Preview PDFs
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPrintable(app)}
                            disabled={downloadingPrintableId === app.id}
                            className="h-9 text-xs font-semibold"
                          >
                            {downloadingPrintableId === app.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Printer className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                            )}
                            Printable PDF
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDownloadZip(app)}
                            disabled={downloadingZipId === app.id}
                            className="h-9 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
                          >
                            {downloadingZipId === app.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1" />
                            )}
                            Download ZIP
                          </Button>
                          <Link
                            to="/dashboard/financing/$id"
                            params={{ id: app.id }}
                            className="h-9 px-3 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted inline-flex items-center justify-center transition-smooth"
                          >
                            Details
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFinancingApp(app)}
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Application"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: LEGAL AFFIDAVITS */}
          {(activeTab === "all" || activeTab === "affidavits") && filteredAffidavits.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <FileText className="w-4 h-4 text-gold" />
                  <span>Legal Affidavits ({filteredAffidavits.length})</span>
                </div>
              </div>

              <div className="grid gap-3.5">
                {filteredAffidavits.map((a) => {
                  const base = safeFilename(a.client_name) || "affidavit";
                  const isExpanded = expandedIds.has(a.id);

                  return (
                    <div
                      key={a.id}
                      className="border border-border/80 rounded-2xl overflow-hidden hover:shadow-md transition-smooth bg-card"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpanded(a.id)}
                        className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/10 transition-smooth"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gold/10 border border-gold/20 rounded-xl flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-gold" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-foreground">{a.client_name}</h3>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 capitalize font-medium">
                                {a.status}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {a.template_name || "Custom Affidavit Template"}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
                              <span>Created: {new Date(a.created_at).toLocaleDateString()}</span>
                              {a.matter_reference && (
                                <>
                                  <span>•</span>
                                  <span>Ref: {a.matter_reference}</span>
                                </>
                              )}
                              <Link
                                to="/dashboard"
                                search={{ edit: a.id }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gold/15 text-gold hover:bg-gold/25 font-semibold transition-smooth ml-1"
                              >
                                <Pencil className="w-3 h-3" /> Edit
                              </Link>
                            </div>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-muted-foreground transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/80 p-5 bg-card/60 space-y-4 animate-fade-in">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-muted/20 border border-border/60 rounded-xl p-3.5">
                              <div className="text-xs text-muted-foreground font-medium mb-1">
                                Client Name
                              </div>
                              <div className="font-semibold text-foreground text-sm">
                                {a.client_name}
                              </div>
                            </div>
                            {a.matter_reference && (
                              <div className="bg-muted/20 border border-border/60 rounded-xl p-3.5">
                                <div className="text-xs text-muted-foreground font-medium mb-1">
                                  Matter Reference
                                </div>
                                <div className="font-semibold text-foreground text-sm">
                                  {a.matter_reference}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider mb-2">
                              Document Preview
                            </h4>
                            <pre className="bg-background border border-border/80 rounded-xl p-4 font-serif text-xs text-foreground whitespace-pre-wrap max-h-72 overflow-auto">
                              {a.generated_content}
                            </pre>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-border/60 flex-wrap items-center">
                            <Link
                              to="/dashboard"
                              search={{ edit: a.id }}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-gold/40 text-gold bg-gold/10 hover:bg-gold/20 rounded-lg text-xs font-semibold transition-smooth"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit & Regenerate
                            </Link>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                a.pdf_path
                                  ? downloadStorageFile(a.pdf_path, `${base}.pdf`)
                                  : toast.error("No PDF file stored for this record")
                              }
                              disabled={!a.pdf_path}
                              className="text-xs font-semibold h-9"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                a.docx_path
                                  ? downloadStorageFile(a.docx_path, `${base}.docx`)
                                  : toast.error("No DOCX file stored for this record")
                              }
                              disabled={!a.docx_path}
                              className="text-xs font-semibold h-9"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" /> Download DOCX
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAffidavit(a)}
                              className="text-xs text-destructive hover:bg-destructive/10 ml-auto h-9"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* EMPTY FILTER STATE */}
          {((activeTab === "affidavits" && filteredAffidavits.length === 0) ||
            (activeTab === "financing" && filteredFinancingApps.length === 0) ||
            (activeTab === "all" &&
              filteredAffidavits.length === 0 &&
              filteredFinancingApps.length === 0)) && (
            <div className="border border-border/80 rounded-2xl p-8 text-center bg-card">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h4 className="font-semibold text-foreground text-sm">No matching records found</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching for a different term or switch the category filter.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Multi-Lender PDF Preview Modal */}
      {selectedFinancingApp && (
        <FinancingPdfPreviewModal
          application={selectedFinancingApp}
          isOpen={Boolean(selectedFinancingApp)}
          onClose={() => setSelectedFinancingApp(null)}
        />
      )}
    </div>
  );
}
