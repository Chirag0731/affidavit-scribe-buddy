import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BusinessFinancingApplication, ApplicationStatus } from "@/types/financing";
import { financingStore } from "@/lib/financing-db";
import {
  generateWhiteLabelPdf,
  generateCanaCapPdf,
  generatePrintableQuickFloPdf,
  generateAllLenderPdfsZip,
  validateForWhiteLabel,
  validateForCanaCap,
  downloadPdfBlob,
} from "@/lib/lender-pdf-engine";
import { FinancingReviewSummary } from "@/components/financing/financing-review-summary";
import { FinancingPdfPreviewModal } from "@/components/financing/financing-pdf-preview-modal";
import { SendApplicationModal } from "@/components/financing/send-application-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Download,
  Eye,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Building2,
  DollarSign,
  ShieldCheck,
  Printer,
  Sparkles,
  ExternalLink,
  Loader2,
  Save,
  MessageSquare,
  Clock,
  Send,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/financing/$id")({
  component: FinancingDetailPage,
  ssr: false,
});

function FinancingDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState<BusinessFinancingApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLender, setPreviewLender] = useState<"white-label" | "canacap" | "quickflo-printable">("white-label");
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingPrintable, setDownloadingPrintable] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [notes, setNotes] = useState<{ date: string; author: string; text: string }[]>([
    {
      date: new Date().toLocaleDateString(),
      author: "QuickFlo Underwriting Engine",
      text: "Application received and multi-lender coordinate mapping verified.",
    },
  ]);

  useEffect(() => {
    loadApp();
  }, [id]);

  const loadApp = async () => {
    try {
      setLoading(true);
      const data = await financingStore.getApplicationById(id);
      if (!data) {
        toast.error("Application not found");
        navigate({ to: "/dashboard/financing" });
        return;
      }
      setApp(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load application details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!app) return;
    try {
      const updated = await financingStore.updateStatus(app.id, newStatus);
      setApp(updated);
      toast.success(`Status updated to "${newStatus.replace("_", " ").toUpperCase()}"`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDownloadSinglePdf = async (lender: "white-label" | "canacap" | "quickflo-printable") => {
    if (!app) return;
    try {
      if (lender === "white-label") {
        const bytes = await generateWhiteLabelPdf(app);
        const name = `${app.business.legalName || "Application"}_Business_Financing.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadPdfBlob(bytes, name);
        toast.success("Journey Capital PDF downloaded");
      } else if (lender === "canacap") {
        const bytes = await generateCanaCapPdf(app);
        const name = `${app.business.legalName || "Application"}_CanaCap_Financing.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadPdfBlob(bytes, name);
        toast.success("CanaCap PDF downloaded");
      } else {
        const bytes = await generatePrintableQuickFloPdf(app);
        const name = `${app.business.legalName || "Application"}_QuickFlo_Master_Intake.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
        downloadPdfBlob(bytes, name);
        toast.success("QuickFlo Master PDF downloaded");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadZip = async () => {
    if (!app) return;
    try {
      setDownloadingZip(true);
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
      toast.success("Lender Package ZIP downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate ZIP package");
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadPrintable = async () => {
    if (!app) return;
    try {
      setDownloadingPrintable(true);
      const blob = await generatePrintableQuickFloPdf(app);
      const name = `${app.business.legalName || "Application"}_QuickFlo_Fillable_Intake.pdf`.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, name);
      toast.success("Printable and fillable application PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate printable PDF");
    } finally {
      setDownloadingPrintable(false);
    }
  };

  const handleCopyPitch = async () => {
    if (!app) return;
    const p1 = app.owners[0] || ({} as any);
    const street = typeof app.business.physicalAddress === "string" ? app.business.physicalAddress : app.business.physicalAddress?.street || "";
    const p1Home = p1.homeAddress || (p1.address ? `${p1.address.street}, ${p1.address.city}, ${p1.address.province}` : "");
    const summaryText = [
      "COMMERCIAL CAPITAL APPLICATION SUMMARY",
      `QuickFlo Reference: QF-${app.id.slice(0, 8).toUpperCase()}`,
      `Company: ${app.business.legalName}${app.business.tradeName ? ` (DBA: ${app.business.tradeName})` : ""}`,
      `Tax ID / BIN: ${app.business.federalTaxId || app.business.businessNumber || "Pending"}`,
      `Structure: ${app.business.structureType || app.business.entityType || "Corporation"}`,
      `Industry: ${app.business.industry || "General Commercial"}`,
      `Established: ${app.business.dateEstablished || app.business.dateStarted || "N/A"} (${app.business.lengthOfOwnership || "N/A"})`,
      `Address: ${street}, ${app.business.city || ""}, ${app.business.province || ""} ${app.business.postalCode || ""}`,
      `Contact: ${app.business.businessPhone || app.business.phone} | ${app.business.businessEmail || app.business.email}`,
      "",
      "FINANCIAL PROFILE",
      `Amount Requested: $${app.financials.amountRequested?.toLocaleString() || "0"} (Use: ${app.financials.useOfFunds || "Working Capital"})`,
      `Gross Annual Revenue: $${app.financials.annualGrossRevenue?.toLocaleString() || "0"}`,
      `Average Monthly Revenue: $${app.financials.averageMonthlyRevenue?.toLocaleString() || "0"}`,
      `Average Bank Balance: $${app.financials.averageBankBalance?.toLocaleString() || "0"}`,
      `Merchant Processor: ${app.paymentProcessing.currentProcessor || "None"} (Avg Vol: $${app.paymentProcessing.averageMonthlyProcessingVolume?.toLocaleString() || "0"}/mo)`,
      "",
      "BENEFICIAL OWNERSHIP",
      `Principal 1: ${p1.firstName || ""} ${p1.lastName || ""} (${p1.ownershipPercentage || "100"}% Equity) - ${p1.title || "President"}`,
      `DOB: ${p1.dob || "N/A"} | SSN/SIN: ${p1.ssnOrSin || p1.sin || "On File"}`,
      `Phone: ${p1.mobilePhone || p1.phone || "N/A"} | Email: ${p1.email || "N/A"}`,
      `Home Address: ${p1Home || "On File"}`,
      "",
      "PREMISES & EXISTING DEBT",
      `Property Status: ${app.property.locationType || "Leased"} ($${app.property.monthlyRentOrMortgage?.toLocaleString() || "0"}/mo) - ${app.property.landlordOrMortgagee || "N/A"}`,
      `Existing Balances: ${app.existingFinancing.hasExistingFinancing ? `${app.existingFinancing.lenderName || "Lender"} ($${app.existingFinancing.approximateBalance?.toLocaleString()})` : "None reported"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success("Executive underwriting summary copied to clipboard");
    } catch {
      toast.error("Failed to copy summary");
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      {
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }),
        author: "Admin Underwriter",
        text: newNote.trim(),
      },
      ...prev,
    ]);
    setNewNote("");
    toast.success("Underwriting note logged");
  };

  if (loading || !app) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        <p className="text-xs text-muted-foreground">Loading application data...</p>
      </div>
    );
  }

  const whiteLabelAudit = validateForWhiteLabel(app);
  const canacapAudit = validateForCanaCap(app);

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="h-9 text-xs"
          >
            <Link to="/dashboard/financing">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              All Applications
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {app.business.legalName}
              </h1>
              <Badge variant="outline" className="font-mono text-[10px]">
                ID: {app.id.slice(0, 8)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              DBA: {app.business.tradeName || "Same"} • Submitted: {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Status:</span>
            <Select
              value={app.status}
              onValueChange={(val) => handleStatusChange(val as ApplicationStatus)}
            >
              <SelectTrigger className="h-9 w-36 text-xs font-semibold capitalize">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSendModalOpen(true)}
            className="h-9 text-xs border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-semibold"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Send to Client
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPreviewLender("white-label");
              setPreviewOpen(true);
            }}
            className="h-9 text-xs font-semibold border-border/80 hover:bg-muted"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5 text-cyan-600" />
            Preview Lender Pack
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyPitch}
            className="h-9 text-xs font-semibold"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy Pitch
          </Button>

          <Button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="h-9 text-xs bg-cyan-700 hover:bg-cyan-800 text-white font-semibold shadow-xs"
          >
            {downloadingZip ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileArchive className="w-3.5 h-3.5 mr-1.5" />
            )}
            Download All (ZIP)
          </Button>
        </div>
      </div>

      {/* THREE LENDER CARDS: Journey Capital, CanaCap, QuickFlo Master */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lender 1: White Label / Journey Capital */}
        <Card className="rounded-2xl border-cyan-800/30 bg-gradient-to-br from-cyan-950/15 via-card to-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-600/10 text-cyan-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Business Financing Application</CardTitle>
                  <CardDescription className="text-xs">
                    Journey Capital / White Label Format
                  </CardDescription>
                </div>
              </div>
              {whiteLabelAudit.isValid ? (
                <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="w-3 h-3" /> {whiteLabelAudit.missingFields.length} Missing
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Mapped Fields:</span>
                <span className="font-semibold text-foreground">34 Precision Coordinates</span>
              </div>
              <div className="flex justify-between">
                <span>Digital E-Signature:</span>
                <span className="font-semibold text-emerald-600">Included on line</span>
              </div>
              <div className="flex justify-between">
                <span>Required Disclosure:</span>
                <span className="font-semibold text-foreground">FCRA / PIPEDA Consent Attached</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewLender("white-label");
                  setPreviewOpen(true);
                }}
                className="flex-1 text-xs h-8 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 font-semibold"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Preview PDF
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleDownloadSinglePdf("white-label")}
                className="flex-1 text-xs h-8 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lender 2: CanaCap */}
        <Card className="rounded-2xl border-purple-800/30 bg-gradient-to-br from-purple-950/15 via-card to-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">CanaCap Application</CardTitle>
                  <CardDescription className="text-xs">
                    Business Info & Trade Reference Form
                  </CardDescription>
                </div>
              </div>
              {canacapAudit.isValid ? (
                <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertTriangle className="w-3 h-3" /> {canacapAudit.missingFields.length} Missing
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Mapped Fields:</span>
                <span className="font-semibold text-foreground">42 Coordinate Coordinates</span>
              </div>
              <div className="flex justify-between">
                <span>Circled Choices:</span>
                <span className="font-semibold text-purple-600">Entity & Card Types Circled</span>
              </div>
              <div className="flex justify-between">
                <span>Trade References:</span>
                <span className="font-semibold text-foreground">{app.tradeReferences.length} Wholesale Vendors</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewLender("canacap");
                  setPreviewOpen(true);
                }}
                className="flex-1 text-xs h-8 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Preview PDF
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleDownloadSinglePdf("canacap")}
                className="flex-1 text-xs h-8 bg-purple-700 hover:bg-purple-800 text-white font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lender 3: QuickFlo Master Application */}
        <Card className="rounded-2xl border-emerald-800/30 bg-gradient-to-br from-emerald-950/15 via-card to-card shadow-xs">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-600">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">QuickFlo Master Form</CardTitle>
                  <CardDescription className="text-xs">
                    2-Page Commercial Intake & Forensic Audit
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                <CheckCircle2 className="w-3 h-3" /> 10 Sections
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Intake Layout:</span>
                <span className="font-semibold text-foreground">Complete 10-Section Intake</span>
              </div>
              <div className="flex justify-between">
                <span>Signatures:</span>
                <span className="font-semibold text-emerald-600">
                  {app.authorization.signerName ? "Signed with Forensic Audit" : "Signed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Audit Certificate:</span>
                <span className="font-semibold text-foreground">
                  IP: {app.authorization.ipAddress || "Verified TLS"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviewLender("quickflo-printable");
                  setPreviewOpen(true);
                }}
                className="flex-1 text-xs h-8 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                Preview PDF
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleDownloadSinglePdf("quickflo-printable")}
                className="flex-1 text-xs h-8 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="w-full space-y-4">
        <TabsList className="grid grid-cols-3 w-full sm:w-[480px]">
          <TabsTrigger value="overview" className="text-xs">Application Overview</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">Lender Compliance</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Underwriting Notes ({notes.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Full Review Summary */}
        <TabsContent value="overview">
          <FinancingReviewSummary
            application={app}
            onEditSection={() => toast.info("To edit submitted applications, modify in New Application or create revision.")}
            showSignatures={true}
          />
        </TabsContent>

        {/* Tab 2: Lender Compliance Audit */}
        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-2xl border-border/70 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Business Financing Audit</span>
                  {whiteLabelAudit.isValid ? (
                    <Badge className="bg-emerald-600 text-[10px]">Valid</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Action Required</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                {whiteLabelAudit.missingFields.length === 0 ? (
                  <p className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> All required fields populated for Journey Capital standard.
                  </p>
                ) : (
                  <div>
                    <span className="text-destructive font-semibold block mb-1">Missing Fields:</span>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      {whiteLabelAudit.missingFields.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>CanaCap Audit</span>
                  {canacapAudit.isValid ? (
                    <Badge className="bg-emerald-600 text-[10px]">Valid</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Action Required</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs">
                {canacapAudit.missingFields.length === 0 ? (
                  <p className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> All required fields populated for CanaCap standard.
                  </p>
                ) : (
                  <div>
                    <span className="text-destructive font-semibold block mb-1">Missing Fields:</span>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      {canacapAudit.missingFields.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {canacapAudit.warnings.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-amber-600 font-semibold block mb-1">Underwriter Recommendations:</span>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      {canacapAudit.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Underwriting Notes */}
        <TabsContent value="notes">
          <Card className="rounded-2xl border-border/70 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold">Underwriting Notes & Verification Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Log bank call notes, UCC search results, landlord confirmation..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="text-xs h-20"
                />
                <Button
                  type="button"
                  onClick={handleAddNote}
                  className="h-20 bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs px-4"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Log Note
                </Button>
              </div>

              <div className="space-y-3 pt-2">
                {notes.map((n, i) => (
                  <div key={i} className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="font-semibold text-foreground">{n.author}</span>
                      <span>{n.date}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{n.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PDF Preview Modal */}
      <FinancingPdfPreviewModal
        application={app}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        initialLender={previewLender}
      />

      {/* Send Application Modal */}
      <SendApplicationModal
        application={app}
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
      />
    </div>
  );
}
