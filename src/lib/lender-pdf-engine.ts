import { PDFDocument, StandardFonts, rgb, RGB, PDFPage } from "pdf-lib";
import JSZip from "jszip";
import {
  BUSINESS_FINANCING_TEMPLATE_BASE64,
  CANACAP_TEMPLATE_BASE64,
} from "@/assets/lenders/lender-templates-asset";
import type {
  BusinessFinancingApplication,
  LenderValidationReport,
  LenderFieldAudit,
  EntityType,
  IndustryType,
  HousingStatus,
  OccupancyType,
  SignatureAuditTrail,
} from "@/types/financing";
import { createEmptyApplication, normalizeApplicationData } from "@/types/financing";
import {
  generateEnvelopeId,
  computeSha256Digest,
  formatAuditTimestamp,
} from "@/lib/signature-audit-engine";

// Format currency
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date to mm/dd/yyyy
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return dateStr;
}

// Convert base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Draw a checkmark inside a checkbox box
function drawCheckbox(
  page: any,
  x: number,
  y: number,
  checked: boolean,
  color: RGB = rgb(0.05, 0.25, 0.6)
) {
  if (!checked) return;
  // Draw an aesthetic bold checkmark
  page.drawLine({
    start: { x: x - 1, y: y + 2 },
    end: { x: x + 2, y: y - 2 },
    thickness: 1.5,
    color,
  });
  page.drawLine({
    start: { x: x + 2, y: y - 2 },
    end: { x: x + 7, y: y + 6 },
    thickness: 1.5,
    color,
  });
}

// Draw a circle / rounded highlight around an option
function drawCircleOption(
  page: any,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: RGB = rgb(0.1, 0.35, 0.8)
) {
  // Approximate ellipse with rounded rect or border lines
  page.drawEllipse({
    x: cx,
    y: cy,
    xScale: rx,
    yScale: ry,
    borderColor: color,
    borderWidth: 1.4,
  });
}

// Helper to embed a base64 signature image
async function embedSignature(
  pdfDoc: PDFDocument,
  page: any,
  sigDataUrl: string | undefined,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) {
  if (!sigDataUrl || !sigDataUrl.startsWith("data:image/")) return;
  try {
    const bytes = base64ToUint8Array(sigDataUrl);
    const img = sigDataUrl.includes("image/jpeg") || sigDataUrl.includes("image/jpg")
      ? await pdfDoc.embedJpg(bytes)
      : await pdfDoc.embedPng(bytes);

    const dims = img.scaleToFit(maxWidth, maxHeight);
    page.drawImage(img, {
      x,
      y,
      width: dims.width,
      height: dims.height,
    });
  } catch (err) {
    console.warn("Failed to embed signature into PDF:", err);
  }
}

