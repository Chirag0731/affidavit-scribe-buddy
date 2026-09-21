import { PDFDocument, StandardFonts, rgb, RGB } from "pdf-lib";
import JSZip from "jszip";
import {
  BUSINESS_FINANCING_TEMPLATE_BASE64,
  CANACAP_TEMPLATE_BASE64,
} from "@/assets/lenders/lender-templates-asset";
import type {
  BusinessFinancingApplication,
  LenderValidationReport,
  LenderFieldAudit,
} from "@/types/financing";

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

  const { business, financials, owners, property, existingFinancing, authorization } = app;
  const owner1 = owners[0];
  const owner2 = owners[1];

  // Header
  if (app.assignedAgent) drawText(app.assignedAgent, 320, 688, 8, false, highlightColor);
  if (app.assignedSubagent) drawText(app.assignedSubagent, 450, 688, 8, false, highlightColor);

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

  const { business, financials, owners, property, paymentProcessing, tradeReferences, existingFinancing, authorization } = app;
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

  const { business, financials, owners, property } = app;
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

  const { business, financials, owners, property, tradeReferences, paymentProcessing } = app;
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
// 4. GENERATE PRINTABLE & FILLABLE QUICKFLO FINANCIAL APPLICATION PDF
// =========================================================================
export async function generatePrintableQuickFloPdf(
  app: BusinessFinancingApplication
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Standard US Letter
  const form = pdfDoc.getForm();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const primaryColor = rgb(0.05, 0.45, 0.55); // Cyan/Navy branding
  const darkTextColor = rgb(0.1, 0.15, 0.2);
  const mutedTextColor = rgb(0.4, 0.45, 0.5);
  const lightBg = rgb(0.95, 0.97, 0.98);
  const borderColor = rgb(0.8, 0.85, 0.88);

  const { width, height } = page.getSize();
  const margin = 36;
  let cursorY = height - 40;

  // 1. Header Banner
  page.drawRectangle({
    x: margin,
    y: cursorY - 48,
    width: width - margin * 2,
    height: 52,
    color: primaryColor,
  });

  page.drawText("QUICKFLO FINANCIAL", {
    x: margin + 14,
    y: cursorY - 22,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("COMMERCIAL CAPITAL APPLICATION & MASTER INTAKE", {
    x: margin + 14,
    y: cursorY - 38,
    size: 8.5,
    font: fontBold,
    color: rgb(0.85, 0.95, 1),
  });

  page.drawText(`REF: ${app.id.toUpperCase().slice(0, 16)}`, {
    x: width - margin - 150,
    y: cursorY - 22,
    size: 8,
    font: fontMono,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Direct Intake: (800) 518-8092`, {
    x: width - margin - 150,
    y: cursorY - 36,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.9, 0.95, 1),
  });

  cursorY -= 60;

  // Submission Notice
  page.drawRectangle({
    x: margin,
    y: cursorY - 18,
    width: width - margin * 2,
    height: 18,
    color: lightBg,
    borderColor: borderColor,
    borderWidth: 0.5,
  });

  const onlineUrl = typeof window !== "undefined" ? `${window.location.origin}/apply?id=${app.id}` : `https://portal.quickflo.com/apply?id=${app.id}`;
  page.drawText(`Online Portal & Direct Sync Link: ${onlineUrl}`, {
    x: margin + 8,
    y: cursorY - 12,
    size: 7,
    font: fontRegular,
    color: darkTextColor,
  });

  cursorY -= 26;

  // Helper to draw section header
  const drawSectionHeader = (title: string, yPos: number): number => {
    page.drawRectangle({
      x: margin,
      y: yPos - 14,
      width: width - margin * 2,
      height: 15,
      color: rgb(0.9, 0.93, 0.96),
    });
    page.drawText(title.toUpperCase(), {
      x: margin + 8,
      y: yPos - 10,
      size: 7.5,
      font: fontBold,
      color: primaryColor,
    });
    return yPos - 22;
  };

  // Helper to add interactive AcroForm text field
  const addEditableField = (
    fieldName: string,
    initialVal: string,
    x: number,
    y: number,
    w: number,
    h: number = 14
  ) => {
    try {
      const field = form.createTextField(fieldName);
      field.setText(initialVal || "");
      field.addToPage(page, {
        x,
        y,
        width: w,
        height: h,
        borderWidth: 0.5,
        borderColor: rgb(0.75, 0.8, 0.85),
        backgroundColor: rgb(0.98, 0.99, 1),
        textColor: darkTextColor,
      });
      field.setFontSize(8);
    } catch {
      // Fallback text drawing if field exists
      page.drawText(initialVal || "", { x, y: y + 3, size: 8, font: fontRegular, color: darkTextColor });
    }
  };

  // --- SECTION 1: BUSINESS PROFILE ---
  cursorY = drawSectionHeader("1. Business Operating Profile", cursorY);

  page.drawText("Legal Corporate Name:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_legalName", app.business.legalName, margin, cursorY - 16, 260);

  page.drawText("Trade Name / DBA:", { x: margin + 270, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_dba", app.business.dba || app.business.tradeName || "", margin + 270, cursorY - 16, 270);
  cursorY -= 32;

  page.drawText("Physical Operating Street Address:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  const streetStr = typeof app.business.physicalAddress === "string" ? app.business.physicalAddress : app.business.physicalAddress?.street || "";
  addEditableField("qf_address", streetStr, margin, cursorY - 16, 260);

  page.drawText("City / Province / Postal Code:", { x: margin + 270, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  const locStr = [app.business.city, app.business.province, app.business.postalCode].filter(Boolean).join(", ");
  addEditableField("qf_city_prov", locStr, margin + 270, cursorY - 16, 270);
  cursorY -= 32;

  page.drawText("Business Phone:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_phone", app.business.businessPhone || app.business.phone, margin, cursorY - 16, 125);

  page.drawText("Business Email:", { x: margin + 135, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_email", app.business.businessEmail || app.business.email, margin + 135, cursorY - 16, 125);

  page.drawText("Tax ID / BIN / EIN:", { x: margin + 270, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_taxId", app.business.federalTaxId || app.business.businessNumber, margin + 270, cursorY - 16, 130);

  page.drawText("Date Established:", { x: margin + 410, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_estDate", formatDate(app.business.dateEstablished || app.business.dateStarted), margin + 410, cursorY - 16, 130);
  cursorY -= 32;

  // --- SECTION 2: FINANCIAL PROFILE ---
  cursorY = drawSectionHeader("2. Financial Requirements & Processing", cursorY);

  page.drawText("Amount Requested ($):", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_requested", formatCurrency(app.financials.amountRequested || app.financials.requestedAmount), margin, cursorY - 16, 125);

  page.drawText("Use of Funds:", { x: margin + 135, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_useOfFunds", String(app.financials.useOfFunds || "Working Capital"), margin + 135, cursorY - 16, 125);

  page.drawText("Gross Annual Sales ($):", { x: margin + 270, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_annualSales", formatCurrency(app.financials.annualGrossRevenue || app.financials.grossAnnualSales), margin + 270, cursorY - 16, 130);

  page.drawText("Avg Monthly Sales ($):", { x: margin + 410, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_monthlySales", formatCurrency(app.financials.averageMonthlyRevenue || app.financials.grossMonthlySales), margin + 410, cursorY - 16, 130);
  cursorY -= 32;

  page.drawText("Credit Card Processor:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_processor", app.paymentProcessing.currentProcessor || "None", margin, cursorY - 16, 175);

  page.drawText("Monthly Card Volume ($):", { x: margin + 185, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_cardVolume", formatCurrency(app.paymentProcessing.averageMonthlyProcessingVolume), margin + 185, cursorY - 16, 175);

  page.drawText("Avg Bank Balance ($):", { x: margin + 370, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_bankBalance", formatCurrency(app.financials.averageBankBalance), margin + 370, cursorY - 16, 170);
  cursorY -= 32;

  // --- SECTION 3: OWNERSHIP STRUCTURE ---
  cursorY = drawSectionHeader("3. Beneficial Ownership & Principals (20%+ Equity)", cursorY);

  const p1 = app.owners[0] || {};
  page.drawText("Principal 1 Name & Title:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_p1_name", `${p1.firstName || ""} ${p1.lastName || ""}`.trim() + (p1.title ? ` (${p1.title})` : ""), margin, cursorY - 16, 175);

  page.drawText("Ownership %:", { x: margin + 185, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_p1_equity", p1.ownershipPercentage ? `${p1.ownershipPercentage}%` : "100%", margin + 185, cursorY - 16, 80);

  page.drawText("SSN / SIN:", { x: margin + 275, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_p1_sin", p1.ssnOrSin || p1.sin || "", margin + 275, cursorY - 16, 125);

  page.drawText("Date of Birth:", { x: margin + 410, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_p1_dob", formatDate(p1.dob), margin + 410, cursorY - 16, 130);
  cursorY -= 32;

  page.drawText("Principal 1 Home Address:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  const p1Home = p1.homeAddress || (p1.address ? `${p1.address.street}, ${p1.address.city}, ${p1.address.province}` : "");
  addEditableField("qf_p1_address", p1Home, margin, cursorY - 16, 260);

  page.drawText("Cell Phone:", { x: margin + 270, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_p1_cell", p1.mobilePhone || p1.phone || "", margin + 270, cursorY - 16, 130);

  page.drawText("Personal Email:", { x: margin + 410, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_p1_email", p1.email || "", margin + 410, cursorY - 16, 130);
  cursorY -= 32;

  // Principal 2 if present
  const p2 = app.owners[1];
  if (p2) {
    page.drawText(`Principal 2: ${p2.firstName || ""} ${p2.lastName || ""} (${p2.ownershipPercentage}% Equity)`, {
      x: margin,
      y: cursorY,
      size: 7,
      font: fontBold,
      color: darkTextColor,
    });
    addEditableField(
      "qf_p2_info",
      `DOB: ${formatDate(p2.dob)} | SIN: ${p2.ssnOrSin || p2.sin || "—"} | Phone: ${p2.mobilePhone || p2.phone || "—"}`,
      margin,
      cursorY - 16,
      width - margin * 2
    );
    cursorY -= 30;
  }

  // --- SECTION 4: PREMISES & EXISTING FINANCING ---
  cursorY = drawSectionHeader("4. Commercial Property & Current Debt", cursorY);

  page.drawText("Property Status:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_propStatus", String(app.property.locationType || "Leased"), margin, cursorY - 16, 125);

  page.drawText("Landlord / Mortgagee:", { x: margin + 135, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_landlord", app.property.landlordOrMortgagee || "", margin + 135, cursorY - 16, 125);

  page.drawText("Monthly Rent / Mortgage ($):", { x: margin + 270, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_rent", formatCurrency(app.property.monthlyRentOrMortgage), margin + 270, cursorY - 16, 130);

  page.drawText("Landlord Phone:", { x: margin + 410, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_landlordPhone", app.property.landlordPhone || "", margin + 410, cursorY - 16, 130);
  cursorY -= 32;

  page.drawText("Existing MCA / Loan Balances:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  const debtStr = app.existingFinancing.hasExistingFinancing
    ? `Lender: ${app.existingFinancing.lenderName || "—"} | Approx Balance: ${formatCurrency(app.existingFinancing.approximateBalance)} | Payment: ${formatCurrency(app.existingFinancing.dailyOrWeeklyPayment)}`
    : "None reported. No existing balances.";
  addEditableField("qf_debt", debtStr, margin, cursorY - 16, width - margin * 2);
  cursorY -= 30;

  // --- SECTION 5: AUTHORIZATION & SIGNATURE ---
  cursorY = drawSectionHeader("5. Authorization, Credit Inquiry Consent & Execution", cursorY);

  const authNotice =
    "Applicant and each beneficial owner authorize QuickFlo Financial and its lending partners to obtain commercial and personal credit profiles, verify bank records, and exchange information with credit reporting agencies. The undersigned certifies that all statements made herein are true and accurate.";
  page.drawText(authNotice, {
    x: margin,
    y: cursorY,
    size: 6.5,
    font: fontRegular,
    color: mutedTextColor,
    maxWidth: width - margin * 2,
    lineHeight: 8.5,
  });
  cursorY -= 26;

  page.drawText("Authorized Signer Name:", { x: margin, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_signerName", app.authorization.signerName || `${p1.firstName || ""} ${p1.lastName || ""}`.trim(), margin, cursorY - 16, 175);

  page.drawText("Signer Title:", { x: margin + 185, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_signerTitle", app.authorization.signerTitle || p1.title || "President", margin + 185, cursorY - 16, 125);

  page.drawText("Date Signed:", { x: margin + 320, y: cursorY, size: 7, font: fontBold, color: darkTextColor });
  addEditableField("qf_dateSigned", formatDate(app.authorization.dateSigned) || formatDate(new Date().toISOString().split("T")[0]), margin + 320, cursorY - 16, 90);

  // Digital Signature Box
  page.drawRectangle({
    x: margin + 420,
    y: cursorY - 24,
    width: width - margin - 420,
    height: 32,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.7, 0.75, 0.8),
    borderWidth: 0.5,
  });
  page.drawText("Digital / Ink Signature", { x: margin + 425, y: cursorY + 2, size: 6.5, font: fontBold, color: darkTextColor });

  if (app.authorization.signatureDataUrl && app.authorization.signatureDataUrl.startsWith("data:image/png")) {
    try {
      const cleanB64 = app.authorization.signatureDataUrl.split(",")[1];
      const sigImgBytes = base64ToUint8Array(cleanB64);
      const sigImage = await pdfDoc.embedPng(sigImgBytes);
      page.drawImage(sigImage, {
        x: margin + 425,
        y: cursorY - 22,
        width: width - margin - 430,
        height: 28,
      });
    } catch {
      page.drawText(app.authorization.signerName || "Digitally Signed", {
        x: margin + 425,
        y: cursorY - 10,
        size: 9,
        font: fontBold,
        color: rgb(0.1, 0.3, 0.5),
      });
    }
  } else {
    page.drawText("X _______________________________", {
      x: margin + 425,
      y: cursorY - 14,
      size: 7,
      font: fontRegular,
      color: mutedTextColor,
    });
  }

  // Footer banner
  page.drawText("QuickFlo Financial Inc. - Confidential Underwriting Application Document - Direct Submission: " + onlineUrl, {
    x: margin,
    y: 18,
    size: 6.5,
    font: fontRegular,
    color: mutedTextColor,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
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

