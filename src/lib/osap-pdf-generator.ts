import { PDFDocument, StandardFonts, rgb, PDFPage } from "pdf-lib";
import type { OsapAudit, OsapClient } from "@/types/osap";
import { maskOan } from "./osap-crypto";
import { APPLICATION_STATUS_LABELS } from "@/types/osap";

export interface BatchAuditItemSummary {
  client: OsapClient;
  status: string;
  message: string;
  previousStatus?: string;
  newStatus?: string;
  pendingItems?: string[];
  msfaaStatus: string;
  notes?: string;
}

export interface OsapBatchSessionReport {
  id: string;
  title: string;
  batchName: string;
  scenario: string;
  conductedBy: string;
  createdAt: string;
  totalAudited: number;
  updatedCount: number;
  pendingMsfaaCount: number;
  holdCount: number;
  fundedCount: number;
  items: BatchAuditItemSummary[];
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Clean text for standard PDF encoding
 */
function sanitizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate Professional Institutional PDF Report for a Batch Audit Session
 */
export async function generateBatchAuditSessionPdf(report: OsapBatchSessionReport): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 36;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let currentPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let pageNum = 1;

  const checkPageBreak = (neededHeight: number): PDFPage => {
    if (y - neededHeight < MARGIN + 28) {
      drawFooter(currentPage, pageNum);
      currentPage = pdf.addPage([PAGE_W, PAGE_H]);
      pageNum++;
      y = PAGE_H - MARGIN;
      drawHeader(currentPage, true);
    }
    return currentPage;
  };