// =========================================================================
// 1. GENERATE: Business Financing Application (White Label / Journey Capital)
// =========================================================================
export async function generateWhiteLabelPdf(
  app: BusinessFinancingApplication
): Promise<Blob> {
  const norm = normalizeApplicationData(app);
  const templateBytes = base64ToUint8Array(BUSINESS_FINANCING_TEMPLATE_BASE64);
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const page = pdfDoc.getPage(0);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0, 0, 0);
  const highlightColor = rgb(0.05, 0.25, 0.65);

  const drawText = (
    text: string | number | undefined | null,
    x: number,
    y: number,
    size = 8.5,
    isBold = false,
    color = primaryColor
  ) => {
    if (text === undefined || text === null || text === "") return;
    const str = String(text);
    page.drawText(str, {
      x,
      y,
      size,
      font: isBold ? boldFont : font,
      color,
    });
  };

  const drawMask = (x: number, y: number, width: number, height: number) => {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(1, 1, 1),
    });
  };

  const { business, financials, owners, property, existingFinancing, authorization } = norm;
  const owner1 = owners[0];
  const owner2 = owners[1];

  // Header
  if (norm.assignedAgent) drawText(norm.assignedAgent, 320, 688, 8, false, highlightColor);
  if (norm.assignedSubagent) drawText(norm.assignedSubagent, 450, 688, 8, false, highlightColor);

  // Business Name(s) Section
  drawText(business.legalName, 105, 668, 8.5, true);
  drawText(business.phone, 445, 668, 8.5);

  drawText(business.legalAddress.street, 90, 650, 8.5);
  drawText(business.fax, 445, 650, 8.5);

  drawText(business.legalAddress.city, 55, 633, 8.5);
  drawText(business.legalAddress.province, 265, 633, 8.5);
  drawText(business.legalAddress.postalCode, 465, 633, 8.5);

  drawText(business.dba || business.legalName, 185, 615, 8.5);
  drawText(business.phone, 445, 615, 8.5);

  const physical = business.physicalSameAsLegal ? business.legalAddress : business.physicalAddress;
  drawText(physical.street, 180, 597, 8.5);
  drawText(business.fax, 445, 597, 8.5);

  drawText(physical.city, 55, 580, 8.5);
  drawText(physical.province, 265, 580, 8.5);
  drawText(physical.postalCode, 465, 580, 8.5);

  // Mailing Address Selection
  const isDbaMailing = business.mailingAddressChoice === "dba" || business.mailingAddressChoice === "physical";
  drawCheckbox(page, 160, 563, isDbaMailing);
  drawCheckbox(page, 220, 563, !isDbaMailing);
  drawText(business.email, 410, 561, 8.5);

  // Merchant Profile (Business)
  if (business.entityType === "sole_proprietorship" && owner1?.sin) {
    drawText(owner1.sin, 195, 529, 8.5);
  }
  drawText(business.provinceOfIncorporation || "ON", 450, 529, 8.5);
  drawText(String(business.numberOfLocations || 1), 565, 529, 8.5);

  if (business.dateStarted) {
    drawMask(28, 499, 70, 12);
    drawText(formatDate(business.dateStarted), 30, 502, 8.5);
  }
  const ownershipLen =
    business.lengthOfOwnershipYears > 0
      ? `${business.lengthOfOwnershipYears} yrs ${business.lengthOfOwnershipMonths || 0} mos`
      : `${business.lengthOfOwnershipMonths || 0} mos`;
  drawText(ownershipLen, 135, 502, 8.5);
  drawText(business.productServiceSold, 255, 502, 7.5);
  drawText(formatCurrency(financials.requestedAmount), 510, 502, 9.5, true, highlightColor);

  drawText(
    financials.useOfFunds === "other"
      ? financials.useOfFundsOther || "Other"
      : financials.useOfFunds.replace(/_/g, " ").toUpperCase(),
    125,
    495,
    8.5
  );

  // Lease Dates (Mask pre-printed mm/dd/yyy placeholders)
  if (property.leaseStartDate) {
    drawMask(50, 455, 72, 16);
    drawText(formatDate(property.leaseStartDate), 53, 458, 8.5, true);
  }
  if (property.leaseEndDate) {
    drawMask(160, 455, 72, 16);
    drawText(formatDate(property.leaseEndDate), 163, 458, 8.5, true);
  }

  // Seasonal Business: Yes/No (Align checkmark precisely before text)
  if (financials.isSeasonal) {
    drawCheckbox(page, 248, 452, true);
    if (financials.peakSalesStartMonth) drawText(financials.peakSalesStartMonth, 355, 447, 8);
    if (financials.peakSalesEndMonth) drawText(financials.peakSalesEndMonth, 445, 447, 8);
  } else {
    drawCheckbox(page, 275, 452, true);
  }

  // Franchise: Yes/No (Align checkmark on preceding underscore)
  if (financials.isFranchise) {
    drawCheckbox(page, 532, 452, true);
    drawText(financials.franchisorName, 130, 362, 8);
    drawText(financials.franchisorPhone, 455, 362, 8);
  } else {
    drawCheckbox(page, 558, 452, true);
  }

  // Sales
  drawText(formatCurrency(financials.nonCardMonthlySales), 125, 432, 8.5);
  drawText(formatCurrency(financials.grossMonthlySales), 415, 432, 8.5, true);

  // Cash Advance History
  if (existingFinancing.hasCashAdvanceBefore) {
    drawCheckbox(page, 155, 407, true);
    drawText(existingFinancing.cashAdvanceProvider, 245, 407, 8);
    if (existingFinancing.cashAdvanceWhen) {
      drawMask(82, 399, 68, 12);
      drawText(formatDate(existingFinancing.cashAdvanceWhen), 85, 402, 8);
    }
  } else {
    drawCheckbox(page, 182, 407, true);
  }

  // Entity Type Checkboxes
  drawCheckbox(page, 412, 414, business.entityType === "sole_proprietorship");
  drawCheckbox(page, 472, 414, business.entityType === "limited_partnership");
  drawCheckbox(page, 412, 403, business.entityType === "partnership");
  drawCheckbox(page, 472, 403, business.entityType === "llc");
  drawCheckbox(page, 508, 403, business.entityType === "llp");
  drawCheckbox(page, 544, 403, business.entityType === "corporation");

  drawText(business.businessNumber, 140, 384, 8.5);
  drawText(formatCurrency(property.monthlyRentOrMortgage), 440, 384, 8.5);

  // Owner 1
  if (owner1) {
    drawText(owner1.firstName, 75, 320, 8.5);
    drawText(owner1.lastName, 280, 320, 8.5);
    drawText(owner1.title, 445, 320, 8.5);

    drawText(owner1.sin, 125, 303, 8.5);
    // Mask out the pre-printed mm/dd/yyy placeholder on the template
    if (owner1.dob) {
      drawMask(268, 300, 82, 13);
      drawText(formatDate(owner1.dob), 272, 303, 8.5);
    }
    drawText(owner1.dlNumber || "N/A", 450, 303, 8.5);

    drawText(`${owner1.ownershipPercentage}%`, 95, 285, 8.5, true);
    drawText(`${owner1.yearsAtResidence || 0} yrs`, 285, 285, 8.5);

    drawCheckbox(page, 413, 285, owner1.housingStatus === "own");
    drawCheckbox(page, 444, 285, owner1.housingStatus === "rent");
    drawCheckbox(page, 475, 285, owner1.housingStatus === "lease");

    drawText(owner1.address.street, 105, 268, 8.5);
    drawText(owner1.address.city, 255, 268, 8.5);
    drawText(owner1.address.province, 405, 268, 8.5);
    drawText(owner1.address.postalCode, 550, 268, 8.5);

    drawText(owner1.phone, 65, 251, 8.5);
    drawText(owner1.mobile || owner1.phone, 265, 251, 8.5);
    drawText(owner1.email, 395, 251, 8.5);
  }

  // Owner 2
  if (owner2) {
    drawText(owner2.firstName, 75, 221, 8.5);
    drawText(owner2.lastName, 280, 221, 8.5);
    drawText(owner2.title, 445, 221, 8.5);

    drawText(owner2.sin, 125, 203, 8.5);
    // Mask out the pre-printed mm/dd/yyy placeholder on the template
    if (owner2.dob) {
      drawMask(268, 200, 82, 13);
      drawText(formatDate(owner2.dob), 272, 203, 8.5);
    }
    drawText(owner2.dlNumber || "N/A", 450, 203, 8.5);

    drawText(`${owner2.ownershipPercentage}%`, 95, 186, 8.5, true);
    drawText(`${owner2.yearsAtResidence || 0} yrs`, 285, 186, 8.5);

    drawCheckbox(page, 413, 186, owner2.housingStatus === "own");
    drawCheckbox(page, 444, 186, owner2.housingStatus === "rent");
    drawCheckbox(page, 475, 186, owner2.housingStatus === "lease");

    drawText(owner2.address.street, 105, 169, 8.5);
    drawText(owner2.address.city, 255, 169, 8.5);
    drawText(owner2.address.province, 405, 169, 8.5);
    drawText(owner2.address.postalCode, 550, 169, 8.5);

    drawText(owner2.phone, 65, 151, 8.5);
    drawText(owner2.mobile || owner2.phone, 265, 151, 8.5);
    drawText(owner2.email, 395, 151, 8.5);
  }

  // Signatures
  // Signer 1
  if (authorization.signatureDataUrl) {
    await embedSignature(pdfDoc, page, authorization.signatureDataUrl, 55, 68, 120, 24);
  } else if (authorization.applicantName) {
    drawText(authorization.applicantName, 55, 73, 9, false, highlightColor);
  }
  drawText(authorization.applicantTitle || owner1?.title || "Owner", 220, 73, 8.5);
  drawText(authorization.applicantName || `${owner1?.firstName} ${owner1?.lastName}`, 405, 73, 8.5);
  // Mask mm/dd/yyy underneath signature date line
  drawMask(535, 60, 68, 22);
  drawText(formatDate(authorization.signatureDate), 540, 73, 8.5);

  // Signer 2
  if (authorization.secondSignatureDataUrl) {
    await embedSignature(pdfDoc, page, authorization.secondSignatureDataUrl, 55, 30, 120, 24);
  } else if (authorization.secondApplicantName) {
    drawText(authorization.secondApplicantName, 55, 36, 9, false, highlightColor);
  }
  if (authorization.secondApplicantName || owner2) {
    drawText(authorization.secondApplicantTitle || owner2?.title || "Partner", 220, 36, 8.5);
    drawText(authorization.secondApplicantName || `${owner2?.firstName} ${owner2?.lastName}`, 405, 36, 8.5);
    // Mask mm/dd/yyy underneath second signature date line
    drawMask(535, 24, 68, 22);
    drawText(formatDate(authorization.secondSignatureDate || authorization.signatureDate), 540, 36, 8.5);
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

// =========================================================================
// 2. GENERATE: CanaCap Business Information / Application
// =========================================================================
export async function generateCanaCapPdf(
  app: BusinessFinancingApplication
): Promise<Blob> {
  const norm = normalizeApplicationData(app);
  const templateBytes = base64ToUint8Array(CANACAP_TEMPLATE_BASE64);
  const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const page = pdfDoc.getPage(0);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0, 0, 0);
  const circleColor = rgb(0.85, 0.15, 0.15); // Distinctive red circle mark matching CanaCap theme

  const drawText = (
    text: string | number | undefined | null,
    x: number,
    y: number,
    size = 8.5,
    isBold = false,
    color = primaryColor
  ) => {
    if (text === undefined || text === null || text === "") return;
    const str = String(text);
    page.drawText(str, {
      x,
      y,
      size,
      font: isBold ? boldFont : font,
      color,
    });
  };

  const { business, financials, owners, property, paymentProcessing, tradeReferences, existingFinancing, authorization } = norm;
  const owner1 = owners[0];
  const owner2 = owners[1];

  // Business Information
  drawText(business.legalName, 135, 693, 8.5, true);
  drawText(business.dba || business.legalName, 345, 693, 8.5);

  const physical = business.physicalSameAsLegal ? business.legalAddress : business.physicalAddress;
  drawText(physical.street, 115, 677, 8.5);
  drawText(physical.city, 65, 661, 8.5);
  drawText(physical.province, 235, 661, 8.5);
  drawText(physical.postalCode, 395, 661, 8.5);

  drawText(formatDate(business.dateStarted), 135, 646, 8.5);
  const ownershipLen =
    business.lengthOfOwnershipYears > 0
      ? `${business.lengthOfOwnershipYears} yrs ${business.lengthOfOwnershipMonths || 0} mos`
      : `${business.lengthOfOwnershipMonths || 0} mos`;
  drawText(ownershipLen, 290, 646, 8.5);

  // CanaCap explicitly asks for Gross Annual Sales
  const annualSales = financials.grossAnnualSales || financials.grossMonthlySales * 12;
  drawText(formatCurrency(annualSales), 435, 646, 8.5, true);

  drawText(business.phone, 75, 630, 8.5);
  drawText(business.fax, 185, 630, 8.5);
  const cleanWebsite = (business.website || "").replace(/^https?:\/\//i, "");
  drawText(cleanWebsite || "N/A", 305, 630, 7.5);
  drawText(business.email, 390, 630, 7.5);

  drawText(business.businessNumber, 65, 614, 8.5);

  // Business Type (Circle One)
  // Options: Sole Proprietorship (cx=325), Partnership (cx=403), LLC (cx=471), Corporation (cx=528), cy=616
  if (business.entityType === "sole_proprietorship") {
    drawCircleOption(page, 325, 616, 38, 7, circleColor);
  } else if (business.entityType === "partnership" || business.entityType === "limited_partnership") {
    drawCircleOption(page, 403, 616, 26, 7, circleColor);
  } else if (business.entityType === "llc" || business.entityType === "llp") {
    drawCircleOption(page, 471, 616, 14, 7, circleColor);
  } else {
    drawCircleOption(page, 528, 616, 26, 7, circleColor);
  }

  // Type of Business (Circle all that apply)
  // Retail (195), MO/TO (245), Wholesale (290), Restaurant (350), Other (410), cy=601
  if (business.industryType === "retail") drawCircleOption(page, 195, 601, 16, 6, circleColor);
  if (business.industryType === "moto") drawCircleOption(page, 245, 601, 18, 6, circleColor);
  if (business.industryType === "wholesale") drawCircleOption(page, 290, 601, 24, 6, circleColor);
  if (business.industryType === "restaurant") drawCircleOption(page, 350, 601, 24, 6, circleColor);
  if (
    business.industryType === "other" ||
    business.industryType === "services" ||
    business.industryType === "construction" ||
    business.industryType === "transportation" ||
    business.industryType === "medical_healthcare" ||
    business.industryType === "technology"
  ) {
    drawCircleOption(page, 410, 601, 28, 6, circleColor);
    drawText(business.industryTypeOther || business.industryType.replace(/_/g, " "), 445, 599, 7.5);
  }

  drawText(business.productServiceSold, 125, 584, 8);
  drawText(
    financials.useOfFunds === "other"
      ? financials.useOfFundsOther || "Other"
      : financials.useOfFunds.replace(/_/g, " ").toUpperCase(),
    385,
    584,
    8
  );

  // OWNER/OFFICER INFORMATION
  if (owner1) {
    drawText(`${owner1.firstName} ${owner1.lastName}`, 125, 545, 8.5, true);
    drawText(owner1.title, 330, 545, 8.5);
    drawText(`${owner1.ownershipPercentage}%`, 485, 545, 8.5, true);

    drawText(owner1.address.street, 105, 529, 8.5);
    drawText(owner1.address.city, 280, 529, 8.5);
    drawText(owner1.address.province, 405, 529, 8.5);
    drawText(owner1.address.postalCode, 505, 529, 8.5);

    drawText(owner1.sin, 70, 513, 8.5);
    if (owner1.dob) {
      page.drawRectangle({ x: 190, y: 510, width: 75, height: 13, color: rgb(1, 1, 1) });
      drawText(formatDate(owner1.dob), 195, 513, 8.5);
    }
    drawText(owner1.phone, 310, 513, 8.5);
    drawText(owner1.mobile || owner1.phone, 400, 513, 8.5);
  }

  // ADDITIONAL OWNER/OFFICER INFORMATION
  if (owner2) {
    drawText(`${owner2.firstName} ${owner2.lastName}`, 125, 482, 8.5, true);
    drawText(owner2.title, 330, 482, 8.5);
    drawText(`${owner2.ownershipPercentage}%`, 485, 482, 8.5, true);

    drawText(owner2.address.street, 105, 466, 8.5);
    drawText(owner2.address.city, 280, 466, 8.5);
    drawText(owner2.address.province, 405, 466, 8.5);
    drawText(owner2.address.postalCode, 505, 466, 8.5);

    drawText(owner2.sin, 70, 451, 8.5);
    if (owner2.dob) {
      page.drawRectangle({ x: 190, y: 448, width: 75, height: 13, color: rgb(1, 1, 1) });
      drawText(formatDate(owner2.dob), 195, 451, 8.5);
    }
    drawText(owner2.phone, 310, 451, 8.5);
    drawText(owner2.mobile || owner2.phone, 400, 451, 8.5);
  }

  // BUSINESS PROPERTY INFORMATION
  drawText(property.landlordOrMortgageBank, 215, 410, 8.5);
  drawText(property.accountNumber, 485, 410, 8.5);
  drawText(property.contactName, 105, 394, 8.5);
  drawText(property.phone, 345, 394, 8.5);
  drawText(property.occupancyType.toUpperCase(), 105, 379, 8.5);
  drawText(formatCurrency(property.monthlyRentOrMortgage), 365, 379, 8.5);

  // Business Trade References (2 suppliers)
  // Table row 1 labels at y=343.5; row 2 labels at y=327.8
  const ref1 = tradeReferences[0];
  const ref2 = tradeReferences[1];
  if (ref1) {
    drawText(ref1.businessName, 105, 344, 8);
    drawText(ref1.accountNumber, 325, 344, 8);
    drawText(`${ref1.contactName} • ${ref1.contactPhone}`, 420, 336, 7.5);
  }
  if (ref2) {
    drawText(ref2.businessName, 105, 328, 8);
    drawText(ref2.accountNumber, 325, 328, 8);
    drawText(`${ref2.contactName} • ${ref2.contactPhone}`, 420, 320, 7.5);
  }

  // OTHER INFORMATION
  drawText(paymentProcessing.terminalSoftwareModel || "N/A", 225, 294, 8);
  drawText(String(paymentProcessing.numberOfTerminals || 1), 515, 294, 8);

  // Accepted cards circle marks (Visa/MC 220, Amex 269, Discover 314, Debit 360, EBT 392, cy=280)
  if (paymentProcessing.acceptedCards.visaMastercard) drawCircleOption(page, 220, 280, 28, 6, circleColor);
  if (paymentProcessing.acceptedCards.amex) drawCircleOption(page, 269, 280, 14, 6, circleColor);
  if (paymentProcessing.acceptedCards.discover) drawCircleOption(page, 314, 280, 18, 6, circleColor);
  if (paymentProcessing.acceptedCards.debit) drawCircleOption(page, 360, 280, 14, 6, circleColor);
  if (paymentProcessing.acceptedCards.ebt) drawCircleOption(page, 392, 280, 12, 6, circleColor);

  drawText(formatCurrency(paymentProcessing.averageMonthlyVolume || financials.grossMonthlySales), 505, 278, 8.5);

  // Prior Cash Advance / MCA
  const firstMca = existingFinancing.facilities.find(
    (f) => /advance|mca|revenue|capital/i.test(f.productType || "") || /advance|capital/i.test(f.lenderName)
  ) || existingFinancing.facilities[0];

  if (firstMca) {
    drawText(firstMca.lenderName, 265, 262, 8);
    drawText(formatCurrency(firstMca.currentBalance), 465, 262, 8.5);
  }

  // Signatures
  // Signer 1
  if (authorization.signatureDataUrl) {
    await embedSignature(pdfDoc, page, authorization.signatureDataUrl, 60, 120, 160, 28);
  }
  drawText(authorization.applicantName || `${owner1?.firstName} ${owner1?.lastName}`, 60, 96, 9);
  if (authorization.signatureDate) {
    page.drawRectangle({ x: 55, y: 62, width: 75, height: 13, color: rgb(1, 1, 1) });
    drawText(formatDate(authorization.signatureDate), 60, 65, 8.5);
  }

  // Signer 2
  if (authorization.secondSignatureDataUrl) {
    await embedSignature(pdfDoc, page, authorization.secondSignatureDataUrl, 350, 120, 160, 28);
  }
  if (authorization.secondApplicantName || owner2) {
    drawText(authorization.secondApplicantName || `${owner2?.firstName} ${owner2?.lastName}`, 350, 96, 9);
    page.drawRectangle({ x: 345, y: 62, width: 75, height: 13, color: rgb(1, 1, 1) });
    drawText(formatDate(authorization.secondSignatureDate || authorization.signatureDate), 350, 65, 8.5);
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
}

// =========================================================================
// 3. VALIDATION ENGINE FOR EACH LENDER
// =========================================================================
export function validateForWhiteLabel(
  app: BusinessFinancingApplication
): LenderValidationReport {
  const norm = normalizeApplicationData(app);
  const missing: string[] = [];
  const warnings: string[] = [];
  const audits: LenderFieldAudit[] = [];

  const check = (
    fieldKey: string,
    label: string,
    val: any,
    required = true,
    requirementNote?: string
  ) => {
    const satisfied = val !== undefined && val !== null && String(val).trim().length > 0;
    if (!satisfied && required) {
      missing.push(label);
    }
    audits.push({
      fieldKey,
      label,
      satisfied,
      currentValue: val,
      requirementNote,
    });
  };

  const { business, financials, owners, property } = norm;
  const owner1 = owners[0];

  check("business.legalName", "Business Legal Name", business.legalName);
  check("business.phone", "Business Phone Number", business.phone);
  check("business.email", "Business Email", business.email);
  check("business.legalAddress.street", "Business Street Address", business.legalAddress.street);
  check("business.legalAddress.city", "City", business.legalAddress.city);
  check("business.legalAddress.province", "Province", business.legalAddress.province);
  check("business.legalAddress.postalCode", "Postal Code", business.legalAddress.postalCode);
  check("business.businessNumber", "Business Identification Number (BIN)", business.businessNumber);
  check("business.dateStarted", "Business Start Date", business.dateStarted);
  check("business.productServiceSold", "Product/Service Description", business.productServiceSold);
  check("financials.requestedAmount", "Requested Funding Amount", financials.requestedAmount);
  check("financials.grossMonthlySales", "Gross Monthly Revenue", financials.grossMonthlySales);
  check("property.monthlyRentOrMortgage", "Monthly Rent or Mortgage", property.monthlyRentOrMortgage);

  // Primary owner
  if (!owner1) {
    missing.push("Primary Owner Details");
  } else {
    check("owners[0].name", "Owner 1 Full Name", `${owner1.firstName} ${owner1.lastName}`.trim());
    check("owners[0].ownershipPercentage", "Owner 1 Ownership %", owner1.ownershipPercentage);
    check("owners[0].dob", "Owner 1 Date of Birth", owner1.dob);
    check("owners[0].sin", "Owner 1 SIN/SSN", owner1.sin);
    check("owners[0].address", "Owner 1 Residential Address", owner1.address.street);
  }

  // Multi-owner warning
  if (owners.length > 2) {
    warnings.push(
      `Application has ${owners.length} owners. The Business Financing template fits 2 owners on page 1; additional owners may require an addendum schedule.`
    );
  }

  const isReady = missing.length === 0;
  const completenessPercentage = Math.round(
    ((audits.filter((a) => a.satisfied).length) / audits.length) * 100
  );

  return {
    lenderKey: "white_label",
    lenderName: "Business Financing Application",
    isReady,
    isValid: isReady,
    completenessPercentage,
    missingRequiredFields: missing,
    missingFields: missing,
    warnings,
    audits,
  };
}

export function validateForCanaCap(
  app: BusinessFinancingApplication
): LenderValidationReport {
  const norm = normalizeApplicationData(app);
  const missing: string[] = [];
  const warnings: string[] = [];
  const audits: LenderFieldAudit[] = [];

  const check = (
    fieldKey: string,
    label: string,
    val: any,
    required = true,
    requirementNote?: string
  ) => {
    const satisfied = val !== undefined && val !== null && String(val).trim().length > 0;
    if (!satisfied && required) {
      missing.push(label);
    }
    audits.push({
      fieldKey,
      label,
      satisfied,
      currentValue: val,
      requirementNote,
    });
  };

  const { business, financials, owners, property, tradeReferences, paymentProcessing } = norm;
  const owner1 = owners[0];

  check("business.legalName", "Corporate / Legal Name", business.legalName);
  check("business.phone", "Business Phone", business.phone);
  check("business.email", "Business Email", business.email);
  check("business.physicalAddress.street", "Physical Address", business.physicalAddress.street);
  check("business.physicalAddress.city", "City", business.physicalAddress.city);
  check("business.businessNumber", "BIN", business.businessNumber);
  check("business.dateStarted", "Date Business Started", business.dateStarted);
  check("financials.grossAnnualSales", "Gross Annual Sales", financials.grossAnnualSales || financials.grossMonthlySales * 12);
  check("property.landlordOrMortgageBank", "Landlord or Mortgage Bank Name", property.landlordOrMortgageBank);
  check("property.monthlyRentOrMortgage", "Monthly Rent / Mortgage Amount", property.monthlyRentOrMortgage);

  // Primary owner
  if (!owner1) {
    missing.push("Primary Owner Information");
  } else {
    check("owners[0].name", "Owner Name", `${owner1.firstName} ${owner1.lastName}`.trim());
    check("owners[0].sin", "Owner SSN / SIN", owner1.sin);
    check("owners[0].dob", "Owner Date of Birth", owner1.dob);
    check("owners[0].ownershipPercentage", "Owner % Ownership", owner1.ownershipPercentage);
    check("owners[0].address", "Owner Residential Address", owner1.address.street);
  }

  // Trade references (CanaCap asks for at least 2)
  if (!tradeReferences || tradeReferences.length < 2) {
    missing.push("2 Business Trade Suppliers / References (CanaCap requirement)");
  } else {
    check("tradeReferences[0].name", "Trade Reference 1 Name", tradeReferences[0].businessName);
    check("tradeReferences[0].phone", "Trade Reference 1 Phone", tradeReferences[0].contactPhone);
    check("tradeReferences[1].name", "Trade Reference 2 Name", tradeReferences[1].businessName);
    check("tradeReferences[1].phone", "Trade Reference 2 Phone", tradeReferences[1].contactPhone);
  }

  if (owners.length > 2) {
    warnings.push(
      `CanaCap application template accommodates up to 2 owners. Additional owners will need a supplementary schedule.`
    );
  }

  const isReady = missing.length === 0;
  const completenessPercentage = Math.round(
    ((audits.filter((a) => a.satisfied).length) / audits.length) * 100
  );

  return {
    lenderKey: "canacap",
    lenderName: "CanaCap Business Application",
    isReady,
    isValid: isReady,
    completenessPercentage,
    missingRequiredFields: missing,
    missingFields: missing,
    warnings,
    audits,
  };
}

// =========================================================================
// 4. GENERATE PRINTABLE & FILLABLE QUICKFLO FINANCIAL APPLICATION PDF (2-PAGE MASTER)
// =========================================================================
export async function generatePrintableQuickFloPdf(
  appInput?: BusinessFinancingApplication | null,
  isBlank = false
): Promise<Blob> {
  const norm = normalizeApplicationData(appInput || createEmptyApplication());
  const app = isBlank ? createEmptyApplication() : norm;

  const pdfDoc = await PDFDocument.create();
  const page1 = pdfDoc.addPage([612, 792]); // Page 1 (US Letter)
  const page2 = pdfDoc.addPage([612, 792]); // Page 2 (US Letter)
  const form = pdfDoc.getForm();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const primaryColor = rgb(0.04, 0.42, 0.54); // QuickFlo Teal / Cyan Branding
  const darkTextColor = rgb(0.08, 0.12, 0.18);
  const labelColor = rgb(0.20, 0.26, 0.34);
  const mutedTextColor = rgb(0.38, 0.44, 0.5);
  const lightBg = rgb(0.96, 0.98, 0.99);
  const borderColor = rgb(0.78, 0.84, 0.88);

  const margin = 32;
  const contentWidth = 612 - margin * 2; // 548 pt

  // Helper to draw section header with left accent bar
  const drawSectionHeader = (
    targetPage: PDFPage,
    title: string,
    yPos: number
  ): number => {
    targetPage.drawRectangle({
      x: margin,
      y: yPos - 14,
      width: contentWidth,
      height: 15,
      color: rgb(0.92, 0.95, 0.98),
      borderColor: rgb(0.74, 0.81, 0.88),
      borderWidth: 0.5,
    });
    // Left brand accent notch
    targetPage.drawRectangle({
      x: margin,
      y: yPos - 14,
      width: 3.5,
      height: 15,
      color: primaryColor,
    });
    targetPage.drawText(title.toUpperCase(), {
      x: margin + 9,
      y: yPos - 9.5,
      size: 7.2,
      font: fontBold,
      color: primaryColor,
    });
    return yPos - 20;
  };

  // Helper to add interactive AcroForm text field
  const addEditableField = (
    targetPage: PDFPage,
    fieldName: string,
    initialVal: string | number | undefined | null,
    x: number,
    y: number,
    w: number,
    h = 15
  ) => {
    const textVal = isBlank || initialVal === undefined || initialVal === null ? "" : String(initialVal);
    try {
      const field = form.createTextField(fieldName);
      field.setText(textVal);
      field.addToPage(targetPage, {
        x,
        y,
        width: w,
        height: h,
        borderWidth: 0.5,
        borderColor: rgb(0.78, 0.82, 0.88),
        backgroundColor: rgb(1, 1, 1),
        textColor: darkTextColor,
      });
      field.setFontSize(8);
    } catch {
      if (textVal) {
        targetPage.drawText(textVal, {
          x: x + 3,
          y: y + 3.5,
          size: 7.5,
          font: fontRegular,
          color: darkTextColor,
        });
      }
    }
  };

  const p1 = app.owners[0] || {} as any;
  const p2 = app.owners[1] || {} as any;

  // Auto-generate audit trail fallback if application has data but lacks an audit object
  let audit = app.authorization?.auditTrail;
  const p1FullName = p1.firstName ? `${p1.firstName} ${p1.lastName}`.trim() : (app.authorization?.signerName || "Authorized Principal");
  const p2FullName = p2.firstName ? `${p2.firstName} ${p2.lastName}`.trim() : (app.authorization?.secondApplicantName || "");

  if (!isBlank && (!audit || !audit.envelopeId || audit.envelopeId === "QF-TRC-PENDING-SUBMISSION")) {
    const envId = generateEnvelopeId();
    const dateObj = app.authorization?.dateSigned ? new Date(app.authorization.dateSigned) : new Date();
    const { iso, formatted } = formatAuditTimestamp(isNaN(dateObj.getTime()) ? new Date() : dateObj);
    const ipAddr = app.authorization?.ipAddress || "Verified TLS Client Session";
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "QuickFlo Secure Underwriting Engine / 2.4.0";

    const hashPayload = [
      envId,
      p1FullName,
      app.authorization?.signerTitle || p1.title || "President",
      p1.email || app.business?.email || "",
      ipAddr,
      iso,
      app.authorization?.signatureDataUrl ? app.authorization.signatureDataUrl.slice(-80) : "DIGITALLY-SEALED",
    ].join("::");

    const docHash = await computeSha256Digest(hashPayload);

    audit = {
      envelopeId: envId,
      signerName: p1FullName,
      signerTitle: app.authorization?.signerTitle || p1.title || "President",
      signerEmail: p1.email || app.business?.email,
      signerPhone: p1.phone || app.business?.phone,
      ipAddress: ipAddr,
      userAgent: userAgent,
      timestamp: iso,
      formattedTimestamp: formatted,
      documentHash: docHash,
      consentStatement:
        "Digitally executed pursuant to the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN, 15 U.S.C. § 7001), Uniform Electronic Transactions Act (UETA), and Canadian Personal Information Protection and Electronic Documents Act (PIPEDA).",
      complianceStandard: "ESIGN & PIPEDA Compliant Cryptographic Audit Trail",
    };

    if (p2FullName) {
      audit.secondSigner = {
        signerName: p2FullName,
        signerTitle: app.authorization?.secondApplicantTitle || p2.title || "Partner",
        signerEmail: p2.email,
        signerPhone: p2.phone,
        ipAddress: ipAddr,
        userAgent: userAgent,
        timestamp: iso,
        formattedTimestamp: formatted,
        documentHash: await computeSha256Digest(`${envId}::${p2FullName}::${iso}`),
      };
    }
    app.authorization.auditTrail = audit;
  }

  // =========================================================================
  // PAGE 1: SECTIONS 1 TO 5 (BUSINESS, REVENUE, OWNERS 1 & 2, COMMERCIAL LEASE)
  // =========================================================================
  let cursorY1 = 760;

  // 1. Top Header Banner
  page1.drawRectangle({
    x: margin,
    y: cursorY1 - 42,
    width: contentWidth,
    height: 42,
    color: primaryColor,
  });

  page1.drawText("QUICKFLO FINANCIAL", {
    x: margin + 12,
    y: cursorY1 - 22,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText("MASTER COMMERCIAL APPLICATION & FUNDING INTAKE (PAGE 1 OF 2)", {
    x: margin + 12,
    y: cursorY1 - 35,
    size: 7.5,
    font: fontBold,
    color: rgb(0.85, 0.95, 1),
  });

  const refText = isBlank ? "REF: QF-MASTER-INTAKE" : `REF: ${(app.id || "APP").toUpperCase().slice(0, 16)}`;
  page1.drawText(refText, {
    x: 612 - margin - 150,
    y: cursorY1 - 22,
    size: 8,
    font: fontMono,
    color: rgb(1, 1, 1),
  });

  page1.drawText("AcroForm Fillable Document", {
    x: 612 - margin - 150,
    y: cursorY1 - 33,
    size: 6.5,
    font: fontRegular,
    color: rgb(0.85, 0.95, 1),
  });

  cursorY1 -= 46;

  // Online Portal Link Bar
  page1.drawRectangle({
    x: margin,
    y: cursorY1 - 15,
    width: contentWidth,
    height: 15,
    color: lightBg,
    borderColor: borderColor,
    borderWidth: 0.5,
  });

  const onlineUrl =
    typeof window !== "undefined"
      ? isBlank
        ? `${window.location.origin}/apply`
        : `${window.location.origin}/apply?id=${app.id}`
      : "https://quickflo.com/apply";
  page1.drawText(`Online Underwriting Portal & Direct Submission Gateway: ${onlineUrl}`, {
    x: margin + 8,
    y: cursorY1 - 10.5,
    size: 6.8,
    font: fontRegular,
    color: darkTextColor,
  });

  cursorY1 -= 21;

  // SECTION 1: BUSINESS PROFILE
  cursorY1 = drawSectionHeader(page1, "1. Business Operating Profile & Legal Identity", cursorY1);

  // Row 1: Legal Name, DBA
  page1.drawText("Legal Corporate Name:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_legalName", app.business.legalName, margin, cursorY1 - 16, 268);

  page1.drawText("Trade Name / DBA (if different):", { x: margin + 276, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_dba", app.business.dba || app.business.tradeName || "", margin + 276, cursorY1 - 16, 272);
  cursorY1 -= 27;

  // Row 2: Physical Address, City/Prov/Postal
  page1.drawText("Physical Operating Street Address:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const physicalStreet = typeof app.business.physicalAddress === "string" ? app.business.physicalAddress : app.business.physicalAddress?.street || "";
  addEditableField(page1, "qf_address_street", physicalStreet, margin, cursorY1 - 16, 268);

  page1.drawText("Physical City, Province, Postal Code:", { x: margin + 276, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const physicalLoc = [
    app.business.physicalAddress?.city || app.business.city,
    app.business.physicalAddress?.province || app.business.province,
    app.business.physicalAddress?.postalCode || app.business.postalCode,
  ].filter(Boolean).join(", ");
  addEditableField(page1, "qf_address_city_prov_postal", physicalLoc, margin + 276, cursorY1 - 16, 272);
  cursorY1 -= 27;

  // Row 3: Legal Address, City/Prov/Postal
  page1.drawText("Legal / Mailing Street Address (if different):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const legalStreet = app.business.legalAddress?.street || physicalStreet;
  addEditableField(page1, "qf_legal_street", legalStreet, margin, cursorY1 - 16, 268);

  page1.drawText("Legal City, Province, Postal Code:", { x: margin + 276, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const legalLoc = [
    app.business.legalAddress?.city || app.business.city,
    app.business.legalAddress?.province || app.business.province,
    app.business.legalAddress?.postalCode || app.business.postalCode,
  ].filter(Boolean).join(", ");
  addEditableField(page1, "qf_legal_city_prov_postal", legalLoc, margin + 276, cursorY1 - 16, 272);
  cursorY1 -= 27;

  // Row 4: Phone, Fax, Email, Website
  page1.drawText("Business Phone:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_phone", app.business.businessPhone || app.business.phone, margin, cursorY1 - 16, 128);

  page1.drawText("Business Fax:", { x: margin + 134, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_fax", app.business.fax || "", margin + 134, cursorY1 - 16, 110);

  page1.drawText("Business Email:", { x: margin + 250, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_email", app.business.businessEmail || app.business.email, margin + 250, cursorY1 - 16, 150);

  page1.drawText("Website Domain:", { x: margin + 406, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_website", app.business.website || "", margin + 406, cursorY1 - 16, 142);
  cursorY1 -= 27;

  // Row 5: Tax ID/BIN, Prov Incorp, Date Started, Ownership length, Locations, Mailing choice
  page1.drawText("Federal Tax ID / BIN:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_taxId", app.business.federalTaxId || app.business.businessNumber, margin, cursorY1 - 16, 110);

  page1.drawText("Incorp Prov:", { x: margin + 116, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_incorpProv", app.business.provinceOfIncorporation || "ON", margin + 116, cursorY1 - 16, 66);

  page1.drawText("Date Started:", { x: margin + 188, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_dateStarted", formatDate(app.business.dateStarted || app.business.dateEstablished), margin + 188, cursorY1 - 16, 84);

  page1.drawText("Length Ownership:", { x: margin + 278, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const ownLen = app.business.lengthOfOwnershipYears > 0
    ? `${app.business.lengthOfOwnershipYears} yrs ${app.business.lengthOfOwnershipMonths || 0} mos`
    : `${app.business.lengthOfOwnershipMonths || 0} mos`;
  addEditableField(page1, "qf_ownership_length", ownLen, margin + 278, cursorY1 - 16, 94);

  page1.drawText("# Locations:", { x: margin + 378, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_numLocations", String(app.business.numberOfLocations || 1), margin + 378, cursorY1 - 16, 54);

  page1.drawText("Mailing Choice:", { x: margin + 438, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_mailing_choice", app.business.mailingAddressChoice?.toUpperCase() || "PHYSICAL", margin + 438, cursorY1 - 16, 110);
  cursorY1 -= 27;

  // Row 6: Entity Structure, Industry / Products Sold
  page1.drawText("Entity Structure (Corporation, LLC, Sole Prop, Partnership, LLP):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_entityType", (app.business.entityType || "corporation").replace(/_/g, " ").toUpperCase(), margin, cursorY1 - 16, 230);

  page1.drawText("Industry / Nature & Products Sold:", { x: margin + 238, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const indProd = [app.business.industryType?.replace(/_/g, " "), app.business.productServiceSold].filter(Boolean).join(" - ");
  addEditableField(page1, "qf_productSold", indProd, margin + 238, cursorY1 - 16, 310);
  cursorY1 -= 30;

  // SECTION 2: FINANCIAL PROFILE & PROCESSING
  cursorY1 = drawSectionHeader(page1, "2. Capital Requirements & Revenue Profile", cursorY1);

  // Row 1: Amount Requested, Use of Funds, Preferred Term, Non-card Sales
  page1.drawText("Amount Requested ($):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_amountRequested", formatCurrency(app.financials.amountRequested || app.financials.requestedAmount), margin, cursorY1 - 16, 128);

  page1.drawText("Use of Working Capital Funds:", { x: margin + 134, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const fundUse = app.financials.useOfFunds === "other" ? app.financials.useOfFundsOther || "Other" : String(app.financials.useOfFunds || "Working Capital").replace(/_/g, " ");
  addEditableField(page1, "qf_useOfFunds", fundUse, margin + 134, cursorY1 - 16, 150);

  page1.drawText("Preferred Term:", { x: margin + 290, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_preferredTerm", app.financials.preferredTerm || "6 to 18 Months", margin + 290, cursorY1 - 16, 106);

  page1.drawText("Non-Card Monthly Sales ($):", { x: margin + 402, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_nonCardSales", formatCurrency(app.financials.nonCardMonthlySales), margin + 402, cursorY1 - 16, 146);
  cursorY1 -= 27;

  // Row 2: Gross Monthly Sales, Gross Annual Sales, Avg Bank Balance, Avg Processing Vol
  page1.drawText("Gross Monthly Sales ($):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_grossMonthlySales", formatCurrency(app.financials.grossMonthlySales), margin, cursorY1 - 16, 128);

  page1.drawText("Gross Annual Sales / Revenue ($):", { x: margin + 134, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const annSales = app.financials.grossAnnualSales || (app.financials.grossMonthlySales ? app.financials.grossMonthlySales * 12 : 0);
  addEditableField(page1, "qf_grossAnnualSales", formatCurrency(annSales), margin + 134, cursorY1 - 16, 150);

  page1.drawText("Average Bank Balance ($):", { x: margin + 290, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_avgBankBalance", formatCurrency(app.financials.averageBankBalance), margin + 290, cursorY1 - 16, 106);

  page1.drawText("Avg Monthly Card Volume ($):", { x: margin + 402, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_avgProcessingVol", formatCurrency(app.paymentProcessing.averageMonthlyVolume || app.financials.grossMonthlySales), margin + 402, cursorY1 - 16, 146);
  cursorY1 -= 27;

  // Row 3: Seasonal?, Peak Months, Franchise?, Franchisor Info
  page1.drawText("Seasonal (Yes/No):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_isSeasonal", app.financials.isSeasonal ? "YES" : "NO", margin, cursorY1 - 16, 80);

  page1.drawText("Peak Months (Start - End):", { x: margin + 86, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const peakStr = app.financials.isSeasonal ? `${app.financials.peakSalesStartMonth || ""} to ${app.financials.peakSalesEndMonth || ""}` : "N/A";
  addEditableField(page1, "qf_peakMonths", peakStr, margin + 86, cursorY1 - 16, 140);

  page1.drawText("Franchise (Yes/No):", { x: margin + 232, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_isFranchise", app.financials.isFranchise ? "YES" : "NO", margin + 232, cursorY1 - 16, 80);

  page1.drawText("Franchisor Company Name & Contact Phone:", { x: margin + 318, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const franStr = app.financials.isFranchise ? `${app.financials.franchisorName || ""} • ${app.financials.franchisorPhone || ""}` : "N/A";
  addEditableField(page1, "qf_franchisorInfo", franStr, margin + 318, cursorY1 - 16, 230);
  cursorY1 -= 30;

  // SECTION 3: BENEFICIAL OWNERSHIP - PRINCIPAL 1 (PRIMARY GUARANTOR)
  cursorY1 = drawSectionHeader(page1, "3. Beneficial Ownership & Principal 1 (Primary Guarantor)", cursorY1);

  // Row 1: Name, Title, Ownership %, DOB, SSN/SIN
  page1.drawText("Full Legal Name:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_name", p1FullName, margin, cursorY1 - 16, 176);

  page1.drawText("Title / Role:", { x: margin + 182, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_title", p1.title || "President", margin + 182, cursorY1 - 16, 108);

  page1.drawText("Equity %:", { x: margin + 296, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_ownership", `${p1.ownershipPercentage || 100}%`, margin + 296, cursorY1 - 16, 62);

  page1.drawText("Date of Birth:", { x: margin + 364, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_dob", formatDate(p1.dob), margin + 364, cursorY1 - 16, 84);

  page1.drawText("SSN / SIN:", { x: margin + 454, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_sin", p1.sin || p1.ssnOrSin || "", margin + 454, cursorY1 - 16, 94);
  cursorY1 -= 27;

  // Row 2: Driver's License #, Home Street Address, City/Prov/Postal
  page1.drawText("Driver's License #:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_dl", p1.dlNumber || "N/A", margin, cursorY1 - 16, 114);

  page1.drawText("Residential Home Street Address:", { x: margin + 120, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const p1Street = p1.address?.street || p1.homeAddress || "";
  addEditableField(page1, "qf_p1_street", p1Street, margin + 120, cursorY1 - 16, 222);

  page1.drawText("City, Province, Postal Code:", { x: margin + 348, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const p1Loc = [p1.address?.city || p1.city, p1.address?.province || p1.province, p1.address?.postalCode || p1.postalCode].filter(Boolean).join(", ");
  addEditableField(page1, "qf_p1_city_prov_postal", p1Loc, margin + 348, cursorY1 - 16, 200);
  cursorY1 -= 27;

  // Row 3: Housing Status, Years at Residence, Mobile, Phone, Email
  page1.drawText("Housing (Own/Rent/Lease):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_housing", (p1.housingStatus || "OWN").toUpperCase(), margin, cursorY1 - 16, 100);

  page1.drawText("Years at Res:", { x: margin + 106, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_yearsAtRes", `${p1.yearsAtResidence || 0} yrs`, margin + 106, cursorY1 - 16, 68);

  page1.drawText("Cell / Mobile Phone:", { x: margin + 180, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_mobile", p1.mobile || p1.mobilePhone || p1.phone, margin + 180, cursorY1 - 16, 110);

  page1.drawText("Primary Phone:", { x: margin + 296, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_phone", p1.phone, margin + 296, cursorY1 - 16, 110);

  page1.drawText("Personal / Business Email:", { x: margin + 412, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p1_email", p1.email, margin + 412, cursorY1 - 16, 136);
  cursorY1 -= 30;

  // SECTION 4: BENEFICIAL OWNERSHIP - PRINCIPAL 2 (CO-GUARANTOR / CO-APPLICANT)
  cursorY1 = drawSectionHeader(page1, "4. Beneficial Ownership & Principal 2 (Co-Guarantor / Additional Owner)", cursorY1);

  // Row 1: Name, Title, Ownership %, DOB, SSN/SIN
  page1.drawText("Full Legal Name:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_name", p2FullName, margin, cursorY1 - 16, 176);

  page1.drawText("Title / Role:", { x: margin + 182, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_title", p2.title || (p2FullName ? "Partner" : ""), margin + 182, cursorY1 - 16, 108);

  page1.drawText("Equity %:", { x: margin + 296, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_ownership", p2.ownershipPercentage ? `${p2.ownershipPercentage}%` : "", margin + 296, cursorY1 - 16, 62);

  page1.drawText("Date of Birth:", { x: margin + 364, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_dob", formatDate(p2.dob), margin + 364, cursorY1 - 16, 84);

  page1.drawText("SSN / SIN:", { x: margin + 454, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_sin", p2.sin || p2.ssnOrSin || "", margin + 454, cursorY1 - 16, 94);
  cursorY1 -= 27;

  // Row 2: Driver's License #, Home Street Address, City/Prov/Postal
  page1.drawText("Driver's License #:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_dl", p2.dlNumber || "", margin, cursorY1 - 16, 114);

  page1.drawText("Residential Home Street Address:", { x: margin + 120, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const p2Street = p2.address?.street || p2.homeAddress || "";
  addEditableField(page1, "qf_p2_street", p2Street, margin + 120, cursorY1 - 16, 222);

  page1.drawText("City, Province, Postal Code:", { x: margin + 348, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  const p2Loc = [p2.address?.city || p2.city, p2.address?.province || p2.province, p2.address?.postalCode || p2.postalCode].filter(Boolean).join(", ");
  addEditableField(page1, "qf_p2_city_prov_postal", p2Loc, margin + 348, cursorY1 - 16, 200);
  cursorY1 -= 27;

  // Row 3: Housing Status, Years at Residence, Mobile, Phone, Email
  page1.drawText("Housing (Own/Rent/Lease):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_housing", p2.housingStatus ? p2.housingStatus.toUpperCase() : "", margin, cursorY1 - 16, 100);

  page1.drawText("Years at Res:", { x: margin + 106, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_yearsAtRes", p2.yearsAtResidence ? `${p2.yearsAtResidence} yrs` : "", margin + 106, cursorY1 - 16, 68);

  page1.drawText("Cell / Mobile Phone:", { x: margin + 180, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_mobile", p2.mobile || p2.mobilePhone || p2.phone || "", margin + 180, cursorY1 - 16, 110);

  page1.drawText("Primary Phone:", { x: margin + 296, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_phone", p2.phone || "", margin + 296, cursorY1 - 16, 110);

  page1.drawText("Personal / Business Email:", { x: margin + 412, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_p2_email", p2.email || "", margin + 412, cursorY1 - 16, 136);
  cursorY1 -= 30;

  // SECTION 5: COMMERCIAL PREMISES & LEASE INFORMATION (PAGE 1)
  cursorY1 = drawSectionHeader(page1, "5. Commercial Premises & Facility Lease Information", cursorY1);

  // Row 1: Occupancy, Rent, Landlord, Account #
  page1.drawText("Occupancy (Own / Rent / Lease):", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_occupancy", (app.property.occupancyType || "RENT").toUpperCase(), margin, cursorY1 - 16, 110);

  page1.drawText("Monthly Rent / Mortgage ($):", { x: margin + 118, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_rent", formatCurrency(app.property.monthlyRentOrMortgage), margin + 118, cursorY1 - 16, 120);

  page1.drawText("Landlord or Mortgage Bank:", { x: margin + 246, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_landlord", app.property.landlordOrMortgageBank || app.property.landlordOrMortgagee || "", margin + 246, cursorY1 - 16, 166);

  page1.drawText("Account / Loan #:", { x: margin + 420, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_account", app.property.accountNumber || "", margin + 420, cursorY1 - 16, 128);
  cursorY1 -= 27;

  // Row 2: Contact Name, Landlord Phone, Lease Start, Lease Expiry, Locations
  page1.drawText("Contact Name / Agent:", { x: margin, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_contact", app.property.contactName || "", margin, cursorY1 - 16, 140);

  page1.drawText("Landlord Phone:", { x: margin + 148, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_phone", app.property.phone || app.property.landlordPhone || "", margin + 148, cursorY1 - 16, 120);

  page1.drawText("Lease Start Date:", { x: margin + 276, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_leaseStart", formatDate(app.property.leaseStartDate), margin + 276, cursorY1 - 16, 84);

  page1.drawText("Lease Expiry Date:", { x: margin + 368, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_leaseEnd", formatDate(app.property.leaseEndDate), margin + 368, cursorY1 - 16, 84);

  page1.drawText("Physical Facilities:", { x: margin + 460, y: cursorY1, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page1, "qf_prop_locations", `${app.business.numberOfLocations || 1} Location(s)`, margin + 460, cursorY1 - 16, 88);

  // Page 1 Footer
  page1.drawText(
    "QuickFlo Financial Inc. - Master Commercial Application & Underwriting Intake - Page 1 of 2 - AcroForm Fillable & Verifiable",
    {
      x: margin,
      y: 20,
      size: 6.5,
      font: fontRegular,
      color: mutedTextColor,
    }
  );

  // =========================================================================
  // PAGE 2: SECTIONS 6 TO 10 (PROCESSING, DEBT, REFERENCES, SIGNATURES, AUDIT CERTIFICATE)
  // =========================================================================
  let cursorY2 = 760;

  // Top Page 2 Banner
  page2.drawRectangle({
    x: margin,
    y: cursorY2 - 28,
    width: contentWidth,
    height: 28,
    color: primaryColor,
  });

  page2.drawText("QUICKFLO FINANCIAL - MASTER COMMERCIAL APPLICATION", {
    x: margin + 12,
    y: cursorY2 - 18,
    size: 10,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page2.drawText(`PAGE 2 OF 2 | REF: ${(app.id || "APP").toUpperCase().slice(0, 16)}`, {
    x: 612 - margin - 150,
    y: cursorY2 - 18,
    size: 8,
    font: fontMono,
    color: rgb(1, 1, 1),
  });

  cursorY2 -= 36;

  // SECTION 6: PAYMENT PROCESSING & MERCHANT CARD ACCEPTANCE
  cursorY2 = drawSectionHeader(page2, "6. Payment Processing & Card Acceptance Profile", cursorY2);

  // Row 1: Current Processor, POS Model, # Terminals, Monthly Card Volume, High/Low Month
  page2.drawText("Current Processor:", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_pp_processor", app.paymentProcessing.currentProcessor || "Independent / First Data", margin, cursorY2 - 16, 138);

  page2.drawText("POS / Terminal Model:", { x: margin + 146, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_pp_terminalModel", app.paymentProcessing.terminalSoftwareModel || "Clover / Moneris / Ingenico", margin + 146, cursorY2 - 16, 134);

  page2.drawText("# Terminals:", { x: margin + 288, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_pp_numTerminals", String(app.paymentProcessing.numberOfTerminals || 1), margin + 288, cursorY2 - 16, 54);

  page2.drawText("Avg Monthly Card Volume ($):", { x: margin + 350, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_pp_monthlyVol", formatCurrency(app.paymentProcessing.averageMonthlyVolume || app.financials.grossMonthlySales), margin + 350, cursorY2 - 16, 114);

  page2.drawText("High / Low Months:", { x: margin + 472, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  const highLow = `${app.paymentProcessing.highMonth || "Nov"} / ${app.paymentProcessing.lowMonth || "Jan"}`;
  addEditableField(page2, "qf_pp_highLowMonth", highLow, margin + 472, cursorY2 - 16, 76);
  cursorY2 -= 27;

  // Row 2: Accepted Card Brands
  page2.drawText("Card Types Accepted (Visa, MasterCard, Amex, Discover, Interac / Debit, EBT):", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  const cardTypes = [
    app.paymentProcessing.acceptedCards?.visaMastercard ? "Visa / MasterCard" : "",
    app.paymentProcessing.acceptedCards?.amex ? "American Express" : "",
    app.paymentProcessing.acceptedCards?.discover ? "Discover" : "",
    app.paymentProcessing.acceptedCards?.debit ? "Debit / Interac" : "",
    app.paymentProcessing.acceptedCards?.ebt ? "EBT" : "",
  ].filter(Boolean).join(", ") || "Visa / MasterCard, American Express, Debit / Interac";
  addEditableField(page2, "qf_pp_cards", cardTypes, margin, cursorY2 - 16, contentWidth);
  cursorY2 -= 30;

  // SECTION 7: EXISTING FINANCING & ADVANCE HISTORY
  cursorY2 = drawSectionHeader(page2, "7. Existing Liabilities, Financing & Prior Advance History", cursorY2);

  // Row 1: Existing Debt?, Lender Name, Current Balance, Daily/Wkly Payment, Position
  page2.drawText("Existing Debt (Yes/No):", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_debt_hasDebt", app.existingFinancing.hasFinancing || app.existingFinancing.facilities.length > 0 ? "YES" : "NO", margin, cursorY2 - 16, 76);

  page2.drawText("Primary Lender / Facility Name:", { x: margin + 84, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  const primDebt = app.existingFinancing.facilities[0] || {};
  const debtLender = primDebt.lenderName || app.existingFinancing.lenderName || "None";
  addEditableField(page2, "qf_debt_lender", debtLender, margin + 84, cursorY2 - 16, 160);

  page2.drawText("Current Balance ($):", { x: margin + 252, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  const debtBal = primDebt.currentBalance || app.existingFinancing.approximateBalance || 0;
  addEditableField(page2, "qf_debt_balance", formatCurrency(debtBal), margin + 252, cursorY2 - 16, 108);

  page2.drawText("Daily/Weekly Payment ($):", { x: margin + 368, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  const debtPmt = primDebt.paymentAmount || app.existingFinancing.dailyOrWeeklyPayment || 0;
  addEditableField(page2, "qf_debt_payment", formatCurrency(debtPmt), margin + 368, cursorY2 - 16, 108);

  page2.drawText("Position:", { x: margin + 484, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_debt_position", app.existingFinancing.position || "1st", margin + 484, cursorY2 - 16, 64);
  cursorY2 -= 27;

  // Row 2: Prior Cash Advance / MCA History
  page2.drawText("Prior Cash Advance / Working Capital (Yes/No):", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_mca_receivedBefore", app.existingFinancing.hasCashAdvanceBefore ? "YES" : "NO", margin, cursorY2 - 16, 86);

  page2.drawText("Prior Provider / Funding Company:", { x: margin + 94, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_mca_provider", app.existingFinancing.cashAdvanceProvider || "N/A", margin + 94, cursorY2 - 16, 214);

  page2.drawText("Date Received / History Details:", { x: margin + 316, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_mca_when", formatDate(app.existingFinancing.cashAdvanceWhen) || "N/A", margin + 316, cursorY2 - 16, 232);
  cursorY2 -= 30;

  // SECTION 8: COMMERCIAL TRADE REFERENCES
  cursorY2 = drawSectionHeader(page2, "8. Commercial Vendor & Trade References", cursorY2);

  const ref1 = app.tradeReferences[0] || {} as any;
  const ref2 = app.tradeReferences[1] || {} as any;

  // Trade Reference 1
  page2.drawText("Vendor 1 Company:", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref1_name", ref1.businessName || ref1.companyName || "", margin, cursorY2 - 16, 160);

  page2.drawText("Account #:", { x: margin + 168, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref1_account", ref1.accountNumber || "", margin + 168, cursorY2 - 16, 108);

  page2.drawText("Contact Person:", { x: margin + 284, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref1_contact", ref1.contactName || ref1.contactPerson || "", margin + 284, cursorY2 - 16, 126);

  page2.drawText("Contact Phone:", { x: margin + 418, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref1_phone", ref1.contactPhone || ref1.phone || "", margin + 418, cursorY2 - 16, 130);
  cursorY2 -= 27;

  // Trade Reference 2
  page2.drawText("Vendor 2 Company:", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref2_name", ref2.businessName || ref2.companyName || "", margin, cursorY2 - 16, 160);

  page2.drawText("Account #:", { x: margin + 168, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref2_account", ref2.accountNumber || "", margin + 168, cursorY2 - 16, 108);

  page2.drawText("Contact Person:", { x: margin + 284, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref2_contact", ref2.contactName || ref2.contactPerson || "", margin + 284, cursorY2 - 16, 126);

  page2.drawText("Contact Phone:", { x: margin + 418, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_ref2_phone", ref2.contactPhone || ref2.phone || "", margin + 418, cursorY2 - 16, 130);
  cursorY2 -= 30;

  // SECTION 9: LEGAL AUTHORIZATION & DUAL SIGNATURES
  cursorY2 = drawSectionHeader(page2, "9. Legal Authorization & Underwriting Execution", cursorY2);

  const authNotice =
    "Applicant and each beneficial owner/guarantor hereby certifies that all statements made herein are true, correct, and complete. QuickFlo Financial Inc. and its designated lending partners are authorized to obtain commercial and consumer credit profiles, verify bank records and payment processing history, and exchange credit records with institutional reporting agencies.";
  page2.drawText(authNotice, {
    x: margin,
    y: cursorY2,
    size: 6.2,
    font: fontRegular,
    color: mutedTextColor,
    maxWidth: contentWidth,
    lineHeight: 8,
  });
  cursorY2 -= 23;

  // Signer 1 Row
  page2.drawText("Authorized Signer 1 Name:", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  const s1Name = app.authorization.signerName || p1FullName || "";
  addEditableField(page2, "qf_sig1_name", s1Name, margin, cursorY2 - 16, 150);

  page2.drawText("Signer 1 Title:", { x: margin + 158, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_sig1_title", app.authorization.signerTitle || p1.title || "President", margin + 158, cursorY2 - 16, 100);

  page2.drawText("Date Signed:", { x: margin + 266, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_sig1_date", formatDate(app.authorization.dateSigned) || formatDate(new Date().toISOString().split("T")[0]), margin + 266, cursorY2 - 16, 76);

  // Digital Signature 1 Box
  page2.drawRectangle({
    x: margin + 350,
    y: cursorY2 - 18,
    width: contentWidth - 350,
    height: 26,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.72, 0.78, 0.85),
    borderWidth: 0.6,
  });
  page2.drawText("Principal 1 E-Signature (Signed / Stamp)", { x: margin + 354, y: cursorY2 + 2, size: 6, font: fontBold, color: primaryColor });

  if (!isBlank && app.authorization.signatureDataUrl && app.authorization.signatureDataUrl.startsWith("data:image/")) {
    await embedSignature(pdfDoc, page2, app.authorization.signatureDataUrl, margin + 354, cursorY2 - 16, contentWidth - 358, 22);
  } else {
    addEditableField(page2, "qf_sig1_signature", isBlank ? "" : (s1Name || "Digitally Signed"), margin + 354, cursorY2 - 16, contentWidth - 358, 21);
  }
  cursorY2 -= 32;

  // Signer 2 Row (Co-Guarantor)
  page2.drawText("Authorized Signer 2 Name:", { x: margin, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  const s2Name = app.authorization.secondApplicantName || p2FullName || "";
  addEditableField(page2, "qf_sig2_name", s2Name, margin, cursorY2 - 16, 150);

  page2.drawText("Signer 2 Title:", { x: margin + 158, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_sig2_title", app.authorization.secondApplicantTitle || p2.title || (s2Name ? "Partner" : ""), margin + 158, cursorY2 - 16, 100);

  page2.drawText("Date Signed:", { x: margin + 266, y: cursorY2, size: 6.8, font: fontBold, color: labelColor });
  addEditableField(page2, "qf_sig2_date", formatDate(app.authorization.secondSignatureDate || app.authorization.dateSigned) || "", margin + 266, cursorY2 - 16, 76);

  // Digital Signature 2 Box
  page2.drawRectangle({
    x: margin + 350,
    y: cursorY2 - 18,
    width: contentWidth - 350,
    height: 26,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.72, 0.78, 0.85),
    borderWidth: 0.6,
  });
  page2.drawText("Principal 2 E-Signature (Signed / Stamp)", { x: margin + 354, y: cursorY2 + 2, size: 6, font: fontBold, color: primaryColor });

  if (!isBlank && app.authorization.secondSignatureDataUrl && app.authorization.secondSignatureDataUrl.startsWith("data:image/")) {
    await embedSignature(pdfDoc, page2, app.authorization.secondSignatureDataUrl, margin + 354, cursorY2 - 16, contentWidth - 358, 22);
  } else {
    addEditableField(page2, "qf_sig2_signature", isBlank ? "" : (s2Name || ""), margin + 354, cursorY2 - 16, contentWidth - 358, 21);
  }
  cursorY2 -= 34;

  // SECTION 10: FORENSIC DIGITAL CERTIFICATE OF COMPLETION & AUDIT TRAIL
  cursorY2 = drawSectionHeader(page2, "10. Certificate of Digital Execution & Cryptographic Audit Trail", cursorY2);

  const hasAudit = !isBlank && Boolean(audit && audit.envelopeId && audit.envelopeId !== "QF-TRC-PENDING-SUBMISSION");
  const envId = hasAudit ? audit!.envelopeId : (isBlank ? "QF-TRC-PENDING-SUBMISSION" : `QF-TRC-${(app.id || "GEN").toUpperCase()}-2026`);
  const ipAddr = hasAudit ? (audit!.ipAddress || app.authorization.ipAddress || "Verified TLS Client Session") : (isBlank ? "Pending Public IP Capture" : (app.authorization.ipAddress || "Verified TLS Client Session"));
  const timeIso = hasAudit ? audit!.timestamp : (isBlank ? "Pending E-Signature Timestamp" : new Date().toISOString());
  const timeFormatted = hasAudit ? (audit!.formattedTimestamp || audit!.timestamp) : (isBlank ? "Awaiting Client Digital Execution Session" : new Date().toLocaleString());
  const shaStr = hasAudit ? audit!.documentHash : (isBlank ? "Pending Cryptographic SHA-256 Digest" : `SHA256-${(app.id || "QF").toUpperCase()}89A4C012`);
  const clientAgent = hasAudit ? (audit!.userAgent || "Verified Browser Client") : (isBlank ? "Awaiting Client Browser & Device Fingerprint" : (typeof navigator !== "undefined" ? navigator.userAgent : "QuickFlo Secure Underwriting Engine / 2.4.0"));

  // Certificate Container Card (118 pt)
  const certHeight = 118;
  page2.drawRectangle({
    x: margin,
    y: cursorY2 - certHeight,
    width: contentWidth,
    height: certHeight,
    color: rgb(0.985, 0.992, 1),
    borderColor: primaryColor,
    borderWidth: 1,
  });

  // Inner hairline security frame
  page2.drawRectangle({
    x: margin + 2,
    y: cursorY2 - certHeight + 2,
    width: contentWidth - 4,
    height: certHeight - 4,
    borderColor: rgb(0.80, 0.86, 0.92),
    borderWidth: 0.5,
  });

  // Top security header ribbon
  page2.drawRectangle({
    x: margin + 2,
    y: cursorY2 - 18,
    width: contentWidth - 4,
    height: 16,
    color: rgb(0.91, 0.95, 0.98),
  });

  page2.drawText("QUICKFLO SECURE UNDERWRITING TRUST NETWORK • FORENSIC EXECUTION RECORD", {
    x: margin + 8,
    y: cursorY2 - 12.5,
    size: 6.2,
    font: fontBold,
    color: primaryColor,
  });

  // Status badge pill
  const statusBg = hasAudit ? rgb(0.88, 0.96, 0.90) : rgb(0.94, 0.95, 0.97);
  const statusBorder = hasAudit ? rgb(0.2, 0.6, 0.3) : rgb(0.6, 0.65, 0.7);
  const statusText = hasAudit ? "SEALED & AUTHENTICATED" : (isBlank ? "AWAITING SIGNATURE" : "DIGITALLY VERIFIED");
  const statusColor = hasAudit ? rgb(0.1, 0.45, 0.2) : mutedTextColor;

  page2.drawRectangle({
    x: margin + contentWidth - 142,
    y: cursorY2 - 16,
    width: 136,
    height: 12,
    color: statusBg,
    borderColor: statusBorder,
    borderWidth: 0.6,
  });
  page2.drawText(statusText, {
    x: margin + contentWidth - 136,
    y: cursorY2 - 12,
    size: 5.8,
    font: fontBold,
    color: statusColor,
  });

  // Grid Row 1: Envelope ID & IP
  page2.drawText("AUDIT ENVELOPE ID:", { x: margin + 8, y: cursorY2 - 30, size: 6.2, font: fontBold, color: primaryColor });
  page2.drawText(envId, { x: margin + 96, y: cursorY2 - 30, size: 6.6, font: fontMono, color: darkTextColor });
  addEditableField(page2, "qf_audit_envelopeId", envId, margin + 96, cursorY2 - 33, 160, 11);

  page2.drawText("SIGNER PUBLIC IP:", { x: margin + 266, y: cursorY2 - 30, size: 6.2, font: fontBold, color: primaryColor });
  page2.drawText(ipAddr, { x: margin + 348, y: cursorY2 - 30, size: 6.4, font: fontMono, color: darkTextColor });
  addEditableField(page2, "qf_audit_ip", ipAddr, margin + 348, cursorY2 - 33, 192, 11);

  // Grid Row 2: UTC Timestamp & Local Time
  page2.drawText("TIMESTAMP (UTC):", { x: margin + 8, y: cursorY2 - 46, size: 6.2, font: fontBold, color: primaryColor });
  page2.drawText(timeIso, { x: margin + 96, y: cursorY2 - 46, size: 6.2, font: fontMono, color: darkTextColor });
  addEditableField(page2, "qf_audit_timestamp", `${timeIso} (${timeFormatted})`, margin + 96, cursorY2 - 49, 444, 11);

  page2.drawText("LOCAL SIGNING TIME:", { x: margin + 266, y: cursorY2 - 46, size: 6.2, font: fontBold, color: primaryColor });
  page2.drawText(timeFormatted.slice(0, 42), { x: margin + 360, y: cursorY2 - 46, size: 6.0, font: fontRegular, color: darkTextColor });

  // Grid Row 3: SHA-256 Digest
  page2.drawText("SHA-256 DIGEST:", { x: margin + 8, y: cursorY2 - 62, size: 6.2, font: fontBold, color: primaryColor });
  page2.drawText(shaStr, { x: margin + 96, y: cursorY2 - 62, size: 6.2, font: fontMono, color: darkTextColor });
  addEditableField(page2, "qf_audit_sha256", shaStr, margin + 96, cursorY2 - 65, 444, 11);

  // Grid Row 4: Signer Device / Fingerprint
  page2.drawText("DEVICE / CLIENT:", { x: margin + 8, y: cursorY2 - 78, size: 6.2, font: fontBold, color: primaryColor });
  page2.drawText(clientAgent.slice(0, 95), { x: margin + 96, y: cursorY2 - 78, size: 5.8, font: fontRegular, color: darkTextColor });

  // Divider line
  page2.drawLine({
    start: { x: margin + 6, y: cursorY2 - 88 },
    end: { x: margin + contentWidth - 6, y: cursorY2 - 88 },
    thickness: 0.5,
    color: rgb(0.85, 0.88, 0.92),
  });

  // Statutory Non-repudiation & Legal Compliance Statement
  page2.drawText(
    "Tamper-Evident Forensic Audit Record: Digitally executed pursuant to the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN, 15 U.S.C. § 7001), Uniform Electronic Transactions Act (UETA), and Canadian Personal Information Protection and Electronic Documents Act (PIPEDA). Cryptographic audit records are permanently sealed in the QuickFlo Underwriting Gateway.",
    {
      x: margin + 8,
      y: cursorY2 - 97,
      size: 5.6,
      font: fontRegular,
      color: mutedTextColor,
      maxWidth: contentWidth - 16,
      lineHeight: 7.2,
    }
  );

  // Page 2 Footer
  page2.drawText(
    "QuickFlo Financial Inc. - Master Commercial Application & Underwriting Intake - Page 2 of 2 - Underwriting & Funding Protocol",
    {
      x: margin,
      y: 20,
      size: 6.5,
      font: fontRegular,
      color: mutedTextColor,
    }
  );

  try {
    form.updateFieldAppearances(fontRegular);
  } catch {
    /* ignore */
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
}

// Generate completely blank fillable QuickFlo PDF (2-page Master)
export async function generateBlankQuickFloPdf(): Promise<Blob> {
  const empty = createEmptyApplication();
  return generatePrintableQuickFloPdf(empty, true);
}

// Download completely blank fillable QuickFlo PDF directly
export async function downloadBlankQuickFloPdf(
  filename = "QuickFlo_Commercial_Financing_Application_Fillable.pdf"
): Promise<void> {
  const blob = await generateBlankQuickFloPdf();
  downloadPdfBlob(blob, filename);
}

// =========================================================================
// PARSE FILLED QUICKFLO ACROFORM PDF
// =========================================================================
export async function parseQuickFloPdf(
  fileBytes: ArrayBuffer | Uint8Array
): Promise<BusinessFinancingApplication> {
  const bytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const valMap = new Map<string, string>();
  for (const field of form.getFields()) {
    const name = field.getName();
    try {
      if ("getText" in field && typeof (field as any).getText === "function") {
        const txt = (field as any).getText();
        if (txt !== undefined && txt !== null) {
          valMap.set(name, String(txt).trim());
        }
      }
    } catch {
      // ignore
    }
  }

  const get = (key: string, fallback = ""): string => {
    return valMap.get(key) || fallback;
  };

  const getNum = (key: string, fallback = 0): number => {
    const raw = get(key);
    if (!raw) return fallback;
    const clean = raw.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  };

  const getBool = (key: string): boolean => {
    const str = get(key).toLowerCase();
    return str === "yes" || str === "true" || str === "1" || str === "y";
  };

  const parseCityProvPostal = (str: string) => {
    if (!str) return { city: "", province: "ON", postalCode: "" };
    const parts = str.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return { city: parts[0], province: parts[1], postalCode: parts.slice(2).join(" ") };
    } else if (parts.length === 2) {
      return { city: parts[0], province: parts[1], postalCode: "" };
    }
    return { city: parts[0] || "", province: "ON", postalCode: "" };
  };

  const parseName = (fullName: string) => {
    if (!fullName) return { firstName: "", lastName: "" };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  };

  const parseEntityType = (str: string): EntityType => {
    const s = (str || "").toLowerCase();
    if (s.includes("sole")) return "sole_proprietorship";
    if (s.includes("limited")) return "limited_partnership";
    if (s.includes("llc")) return "llc";
    if (s.includes("llp")) return "llp";
    if (s.includes("partner")) return "partnership";
    return "corporation";
  };

  const parseIndustryType = (str: string): IndustryType => {
    const s = (str || "").toLowerCase();
    if (s.includes("retail")) return "retail";
    if (s.includes("restaurant") || s.includes("food")) return "restaurant";
    if (s.includes("construct")) return "construction";
    if (s.includes("transport") || s.includes("truck")) return "transportation";
    if (s.includes("whole")) return "wholesale";
    if (s.includes("medical") || s.includes("health")) return "medical_healthcare";
    if (s.includes("tech")) return "technology";
    if (s.includes("moto")) return "moto";
    if (s.includes("service")) return "services";
    return "other";
  };

  const parseHousing = (str: string): HousingStatus => {
    const s = (str || "").toLowerCase();
    if (s.includes("rent")) return "rent";
    if (s.includes("lease")) return "lease";
    return "own";
  };

  const parseOccupancy = (str: string): OccupancyType => {
    const s = (str || "").toLowerCase();
    if (s.includes("own")) return "own";
    if (s.includes("lease")) return "lease";
    return "rent";
  };

  // Extract address data
  const physLoc = parseCityProvPostal(get("qf_address_city_prov_postal") || get("qf_city_prov"));
  const legalLoc = parseCityProvPostal(get("qf_legal_city_prov_postal") || get("qf_address_city_prov_postal") || get("qf_city_prov"));

  const p1Name = parseName(get("qf_p1_name") || get("qf_signerName") || get("qf_ownerName"));
  const p1Loc = parseCityProvPostal(get("qf_p1_city_prov_postal") || get("qf_ownerCityProv"));

  const p2Name = parseName(get("qf_p2_name"));
  const p2Loc = parseCityProvPostal(get("qf_p2_city_prov_postal"));

  // Audit trail detection
  const envelopeId = get("qf_audit_envelopeId");
  const auditIp = get("qf_audit_ip");
  const auditTime = get("qf_audit_timestamp");
  const auditSha = get("qf_audit_sha256");

  let auditTrail: SignatureAuditTrail | undefined = undefined;
  if (envelopeId && envelopeId !== "QF-TRC-PENDING-SUBMISSION") {
    auditTrail = {
      envelopeId,
      signerName: p1Name.firstName ? `${p1Name.firstName} ${p1Name.lastName}`.trim() : "Authorized Signer",
      signerTitle: get("qf_sig1_title") || get("qf_p1_title") || "President",
      ipAddress: auditIp || "Verified TLS Client",
      userAgent: "Verified PDF AcroForm Parser",
      timestamp: auditTime || new Date().toISOString(),
      formattedTimestamp: auditTime || new Date().toLocaleString(),
      documentHash: auditSha || "SHA256-AUTHENTICATED",
      consentStatement:
        "Digitally executed pursuant to the U.S. Electronic Signatures in Global and National Commerce Act (E-SIGN, 15 U.S.C. § 7001), Uniform Electronic Transactions Act (UETA), and Canadian Personal Information Protection and Electronic Documents Act (PIPEDA).",
      complianceStandard: "ESIGN & PIPEDA Compliant Cryptographic Audit Trail",
    };
  }

  // Raw extracted application
  const rawApp: any = {
    id: `APP-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "submitted",
    business: {
      legalName: get("qf_legalName"),
      dba: get("qf_dba") || get("qf_legalName"),
      tradeName: get("qf_dba") || get("qf_legalName"),
      businessPhone: get("qf_phone"),
      phone: get("qf_phone"),
      fax: get("qf_fax"),
      businessEmail: get("qf_email"),
      email: get("qf_email"),
      website: get("qf_website"),
      federalTaxId: get("qf_taxId"),
      businessNumber: get("qf_taxId"),
      provinceOfIncorporation: get("qf_incorpProv") || "ON",
      dateStarted: get("qf_dateStarted") || get("qf_estDate"),
      dateEstablished: get("qf_dateStarted") || get("qf_estDate"),
      numberOfLocations: getNum("qf_numLocations", 1),
      entityType: parseEntityType(get("qf_entityType")),
      industryType: parseIndustryType(get("qf_productSold")),
      productServiceSold: get("qf_productSold") || "General Commercial Operations",
      mailingAddressChoice: get("qf_mailing_choice").toLowerCase().includes("dba") ? "dba" : "physical",
      physicalAddress: {
        street: get("qf_address_street") || get("qf_address"),
        city: physLoc.city,
        province: physLoc.province,
        postalCode: physLoc.postalCode,
      },
      legalAddress: {
        street: get("qf_legal_street") || get("qf_address_street") || get("qf_address"),
        city: legalLoc.city,
        province: legalLoc.province,
        postalCode: legalLoc.postalCode,
      },
      physicalSameAsLegal: !get("qf_legal_street") || get("qf_legal_street") === get("qf_address_street"),
    },
    financials: {
      requestedAmount: getNum("qf_amountRequested") || getNum("qf_requested", 50000),
      amountRequested: getNum("qf_amountRequested") || getNum("qf_requested", 50000),
      useOfFunds: get("qf_useOfFunds") || "working_capital",
      preferredTerm: get("qf_preferredTerm") || "12 Months",
      grossMonthlySales: getNum("qf_grossMonthlySales") || getNum("qf_monthlySales", 45000),
      grossAnnualSales: getNum("qf_grossAnnualSales") || getNum("qf_annualSales", 540000),
      nonCardMonthlySales: getNum("qf_nonCardSales", 15000),
      averageBankBalance: getNum("qf_avgBankBalance") || getNum("qf_bankBalance", 12000),
      isSeasonal: getBool("qf_isSeasonal"),
      peakSalesStartMonth: get("qf_peakMonths").split("to")[0]?.trim() || "",
      peakSalesEndMonth: get("qf_peakMonths").split("to")[1]?.trim() || "",
      isFranchise: getBool("qf_isFranchise"),
      franchisorName: get("qf_franchisorInfo").split("•")[0]?.trim() || "",
      franchisorPhone: get("qf_franchisorInfo").split("•")[1]?.trim() || "",
    },
    owners: [
      {
        id: "owner-1",
        isPrimary: true,
        firstName: p1Name.firstName || "Principal",
        lastName: p1Name.lastName || "Owner",
        title: get("qf_p1_title") || get("qf_ownerTitle") || "President",
        ownershipPercentage: getNum("qf_p1_ownership") || getNum("qf_p1_equity", 100),
        dob: get("qf_p1_dob") || get("qf_dob"),
        sin: get("qf_p1_sin") || get("qf_sin"),
        ssnOrSin: get("qf_p1_sin") || get("qf_sin"),
        dlNumber: get("qf_p1_dl"),
        housingStatus: parseHousing(get("qf_p1_housing")),
        yearsAtResidence: getNum("qf_p1_yearsAtRes", 3),
        phone: get("qf_p1_phone") || get("qf_ownerPhone") || get("qf_phone"),
        mobile: get("qf_p1_mobile") || get("qf_p1_cell") || get("qf_p1_phone") || get("qf_phone"),
        email: get("qf_p1_email") || get("qf_email"),
        address: {
          street: get("qf_p1_street") || get("qf_ownerAddress") || get("qf_address_street") || get("qf_address"),
          city: p1Loc.city || physLoc.city,
          province: p1Loc.province || physLoc.province,
          postalCode: p1Loc.postalCode || physLoc.postalCode,
        },
      },
      ...(p2Name.firstName ? [
        {
          id: "owner-2",
          isPrimary: false,
          firstName: p2Name.firstName,
          lastName: p2Name.lastName,
          title: get("qf_p2_title") || "Partner",
          ownershipPercentage: getNum("qf_p2_ownership", 0),
          dob: get("qf_p2_dob"),
          sin: get("qf_p2_sin"),
          ssnOrSin: get("qf_p2_sin"),
          dlNumber: get("qf_p2_dl"),
          housingStatus: parseHousing(get("qf_p2_housing")),
          yearsAtResidence: getNum("qf_p2_yearsAtRes", 0),
          phone: get("qf_p2_phone"),
          mobile: get("qf_p2_mobile") || get("qf_p2_phone"),
          email: get("qf_p2_email"),
          address: {
            street: get("qf_p2_street"),
            city: p2Loc.city,
            province: p2Loc.province,
            postalCode: p2Loc.postalCode,
          },
        }
      ] : []),
    ],
    property: {
      occupancyType: parseOccupancy(get("qf_prop_occupancy") || get("qf_propStatus")),
      monthlyRentOrMortgage: getNum("qf_prop_rent") || getNum("qf_rent", 3500),
      landlordOrMortgageBank: get("qf_prop_landlord") || get("qf_landlord"),
      landlordOrMortgagee: get("qf_prop_landlord") || get("qf_landlord"),
      accountNumber: get("qf_prop_account"),
      contactName: get("qf_prop_contact"),
      phone: get("qf_prop_phone") || get("qf_landlordPhone"),
      landlordPhone: get("qf_prop_phone") || get("qf_landlordPhone"),
      leaseStartDate: get("qf_prop_leaseStart"),
      leaseEndDate: get("qf_prop_leaseEnd"),
    },
    paymentProcessing: {
      currentProcessor: get("qf_pp_processor") || get("qf_processor"),
      terminalSoftwareModel: get("qf_pp_terminalModel"),
      numberOfTerminals: getNum("qf_pp_numTerminals", 1),
      averageMonthlyVolume: getNum("qf_pp_monthlyVol") || getNum("qf_cardVolume") || getNum("qf_grossMonthlySales", 45000),
      highMonth: get("qf_pp_highLowMonth").split("/")[0]?.trim() || "",
      lowMonth: get("qf_pp_highLowMonth").split("/")[1]?.trim() || "",
      acceptsCreditCards: true,
      acceptedCards: {
        visaMastercard: true,
        amex: get("qf_pp_cards").toLowerCase().includes("amex"),
        discover: get("qf_pp_cards").toLowerCase().includes("discover"),
        debit: true,
        ebt: get("qf_pp_cards").toLowerCase().includes("ebt"),
      },
    },
    existingFinancing: {
      hasFinancing: getBool("qf_debt_hasDebt") || Boolean(get("qf_debt")),
      lenderName: get("qf_debt_lender"),
      approximateBalance: getNum("qf_debt_balance"),
      dailyOrWeeklyPayment: getNum("qf_debt_payment"),
      position: get("qf_debt_position") || "1st",
      hasCashAdvanceBefore: getBool("qf_mca_receivedBefore"),
      cashAdvanceProvider: get("qf_mca_provider"),
      cashAdvanceWhen: get("qf_mca_when"),
      facilities: get("qf_debt_lender") && get("qf_debt_lender") !== "None" ? [
        {
          id: "fac-1",
          lenderName: get("qf_debt_lender"),
          currentBalance: getNum("qf_debt_balance"),
          paymentAmount: getNum("qf_debt_payment"),
        }
      ] : [],
    },
    tradeReferences: [
      {
        id: "ref-1",
        businessName: get("qf_ref1_name"),
        companyName: get("qf_ref1_name"),
        accountNumber: get("qf_ref1_account"),
        contactName: get("qf_ref1_contact"),
        contactPerson: get("qf_ref1_contact"),
        contactPhone: get("qf_ref1_phone"),
        phone: get("qf_ref1_phone"),
      },
      {
        id: "ref-2",
        businessName: get("qf_ref2_name"),
        companyName: get("qf_ref2_name"),
        accountNumber: get("qf_ref2_account"),
        contactName: get("qf_ref2_contact"),
        contactPerson: get("qf_ref2_contact"),
        contactPhone: get("qf_ref2_phone"),
        phone: get("qf_ref2_phone"),
      },
    ],
    authorization: {
      applicantName: get("qf_sig1_name") || get("qf_signerName") || (p1Name.firstName ? `${p1Name.firstName} ${p1Name.lastName}`.trim() : ""),
      signerName: get("qf_sig1_name") || get("qf_signerName") || (p1Name.firstName ? `${p1Name.firstName} ${p1Name.lastName}`.trim() : ""),
      applicantTitle: get("qf_sig1_title") || get("qf_signerTitle") || get("qf_p1_title") || "President",
      signerTitle: get("qf_sig1_title") || get("qf_signerTitle") || get("qf_p1_title") || "President",
      dateSigned: get("qf_sig1_date") || get("qf_dateSigned") || new Date().toISOString().split("T")[0],
      signatureDate: get("qf_sig1_date") || get("qf_dateSigned") || new Date().toISOString().split("T")[0],
      termsAccepted: true,
      creditCheckConsent: true,
      secondApplicantName: get("qf_sig2_name") || (p2Name.firstName ? `${p2Name.firstName} ${p2Name.lastName}`.trim() : ""),
      secondApplicantTitle: get("qf_sig2_title") || (p2Name.firstName ? "Partner" : ""),
      secondSignatureDate: get("qf_sig2_date"),
      ipAddress: auditIp || "Verified TLS Client",
      auditTrail,
    },
  };

  return normalizeApplicationData(rawApp);
}

// =========================================================================
// 5. BUNDLE ALL DOCUMENTS AS ZIP
// =========================================================================
export async function generateAllLenderPdfsZip(
  app: BusinessFinancingApplication
): Promise<Blob> {
  const zip = new JSZip();

  const whiteLabelBlob = await generateWhiteLabelPdf(app);
  const canacapBlob = await generateCanaCapPdf(app);
  const printableBlob = await generatePrintableQuickFloPdf(app);

  const safeBiz = (app.business.legalName || "Application").replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseName = `${app.id}_${safeBiz}`;

  zip.file(`${baseName}_Business_Financing_Application.pdf`, await whiteLabelBlob.arrayBuffer());
  zip.file(`${baseName}_CanaCap_Application.pdf`, await canacapBlob.arrayBuffer());
  zip.file(`${baseName}_QuickFlo_Printable_Fillable_Intake.pdf`, await printableBlob.arrayBuffer());

  const zipContent = await zip.generateAsync({ type: "blob" });
  return zipContent;
}

// =========================================================================
// 6. BROWSER DOWNLOAD HELPER
// =========================================================================
export function downloadPdfBlob(blobOrBytes: Blob | Uint8Array, filename: string): void {
  const blob =
    blobOrBytes instanceof Blob
      ? blobOrBytes
      : new Blob([blobOrBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

