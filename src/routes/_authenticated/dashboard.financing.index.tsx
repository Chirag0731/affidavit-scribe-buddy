import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { BusinessFinancingApplication } from "@/types/financing";
import { financingStore } from "@/lib/financing-db";
import { FinancingLogo } from "@/components/financing/financing-logo";
import { FinancingPdfPreviewModal } from "@/components/financing/financing-pdf-preview-modal";
import { SendApplicationModal } from "@/components/financing/send-application-modal";
import { UploadQuickFloPdfModal } from "@/components/financing/upload-quickflo-pdf-modal";
import { generateAllLenderPdfsZip, downloadBlankQuickFloPdf } from "@/lib/lender-pdf-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Building2,
  DollarSign,
  Plus,
  Share2,
  FileCheck2,
  Eye,
  Download,
  Loader2,
  Trash2,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  Copy,
  Send,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/financing/")({
  component: FinancingOverviewPage,
  ssr: false,
});

function FinancingOverviewPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<BusinessFinancingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAppForPreview, setSelectedAppForPreview] = useState<BusinessFinancingApplication | null>(null);
  const [selectedAppForSend, setSelectedAppForSend] = useState<BusinessFinancingApplication | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingBlank, setDownloadingBlank] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    loadApplications();

    const handleUpdate = () => {
      loadApplications();
    };

    window.addEventListener("financing_storage_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("financing_storage_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const apps = await financingStore.getApplications();
      setApplications(apps);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyClientLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard.writeText(url);
    toast.success("Client Application Link copied to clipboard!", {
      description: "Send this white-labeled link to prospective business clients.",
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete application for "${name}"?`)) return;
    try {
      await financingStore.deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast.success("Application deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete application");
    }
  };

  const handleDownloadZip = async (app: BusinessFinancingApplication) => {
    try {
      const zipBytes = await generateAllLenderPdfsZip(app);
      const blob = new Blob([zipBytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = `${app.business.legalName || "Application"}_All_Lenders.zip`.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Application PDF Package downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate zip");
    }
  };

  const handleDownloadBlank = async () => {
    try {
      setDownloadingBlank(true);
      await downloadBlankQuickFloPdf();
      toast.success("Downloaded blank fillable QuickFlo PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download blank PDF");
    } finally {
      setDownloadingBlank(false);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = applications.length;
    const totalVolume = applications.reduce((sum, a) => sum + (Number(a.financials.amountRequested) || 0), 0);
    const avgVolume = total > 0 ? totalVolume / total : 0;
    const submittedCount = applications.filter((a) => a.status !== "draft").length;
    return { total, totalVolume, avgVolume, submittedCount };
  }, [applications]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        searchTerm === "" ||
        (app.business.legalName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.business.tradeName || app.business.dba || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.business.city || (typeof app.business.physicalAddress === "object" ? app.business.physicalAddress?.city : "") || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.owners.some((o) => `${o.firstName} ${o.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-blue-600 text-white font-medium text-[11px]">Submitted</Badge>;
      case "under_review":
        return <Badge className="bg-amber-600 text-white font-medium text-[11px]">Under Review</Badge>;
      case "approved":
        return <Badge className="bg-emerald-600 text-white font-medium text-[11px]">Approved</Badge>;
      case "funded":
        return <Badge className="bg-purple-600 text-white font-medium text-[11px]">Funded</Badge>;
      case "declined":
        return <Badge variant="destructive" className="font-medium text-[11px]">Declined</Badge>;
      default:
        return <Badge variant="secondary" className="font-medium text-[11px]">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Top Banner & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Business Financing Pipeline
            </h1>
            <Badge variant="outline" className="text-cyan-700 dark:text-cyan-400 border-cyan-400 font-semibold text-[10px]">
              White-Label Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collect funding applications digitally and automatically generate lender-ready PDFs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyClientLink}
            className="text-xs h-9 border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-semibold"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Share Client App Link
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="text-xs h-9 font-semibold border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
          >
            <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
            Import Filled PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadBlank}
            disabled={downloadingBlank}
            className="text-xs h-9 font-medium border-border shadow-xs"
          >
            {downloadingBlank ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
            )}
            Blank Fillable PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="text-xs h-9"
          >
            <Link to="/dashboard/financing/lenders">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Lender Templates
            </Link>
          </Button>

          <Button
            type="button"
            size="sm"
            asChild
            className="text-xs h-9 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
          >
            <Link to="/dashboard/financing/new">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Application
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Applications</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{metrics.total}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{metrics.submittedCount} underwritten</p>
            </div>
            <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Requested Volume</p>
              <h3 className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 mt-1">{formatCurrency(metrics.totalVolume)}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across all applicants</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Average Deal Size</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{formatCurrency(metrics.avgVolume)}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Avg requested funding</p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Connected Lenders</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">2 Lenders</h3>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Business Fin. + CanaCap</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Briefcase className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="rounded-2xl border-border/70 shadow-xs bg-card">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search by legal name, DBA, city, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-9 border-none bg-muted/40 focus-visible:ring-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "All" },
                { id: "submitted", label: "Submitted" },
                { id: "under_review", label: "In Review" },
                { id: "approved", label: "Approved" },
                { id: "funded", label: "Funded" },
                { id: "draft", label: "Draft" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === s.id
                      ? "bg-cyan-700 text-white shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="rounded-2xl border-border/70 shadow-xs bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs font-bold">Business Name</TableHead>
                <TableHead className="text-xs font-bold">Primary Principal</TableHead>
                <TableHead className="text-xs font-bold">Requested Capital</TableHead>
                <TableHead className="text-xs font-bold">Annual Gross</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold">Submitted</TableHead>
                <TableHead className="text-xs font-bold text-right">Lender Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    Loading applications...
                  </TableCell>
                </TableRow>
              ) : filteredApps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground">
                    No business financing applications match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredApps.map((app) => {
                  const primaryOwner = app.owners.find((o) => o.isPrimary) || app.owners[0];
                  return (
                    <TableRow key={app.id} className="hover:bg-muted/20 text-xs">
                      <TableCell>
                        <Link
                          to="/dashboard/financing/$id"
                          params={{ id: app.id }}
                          className="font-bold text-foreground hover:text-cyan-600 block text-sm"
                        >
                          {app.business.legalName}
                        </Link>
                        <span className="text-[11px] text-muted-foreground">
                          {app.business.tradeName || "—"} • {app.business.city}, {app.business.province}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="font-semibold text-foreground">
                          {primaryOwner ? `${primaryOwner.firstName} ${primaryOwner.lastName}` : "—"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {primaryOwner?.mobilePhone || primaryOwner?.email || "—"}
                        </span>
                      </TableCell>

                      <TableCell className="font-bold text-cyan-700 dark:text-cyan-400 text-sm">
                        {formatCurrency(app.financials.amountRequested || 0)}
                      </TableCell>

                      <TableCell className="font-semibold text-foreground">
                        {formatCurrency(app.financials.annualGrossRevenue || 0)}
                      </TableCell>

                      <TableCell>{getStatusBadge(app.status)}</TableCell>

                      <TableCell className="text-muted-foreground">
                        {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAppForSend(app)}
                            title="Send Application to Client"
                            className="h-8 px-2 text-xs text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Send
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAppForPreview(app);
                              setPreviewOpen(true);
                            }}
                            title="Preview Lender PDFs"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Preview
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadZip(app)}
                            title="Download ZIP"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 px-2.5 text-xs font-semibold"
                          >
                            <Link to="/dashboard/financing/$id" params={{ id: app.id }}>
                              Details
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(app.id, app.business.legalName)}
                            title="Delete Application"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* PDF Preview Modal */}
      {selectedAppForPreview && (
        <FinancingPdfPreviewModal
          application={selectedAppForPreview}
          isOpen={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setSelectedAppForPreview(null);
          }}
        />
      )}

      {/* Send Application Modal */}
      <SendApplicationModal
        application={selectedAppForSend}
        open={Boolean(selectedAppForSend)}
        onOpenChange={(open) => !open && setSelectedAppForSend(null)}
      />

      {/* Upload QuickFlo PDF & Multi-Lender Converter Modal */}
      <UploadQuickFloPdfModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onApplicationImported={() => {
          loadApplications();
        }}
      />
    </div>
  );
}