  const drawHeader = (page: PDFPage, isSubsequent = false) => {
    if (isSubsequent) {
      page.drawText("OSAP AUDIT & COMPLIANCE REPORT", {
        x: MARGIN,
        y: y,
        size: 8,
        font: bold,
        color: rgb(0.2, 0.2, 0.25),
      });
      page.drawText(`Date: ${new Date(report.createdAt).toLocaleDateString()}  •  Scope: ${report.batchName}`, {
        x: PAGE_W - MARGIN - 210,
        y: y,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawLine({
        start: { x: MARGIN, y: y - 5 },
        end: { x: PAGE_W - MARGIN, y: y - 5 },
        thickness: 0.75,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= 22;
      return;
    }

    // Official Clean Institutional Header Box
    page.drawRectangle({
      x: MARGIN,
      y: y - 52,
      width: CONTENT_W,
      height: 52,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.8, 0.84, 0.88),
      borderWidth: 1,
    });

    page.drawText("ONTARIO STUDENT ASSISTANCE PROGRAM (OSAP)", {
      x: MARGIN + 14,
      y: y - 18,
      size: 11,
      font: bold,
      color: rgb(0.12, 0.16, 0.22),
    });

    page.drawText("College Financial Aid Office — Audit & Compliance", {
      x: MARGIN + 14,
      y: y - 32,
      size: 8.5,
      font: font,
      color: rgb(0.3, 0.35, 0.4),
    });

    page.drawText("Application & Disbursement Audit Report", {
      x: MARGIN + 14,
      y: y - 44,
      size: 8,
      font: bold,
      color: rgb(0.35, 0.4, 0.45),
    });

    page.drawText(`AUDIT REF: ${report.id.slice(0, 8).toUpperCase()}`, {
      x: PAGE_W - MARGIN - 135,
      y: y - 22,
      size: 8,
      font: bold,
      color: rgb(0.2, 0.25, 0.3),
    });

    page.drawText(`DATE: ${new Date(report.createdAt).toLocaleDateString()}`, {
      x: PAGE_W - MARGIN - 135,
      y: y - 36,
      size: 7.5,
      font: font,
      color: rgb(0.4, 0.45, 0.5),
    });

    y -= 66;

    // Metadata Strip
    page.drawText(`Target Roster: ${report.batchName}`, { x: MARGIN, y, size: 8.5, font: bold, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(`Conducted By: ${report.conductedBy}`, { x: MARGIN + 190, y, size: 8.5, font: font, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(`Program: Acupuncture 50 weeks (2026)`, { x: MARGIN + 360, y, size: 8.5, font: font, color: rgb(0.25, 0.25, 0.25) });

    y -= 14;
    page.drawText(`Audit Assessment Mode: ${report.scenario}`, { x: MARGIN, y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4) });
    y -= 14;

    // Executive Metrics Summary Box
    page.drawRectangle({
      x: MARGIN,
      y: y - 38,
      width: CONTENT_W,
      height: 38,
      color: rgb(0.96, 0.97, 0.98),
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 0.8,
    });

    const boxW = CONTENT_W / 5;
    const stats = [
      { label: "TOTAL AUDITED", val: String(report.totalAudited), color: rgb(0.1, 0.15, 0.2) },
      { label: "MSFAA SUBMITTED", val: String(report.items.filter(i => i.client.msfaa_status === "submitted" || i.client.msfaa_status === "completed").length), color: rgb(0.08, 0.45, 0.18) },
      { label: "MSFAA PENDING", val: String(report.pendingMsfaaCount), color: rgb(0.75, 0.4, 0.05) },
      { label: "ACTION REQUIRED", val: String(report.items.filter(i => i.client.action_required || i.client.application_status === "action_required").length), color: rgb(0.75, 0.15, 0.15) },
      { label: "PAYMENT RELEASED", val: String(report.fundedCount), color: rgb(0.08, 0.45, 0.18) },
    ];

    stats.forEach((s, idx) => {
      const bx = MARGIN + idx * boxW;
      page.drawText(s.label, { x: bx + 8, y: y - 13, size: 6.5, font: bold, color: rgb(0.4, 0.45, 0.5) });
      page.drawText(s.val, { x: bx + 8, y: y - 29, size: 12, font: bold, color: s.color });
      if (idx > 0) {
        page.drawLine({
          start: { x: bx, y: y - 4 },
          end: { x: bx, y: y - 34 },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
    });

    y -= 50;
  };

  const drawFooter = (page: PDFPage, pNum: number) => {
    page.drawLine({
      start: { x: MARGIN, y: MARGIN + 14 },
      end: { x: PAGE_W - MARGIN, y: MARGIN + 14 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawText("CONFIDENTIAL — College Financial Aid & Compliance Record • Generated via Neptora", {
      x: MARGIN,
      y: MARGIN + 3,
      size: 7,
      font: font,
      color: rgb(0.45, 0.45, 0.45),
    });
    page.drawText(`Page ${pNum}`, {
      x: PAGE_W - MARGIN - 32,
      y: MARGIN + 3,
      size: 7,
      font: font,
      color: rgb(0.45, 0.45, 0.45),
    });
  };

  // Draw initial header
  drawHeader(currentPage, false);

  // Table Column Headers
  checkPageBreak(26);
  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 16,
    width: CONTENT_W,
    height: 16,
    color: rgb(0.16, 0.2, 0.26),
  });

  const COL_X = {
    num: MARGIN + 6,
    name: MARGIN + 26,
    oan: MARGIN + 160,
    status: MARGIN + 230,
    msfaa: MARGIN + 325,
    funding: MARGIN + 405,
  };

  currentPage.drawText("#", { x: COL_X.num, y: y - 11, size: 7, font: bold, color: rgb(1, 1, 1) });
  currentPage.drawText("STUDENT NAME", { x: COL_X.name, y: y - 11, size: 7, font: bold, color: rgb(1, 1, 1) });
  currentPage.drawText("OAN", { x: COL_X.oan, y: y - 11, size: 7, font: bold, color: rgb(1, 1, 1) });
  currentPage.drawText("APPLICATION STATUS", { x: COL_X.status, y: y - 11, size: 7, font: bold, color: rgb(1, 1, 1) });
  currentPage.drawText("MSFAA STATUS", { x: COL_X.msfaa, y: y - 11, size: 7, font: bold, color: rgb(1, 1, 1) });
  currentPage.drawText("FUNDING / DISBURSEMENT", { x: COL_X.funding, y: y - 11, size: 7, font: bold, color: rgb(1, 1, 1) });

  y -= 20;

  // Student Rows
  report.items.forEach((item, index) => {
    checkPageBreak(20);

    const isEven = index % 2 === 0;
    if (isEven) {
      currentPage.drawRectangle({
        x: MARGIN,
        y: y - 16,
        width: CONTENT_W,
        height: 16,
        color: rgb(0.97, 0.975, 0.98),
      });
    }

    const c = item.client;
    const numStr = String(index + 1);
    const nameStr = sanitizeText(c.full_name).slice(0, 24);
    const oanStr = maskOan(c.oan);
    const appLabel = (APPLICATION_STATUS_LABELS[c.application_status]?.label || c.application_status.replace(/_/g, " ")).slice(0, 20);
    const isMsfaaDone = c.msfaa_status === "submitted" || c.msfaa_status === "completed";
    const msfaaStr = isMsfaaDone ? "Submitted" : "Pending Req.";
    const fundingStr = sanitizeText(c.funding_status || "Pending Assessment").slice(0, 24);

    // Correct status color mapping
    let appStatusColor = rgb(0.25, 0.25, 0.25);
    if (c.application_status === "completed" || c.application_status === "funded" || c.application_status === "approved") {
      appStatusColor = rgb(0.08, 0.45, 0.18); // Clean dark green
    } else if (c.application_status === "action_required" || c.application_status === "denied" || c.document_status === "rejected") {
      appStatusColor = rgb(0.75, 0.12, 0.12); // Clean dark red
    } else if (c.application_status === "documents_under_review" || c.application_status === "processing") {
      appStatusColor = rgb(0.15, 0.35, 0.55); // Clean dark slate blue
    } else if (c.application_status === "not_started") {
      appStatusColor = rgb(0.45, 0.45, 0.45); // Subdued neutral grey for Not Started
    }

    currentPage.drawText(numStr, { x: COL_X.num, y: y - 11, size: 6.5, font: font, color: rgb(0.45, 0.45, 0.45) });
    currentPage.drawText(nameStr, { x: COL_X.name, y: y - 11, size: 7.5, font: bold, color: rgb(0.1, 0.12, 0.15) });
    currentPage.drawText(oanStr, { x: COL_X.oan, y: y - 11, size: 7, font: font, color: rgb(0.3, 0.3, 0.3) });

    currentPage.drawText(appLabel, {
      x: COL_X.status,
      y: y - 11,
      size: 7,
      font: bold,
      color: appStatusColor,
    });

    currentPage.drawText(msfaaStr, {
      x: COL_X.msfaa,
      y: y - 11,
      size: 7,
      font: font,
      color: isMsfaaDone ? rgb(0.08, 0.45, 0.18) : rgb(0.75, 0.4, 0.05),
    });

    currentPage.drawText(fundingStr, {
      x: COL_X.funding,
      y: y - 11,
      size: 7,
      font: font,
      color: /released|funded|disbursed/i.test(fundingStr) ? rgb(0.08, 0.45, 0.18) : rgb(0.35, 0.35, 0.35),
    });

    y -= 17;
  });

  // Action Required Follow-Up Section
  const pendingBlockers = report.items.filter(
    (i) => i.client.action_required || i.client.msfaa_status !== "submitted" || i.client.notes?.toLowerCase().includes("discrepancy")
  );

  if (pendingBlockers.length > 0) {
    checkPageBreak(50);
    y -= 10;
    currentPage.drawText("ACTION REQUIRED & PENDING ITEMS SUMMARY", {
      x: MARGIN,
      y,
      size: 9,
      font: bold,
      color: rgb(0.75, 0.12, 0.12),
    });
    y -= 13;

    pendingBlockers.slice(0, 20).forEach((b) => {
      checkPageBreak(15);
      const blockerReason = b.client.action_required_summary || b.client.notes || (b.client.msfaa_status !== "submitted" ? "Pending MSFAA Agreement with NSLSC" : "Action Required");
      const cleanReason = sanitizeText(blockerReason).slice(0, 80);

      currentPage.drawText(`• ${b.client.full_name}: `, {
        x: MARGIN + 8,
        y,
        size: 7,
        font: bold,
        color: rgb(0.2, 0.2, 0.2),
      });

      const nameWidth = font.widthOfTextAtSize(`• ${b.client.full_name}: `, 7);
      currentPage.drawText(cleanReason, {
        x: MARGIN + 8 + nameWidth,
        y,
        size: 7,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });

      y -= 12;
    });

    if (pendingBlockers.length > 20) {
      checkPageBreak(15);
      currentPage.drawText(`... and ${pendingBlockers.length - 20} additional pending action items.`, {
        x: MARGIN + 8,
        y,
        size: 7,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 12;
    }
  }

  // Draw footer on the last page
  drawFooter(currentPage, pageNum);

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}

/**
 * Generate Professional Institutional PDF Report for an Individual Student Audit
 */
export async function generateSingleAuditPdf(audit: OsapAudit, client: OsapClient): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Header Box
  page.drawRectangle({
    x: MARGIN,
    y: y - 50,
    width: CONTENT_W,
    height: 50,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.8, 0.84, 0.88),
    borderWidth: 1,
  });

  page.drawText("ONTARIO STUDENT ASSISTANCE PROGRAM (OSAP)", {
    x: MARGIN + 14,
    y: y - 18,
    size: 12,
    font: bold,
    color: rgb(0.12, 0.16, 0.22),
  });

  page.drawText("College Financial Aid Office — Student File Audit", {
    x: MARGIN + 14,
    y: y - 34,
    size: 8.5,
    font: font,
    color: rgb(0.35, 0.4, 0.45),
  });

  page.drawText(`DATE: ${new Date(audit.created_at).toLocaleDateString()}`, {
    x: PAGE_W - MARGIN - 110,
    y: y - 26,
    size: 8,
    font: bold,
    color: rgb(0.3, 0.35, 0.4),
  });

  y -= 68;

  // Client Info Box
  page.drawRectangle({
    x: MARGIN,
    y: y - 85,
    width: CONTENT_W,
    height: 85,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.86, 0.88, 0.9),
    borderWidth: 0.8,
  });

  page.drawText("STUDENT FILE DETAILS", {
    x: MARGIN + 12,
    y: y - 16,
    size: 8,
    font: bold,
    color: rgb(0.3, 0.35, 0.4),
  });

  page.drawText(`Full Name: ${sanitizeText(client.full_name)}`, { x: MARGIN + 12, y: y - 34, size: 8.5, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`OAN: ${maskOan(client.oan)}`, { x: MARGIN + 260, y: y - 34, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });

  page.drawText(`Institution: College`, { x: MARGIN + 12, y: y - 50, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Program: Acupuncture 50 weeks (2026)`, { x: MARGIN + 260, y: y - 50, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });

  page.drawText(`Application Status: ${(APPLICATION_STATUS_LABELS[client.application_status]?.label || client.application_status)}`, { x: MARGIN + 12, y: y - 66, size: 8.5, font: bold, color: rgb(0.15, 0.25, 0.4) });
  page.drawText(`MSFAA: ${client.msfaa_status === "submitted" ? "Submitted & Verified" : "Pending Agreement"}`, { x: MARGIN + 260, y: y - 66, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });

  y -= 105;

  // Audit Assessment Box
  page.drawRectangle({
    x: MARGIN,
    y: y - 65,
    width: CONTENT_W,
    height: 65,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.85, 0.85, 0.88),
    borderWidth: 0.8,
  });

  page.drawText("AUDIT VERIFICATION SUMMARY", {
    x: MARGIN + 12,
    y: y - 16,
    size: 8,
    font: bold,
    color: rgb(0.3, 0.35, 0.4),
  });

  page.drawText(`Conducted By: ${sanitizeText(audit.conducted_by || "Financial Aid Staff")}`, { x: MARGIN + 12, y: y - 34, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Timestamp: ${new Date(audit.created_at).toLocaleString()}`, { x: MARGIN + 260, y: y - 34, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Audit ID: ${audit.id.slice(0, 16)}`, { x: MARGIN + 12, y: y - 48, size: 7.5, font: font, color: rgb(0.45, 0.45, 0.45) });

  y -= 85;

  // Summary Note
  page.drawText("AUDIT OBSERVATIONS & NOTES", {
    x: MARGIN,
    y,
    size: 8.5,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 14;

  const summaryLines = sanitizeText(audit.summary).slice(0, 300);
  page.drawText(summaryLines, {
    x: MARGIN,
    y,
    size: 8.5,
    font: font,
    color: rgb(0.25, 0.25, 0.25),
    maxWidth: CONTENT_W,
    lineHeight: 12,
  });

  y -= 45;

  // Changes Detected
  if (audit.changes_detected && audit.changes_detected.length > 0) {
    page.drawText("DETECTED STATUS CHANGES", {
      x: MARGIN,
      y,
      size: 8.5,
      font: bold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 13;

    audit.changes_detected.forEach((ch) => {
      page.drawText(`• ${ch.field_name}: "${sanitizeText(ch.previous_value || 'None')}"  ->  "${sanitizeText(ch.new_value)}"`, {
        x: MARGIN + 8,
        y,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 13;
    });
  }

  // Footer
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 14 },
    end: { x: PAGE_W - MARGIN, y: MARGIN + 14 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText("CONFIDENTIAL — College Financial Aid Administration Record • Generated via Neptora", {
    x: MARGIN,
    y: MARGIN + 4,
    size: 7,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
