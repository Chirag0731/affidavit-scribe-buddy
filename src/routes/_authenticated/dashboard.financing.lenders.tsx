import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  DollarSign,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Download,
  Plus,
  ShieldCheck,
  FileText,
  Sliders,
  Sparkles,
} from "lucide-react";
import { downloadPdfBlob, downloadBlankQuickFloPdf } from "@/lib/lender-pdf-engine";
import { WHITE_LABEL_PDF_BASE64, CANACAP_PDF_BASE64 } from "@/assets/lenders/lender-templates-asset";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/financing/lenders")({
  component: FinancingLendersPage,
  ssr: false,
});

function FinancingLendersPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadQuickFloBlank = async () => {
    try {
      setDownloading("quickflo");
      await downloadBlankQuickFloPdf();
      toast.success("Downloaded blank fillable QuickFlo Commercial Application");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download QuickFlo application");
    } finally {
      setDownloading(null);
    }
  };

  const downloadBlankTemplate = (type: "white-label" | "canacap") => {
    try {
      setDownloading(type);
      const b64 = type === "white-label" ? WHITE_LABEL_PDF_BASE64 : CANACAP_PDF_BASE64;
      const cleanB64 = b64.replace(/^data:application\/pdf;base64,/, "");
      const binary = atob(cleanB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const filename = type === "white-label" ? "Blank_Business_Financing_Template.pdf" : "Blank_CanaCap_Template.pdf";
      downloadPdfBlob(bytes, filename);
      toast.success(`Downloaded blank ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download template");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Top Header */}
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Lender Templates Registry
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modular coordinate-based PDF generation engines connected to QuickFlo Financial
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 font-semibold py-1">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
          3 Active Integrated Formats
        </Badge>
      </div>

      {/* Lender Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {/* Template 0: QuickFlo Master Fillable */}
        <Card className="flex flex-col h-full rounded-2xl border-cyan-500/50 shadow-xs bg-card overflow-hidden ring-1 ring-cyan-500/20">
          <CardHeader className="bg-gradient-to-r from-cyan-950/30 via-cyan-900/10 to-transparent p-5 min-h-[96px] flex flex-row items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-bold leading-snug">QuickFlo Commercial Application</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate mt-0.5">Interactive fillable AcroForm with live sync</CardDescription>
              </div>
            </div>
            <Badge className="bg-cyan-600 text-white text-[10px] shrink-0 whitespace-nowrap">Master Fillable</Badge>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Document Type:</span>
                <span className="font-semibold text-foreground">AcroForm Letter (612 × 792 pt)</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Form Engine:</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">100% Typeable & Fillable</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Signer Fields:</span>
                <span className="font-semibold text-foreground">Type or Sign E-Signature Box</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Sections Included:</span>
                <span className="font-semibold text-foreground">Business, 2 Principals, Debt</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground leading-relaxed min-h-[72px] flex items-center">
              Clean, professional application clients can complete in Adobe Acrobat, Chrome, Preview, or print out. Direct reference barcode and URL link back to your dashboard.
            </div>

            <div className="pt-2 mt-auto">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={downloadQuickFloBlank}
                disabled={downloading === "quickflo"}
                className="w-full h-8 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {downloading === "quickflo" ? "Generating..." : "Download Blank Fillable PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lender 1: Business Financing Application */}
        <Card className="flex flex-col h-full rounded-2xl border-cyan-800/40 shadow-xs bg-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-cyan-950/20 to-transparent p-5 min-h-[96px] flex flex-row items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
              <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-600 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-bold leading-snug">1. Business Financing</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate mt-0.5">Journey Capital standard format (EN)</CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-[10px] shrink-0 whitespace-nowrap">Active</Badge>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Document Type:</span>
                <span className="font-semibold text-foreground">Standard 1-Page Letter (612 × 792 pt)</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Mapped Field Coordinates:</span>
                <span className="font-semibold text-cyan-600">34 Precision Target Anchors</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Digital Signature Line:</span>
                <span className="font-semibold text-foreground">X: 110, Y: 180 (Width: 160)</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Primary Focus:</span>
                <span className="font-semibold text-foreground">Revenue, Ownership, Funding Need</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground leading-relaxed min-h-[72px] flex items-center">
              Populates corporate identity, monthly and annual turnover, loan request details, 2 principal owners, and embeds legal E-SIGN authorization on line.
            </div>

            <div className="pt-2 mt-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadBlankTemplate("white-label")}
                disabled={downloading === "white-label"}
                className="w-full h-8 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Blank Original PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lender 2: CanaCap Business Information */}
        <Card className="flex flex-col h-full rounded-2xl border-purple-800/40 shadow-xs bg-card overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-950/20 to-transparent p-5 min-h-[96px] flex flex-row items-center justify-between border-b border-border/60">
            <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
              <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-base font-bold leading-snug">2. CanaCap Business Information</CardTitle>
                <CardDescription className="text-xs text-muted-foreground truncate mt-0.5">Merchant processing & trade reference format</CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-[10px] shrink-0 whitespace-nowrap">Active</Badge>
          </CardHeader>
          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Document Type:</span>
                <span className="font-semibold text-foreground">Standard 1-Page Letter (612 × 792 pt)</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Mapped Field Coordinates:</span>
                <span className="font-semibold text-purple-600">42 Precision Target Anchors</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Circled Option Engine:</span>
                <span className="font-semibold text-foreground">Red Oval Selection Marks</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span className="text-muted-foreground">Trade Reference Lines:</span>
                <span className="font-semibold text-foreground">2 Wholesale Suppliers Mapped</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-[11px] text-muted-foreground leading-relaxed min-h-[72px] flex items-center">
              Populates corporate identity, payment processor details, card volume, seasonal highs/lows, trade references, and circles entity & card choices with authentic pen-mark styling.
            </div>

            <div className="pt-2 mt-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadBlankTemplate("canacap")}
                disabled={downloading === "canacap"}
                className="w-full h-8 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Blank Original PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Extensibility Architecture Card */}
      <Card className="rounded-2xl border-dashed border-2 border-border/80 shadow-xs bg-muted/10 p-6 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-600/10 text-cyan-600 flex items-center justify-center">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Modular Architecture Ready for More Lenders</h3>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          Need to connect Lender C, Lender D, or a new equipment leasing funder? The normalized data model in <code className="text-foreground font-mono">src/types/financing.ts</code> feeds any new PDF coordinate map without changing client inputs.
        </p>
      </Card>
    </div>
  );
}
