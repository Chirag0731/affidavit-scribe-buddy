import { PDFDocument, StandardFonts, rgb, grayscale, PDFPage, PDFFont } from "pdf-lib";
import type { OsapAudit, OsapClient, OsapActionItem } from "@/types/osap";
import { maskOan } from "./osap-crypto";
import { APPLICATION_STATUS_LABELS, MSFAA_STATUS_LABELS } from "@/types/osap";

export interface BatchAuditItemSummary {
  client: OsapClient;
  status: "success" | "warning" | "error" | "mfa_paused" | "no_change" | "changes_detected" | "mfa_required" | "failed" | "manual_review_required" | string;
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
 * Generate PDF Report for a Batch Audit Session
 */
export async function generateBatchAuditSessionPdf(report: OsapBatchSessionReport): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 40;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let currentPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let pageNum = 1;

  const checkPageBreak = (neededHeight: number): PDFPage => {
    if (y - neededHeight < MARGIN + 30) {
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
      page.drawText(`NEPTORA OSAP AUDIT REPORT — Session ${report.id.slice(0, 8)}`, {
        x: MARGIN,
        y: y,
        size: 8,
        font: bold,
        color: rgb(0.5, 0.4, 0.2),
      });
      page.drawText(`Date: ${new Date(report.createdAt).toLocaleDateString()}`, {
        x: PAGE_W - MARGIN - 100,
        y: y,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      page.drawLine({
        start: { x: MARGIN, y: y - 6 },
        end: { x: PAGE_W - MARGIN, y: y - 6 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= 24;
      return;
    }

    // Top Brand Bar
    page.drawRectangle({
      x: MARGIN,
      y: y - 48,
      width: CONTENT_W,
      height: 48,
      color: rgb(0.08, 0.08, 0.1),
      borderColor: rgb(0.79, 0.65, 0.35),
      borderWidth: 1,
    });

    page.drawText("NEPTORA OSAP CLIENT MANAGEMENT", {
      x: MARGIN + 14,
      y: y - 20,
      size: 13,
      font: bold,
      color: rgb(0.85, 0.72, 0.42),
    });

    page.drawText("Official Batch Audit & Compliance Session Report", {
      x: MARGIN + 14,
      y: y - 36,
      size: 9,
      font: font,
      color: rgb(0.85, 0.85, 0.85),
    });

    page.drawText(`SESSION ID: ${report.id.slice(0, 8).toUpperCase()}`, {
      x: PAGE_W - MARGIN - 130,
      y: y - 28,
      size: 8,
      font: bold,
      color: rgb(0.75, 0.75, 0.75),
    });

    y -= 64;

    // Metadata grid
    page.drawText(`Batch / Scope: ${report.batchName}`, { x: MARGIN, y, size: 9, font: bold, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(`Conducted By: ${report.conductedBy}`, { x: MARGIN + 200, y, size: 9, font: font, color: rgb(0.25, 0.25, 0.25) });
    page.drawText(`Date: ${new Date(report.createdAt).toLocaleString()}`, { x: MARGIN + 370, y, size: 9, font: font, color: rgb(0.25, 0.25, 0.25) });

    y -= 16;
    page.drawText(`Audit Scenario: ${report.scenario}`, { x: MARGIN, y, size: 8.5, font: font, color: rgb(0.4, 0.4, 0.4) });
    y -= 16;

    // Executive Metrics Summary Box
    page.drawRectangle({
      x: MARGIN,
      y: y - 42,
      width: CONTENT_W,
      height: 42,
      color: rgb(0.96, 0.96, 0.97),
      borderColor: rgb(0.85, 0.85, 0.88),
      borderWidth: 0.8,
    });

    const boxW = CONTENT_W / 5;
    const stats = [
      { label: "TOTAL AUDITED", val: String(report.totalAudited), color: rgb(0.1, 0.1, 0.1) },
      { label: "UPDATED / SYNCED", val: String(report.updatedCount), color: rgb(0.1, 0.5, 0.2) },
      { label: "MSFAA PENDING", val: String(report.pendingMsfaaCount), color: rgb(0.7, 0.4, 0.1) },
      { label: "HOLDS / DISCREPANCY", val: String(report.holdCount), color: rgb(0.8, 0.15, 0.15) },
      { label: "FUNDED / COMPLETED", val: String(report.fundedCount), color: rgb(0.05, 0.45, 0.3) },
    ];

    stats.forEach((s, idx) => {
      const bx = MARGIN + idx * boxW;
      page.drawText(s.label, { x: bx + 8, y: y - 14, size: 7, font: bold, color: rgb(0.45, 0.45, 0.45) });
      page.drawText(s.val, { x: bx + 8, y: y - 32, size: 13, font: bold, color: s.color });
      if (idx > 0) {
        page.drawLine({
          start: { x: bx, y: y - 4 },
          end: { x: bx, y: y - 38 },
          thickness: 0.5,
          color: rgb(0.85, 0.85, 0.85),
        });
      }
    });

    y -= 56;
  };

  const drawFooter = (page: PDFPage, pNum: number) => {
    page.drawLine({
      start: { x: MARGIN, y: MARGIN + 16 },
      end: { x: PAGE_W - MARGIN, y: MARGIN + 16 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    page.drawText("Neptora Legal OSAP Management System — Confidential Audit Record", {
      x: MARGIN,
      y: MARGIN + 4,
      size: 7.5,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`Page ${pNum}`, {
      x: PAGE_W - MARGIN - 35,
      y: MARGIN + 4,
      size: 7.5,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
  };

  // Draw initial header
  drawHeader(currentPage, false);

  // Table Header
  checkPageBreak(30);
  currentPage.drawRectangle({
    x: MARGIN,
    y: y - 18,
    width: CONTENT_W,
    height: 18,
    color: rgb(0.12, 0.12, 0.15),
  });

  const COL_X = {
    num: MARGIN + 6,
    name: MARGIN + 26,
    batch: MARGIN + 145,
    oan: MARGIN + 225,
    status: MARGIN + 290,
    msfaa: MARGIN + 375,
    result: MARGIN + 440,
  };

  currentPage.drawText("#", { x: COL_X.num, y: y - 12, size: 7.5, font: bold, color: rgb(0.9, 0.9, 0.9) });
  currentPage.drawText("STUDENT NAME", { x: COL_X.name, y: y - 12, size: 7.5, font: bold, color: rgb(0.9, 0.9, 0.9) });
  currentPage.drawText("BATCH / COHORT", { x: COL_X.batch, y: y - 12, size: 7.5, font: bold, color: rgb(0.9, 0.9, 0.9) });
  currentPage.drawText("OAN", { x: COL_X.oan, y: y - 12, size: 7.5, font: bold, color: rgb(0.9, 0.9, 0.9) });
  currentPage.drawText("APP STATUS", { x: COL_X.status, y: y - 12, size: 7.5, font: bold, color: rgb(0.9, 0.9, 0.9) });
  currentPage.drawText("MSFAA", { x: COL_X.msfaa, y: y - 12, size: 7.5, font: bold, color: rgb(0.9, 0.9, 0.9) });
  currentPage.drawText("AUDIT RESULT / NOTES", { x: COL_X.result, y: y - 12, size: 7.5, font: bold, color: rgb(0.9, 0.9, 0.9) });

  y -= 22;

  // Student Rows
  report.items.forEach((item, index) => {
    checkPageBreak(24);

    const isEven = index % 2 === 0;
    if (isEven) {
      currentPage.drawRectangle({
        x: MARGIN,
        y: y - 18,
        width: CONTENT_W,
        height: 18,
        color: rgb(0.97, 0.97, 0.98),
      });
    }

    const c = item.client;
    const numStr = String(index + 1);
    const nameStr = sanitizeText(c.full_name).slice(0, 22);
    const batchStr = sanitizeText(c.batch_name || "General").slice(0, 15);
    const oanStr = maskOan(c.oan);
    const appLabel = (APPLICATION_STATUS_LABELS[c.application_status]?.label || c.application_status).slice(0, 15);
    const msfaaStr = c.msfaa_status === "submitted" || c.msfaa_status === "completed" ? "Submitted" : "Pending Req.";
    const resultStr = sanitizeText(item.message || item.notes || "Audited").slice(0, 18);

    currentPage.drawText(numStr, { x: COL_X.num, y: y - 12, size: 7, font: font, color: rgb(0.4, 0.4, 0.4) });
    currentPage.drawText(nameStr, { x: COL_X.name, y: y - 12, size: 7.5, font: bold, color: rgb(0.1, 0.1, 0.1) });
    currentPage.drawText(batchStr, { x: COL_X.batch, y: y - 12, size: 7, font: font, color: rgb(0.3, 0.3, 0.3) });
    currentPage.drawText(oanStr, { x: COL_X.oan, y: y - 12, size: 7, font: font, color: rgb(0.3, 0.3, 0.3) });

    // Status color
    const isSuccess = item.status === "success" || c.application_status === "completed" || c.application_status === "approved";
    const isError = item.status === "error" || c.application_status === "action_required" || c.batch_name === "Hold";

    currentPage.drawText(appLabel, {
      x: COL_X.status,
      y: y - 12,
      size: 7,
      font: bold,
      color: isSuccess ? rgb(0.1, 0.5, 0.2) : isError ? rgb(0.75, 0.15, 0.15) : rgb(0.2, 0.2, 0.2),
    });

    currentPage.drawText(msfaaStr, {
      x: COL_X.msfaa,
      y: y - 12,
      size: 7,
      font: font,
      color: c.msfaa_status === "submitted" ? rgb(0.1, 0.5, 0.2) : rgb(0.75, 0.45, 0.1),
    });

    currentPage.drawText(resultStr, {
      x: COL_X.result,
      y: y - 12,
      size: 7,
      font: font,
      color: rgb(0.35, 0.35, 0.35),
    });

    y -= 19;
  });

  // Action Required Follow-Up Section
  const pendingBlockers = report.items.filter(
    (i) => i.client.action_required || i.client.msfaa_status !== "submitted" || i.client.batch_name === "Hold"
  );

  if (pendingBlockers.length > 0) {
    checkPageBreak(60);
    y -= 10;
    currentPage.drawText("ACTION REQUIRED & PENDING FOLLOW-UP SUMMARY", {
      x: MARGIN,
      y,
      size: 9.5,
      font: bold,
      color: rgb(0.75, 0.15, 0.15),
    });
    y -= 14;

    pendingBlockers.slice(0, 15).forEach((b) => {
      checkPageBreak(16);
      const blockerReason = b.client.action_required_summary || b.client.notes || (b.client.msfaa_status !== "submitted" ? "Pending MSFAA Agreement" : "Action Required");
      const cleanReason = sanitizeText(blockerReason).slice(0, 75);

      currentPage.drawText(`• ${b.client.full_name} (${b.client.batch_name || "General"}): `, {
        x: MARGIN + 10,
        y,
        size: 7.5,
        font: bold,
        color: rgb(0.2, 0.2, 0.2),
      });

      const nameWidth = font.widthOfTextAtSize(`• ${b.client.full_name} (${b.client.batch_name || "General"}): `, 7.5);
      currentPage.drawText(cleanReason, {
        x: MARGIN + 10 + nameWidth,
        y,
        size: 7.5,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });

      y -= 13;
    });

    if (pendingBlockers.length > 15) {
      checkPageBreak(16);
      currentPage.drawText(`... and ${pendingBlockers.length - 15} additional pending action items. See Audit Center in Neptora.`, {
        x: MARGIN + 10,
        y,
        size: 7.5,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 14;
    }
  }

  // Draw footer on the last page
  drawFooter(currentPage, pageNum);

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}

/**
 * Generate PDF Report for an Individual Student Audit
 */
export async function generateSingleAuditPdf(audit: OsapAudit, client: OsapClient): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 45;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  // Header Banner
  page.drawRectangle({
    x: MARGIN,
    y: y - 50,
    width: CONTENT_W,
    height: 50,
    color: rgb(0.08, 0.08, 0.1),
    borderColor: rgb(0.79, 0.65, 0.35),
    borderWidth: 1,
  });

  page.drawText("NEPTORA LEGAL — OSAP AUDIT REPORT", {
    x: MARGIN + 16,
    y: y - 22,
    size: 14,
    font: bold,
    color: rgb(0.85, 0.72, 0.42),
  });

  page.drawText("Individual Student File Audit & Compliance Snapshot", {
    x: MARGIN + 16,
    y: y - 38,
    size: 9,
    font: font,
    color: rgb(0.85, 0.85, 0.85),
  });

  y -= 70;

  // Client Info Box
  page.drawRectangle({
    x: MARGIN,
    y: y - 90,
    width: CONTENT_W,
    height: 90,
    color: rgb(0.97, 0.97, 0.98),
    borderColor: rgb(0.85, 0.85, 0.88),
    borderWidth: 0.8,
  });

  page.drawText("STUDENT FILE INFORMATION", {
    x: MARGIN + 12,
    y: y - 18,
    size: 8.5,
    font: bold,
    color: rgb(0.5, 0.4, 0.2),
  });

  page.drawText(`Full Name: ${sanitizeText(client.full_name)}`, { x: MARGIN + 12, y: y - 36, size: 8.5, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`OAN: ${maskOan(client.oan)}`, { x: MARGIN + 260, y: y - 36, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });

  page.drawText(`Batch / Cohort: ${sanitizeText(client.batch_name || "General Batch")}`, { x: MARGIN + 12, y: y - 52, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Institution: ${sanitizeText(client.school || "Eight Branches")}`, { x: MARGIN + 260, y: y - 52, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });

  page.drawText(`Program: ${sanitizeText(client.program || "Acupuncture 50 weeks")}`, { x: MARGIN + 12, y: y - 68, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Email: ${sanitizeText(client.email || "—")}`, { x: MARGIN + 260, y: y - 68, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });

  y -= 110;

  // Audit Result Box
  const isPass = audit.status === "success";
  page.drawRectangle({
    x: MARGIN,
    y: y - 80,
    width: CONTENT_W,
    height: 80,
    color: isPass ? rgb(0.95, 0.98, 0.95) : rgb(0.98, 0.95, 0.95),
    borderColor: isPass ? rgb(0.4, 0.75, 0.4) : rgb(0.85, 0.4, 0.4),
    borderWidth: 1,
  });

  page.drawText("AUDIT ASSESSMENT & RESULT", {
    x: MARGIN + 12,
    y: y - 18,
    size: 8.5,
    font: bold,
    color: isPass ? rgb(0.1, 0.5, 0.2) : rgb(0.75, 0.15, 0.15),
  });

  page.drawText(`Status: ${audit.status.toUpperCase()}`, { x: MARGIN + 12, y: y - 36, size: 9, font: bold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`Audited By: ${sanitizeText(audit.conducted_by || "Staff Coordinator")}`, { x: MARGIN + 260, y: y - 36, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Timestamp: ${new Date(audit.created_at).toLocaleString()}`, { x: MARGIN + 12, y: y - 52, size: 8.5, font: font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Audit ID: ${audit.id}`, { x: MARGIN + 260, y: y - 52, size: 7.5, font: font, color: rgb(0.4, 0.4, 0.4) });

  y -= 100;

  // Summary Note
  page.drawText("AUDIT SUMMARY & LOGGED OBSERVATIONS", {
    x: MARGIN,
    y,
    size: 9,
    font: bold,
    color: rgb(0.15, 0.15, 0.15),
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

  y -= 50;

  // Changes Detected
  if (audit.changes_detected && audit.changes_detected.length > 0) {
    page.drawText("CHANGES & STATUS UPDATES DETECTED", {
      x: MARGIN,
      y,
      size: 9,
      font: bold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 14;

    audit.changes_detected.forEach((ch) => {
      page.drawText(`• ${ch.field_name}: "${sanitizeText(ch.previous_value || 'None')}"  ->  "${sanitizeText(ch.new_value)}"`, {
        x: MARGIN + 8,
        y,
        size: 8,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= 14;
    });
  }

  // Footer
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 20 },
    end: { x: PAGE_W - MARGIN, y: MARGIN + 20 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText("Neptora Legal OSAP Compliance Engine — Verified Audit Snapshot", {
    x: MARGIN,
    y: MARGIN + 6,
    size: 7.5,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdf.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}
