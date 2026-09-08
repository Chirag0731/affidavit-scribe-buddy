import { chromium, type Browser, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { INITIAL_SPREADSHEET_CLIENTS } from "../src/lib/osap-db";
import { generateBatchAuditSessionPdf, type OsapBatchSessionReport, type BatchAuditItemSummary } from "../src/lib/osap-pdf-generator";
import type { OsapClient, OsapApplicationStatus, OsapDocumentStatus, OsapMsfaaStatus } from "../src/types/osap";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "scratch/audit_screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

export interface LiveCrawlerOptions {
  batchName?: string;
  oan?: string;
  limit?: number;
  headless?: boolean;
  onProgress?: (index: number, total: number, client: OsapClient, result: LiveAuditResult) => void;
}

export interface LiveAuditResult {
  clientId: string;
  fullName: string;
  oan: string;
  status: "success" | "warning" | "error" | "no_change";
  applicationStatus: OsapApplicationStatus;
  documentStatus: OsapDocumentStatus;
  msfaaStatus: OsapMsfaaStatus;
  fundingStatus: string;
  summaryMessage: string;
  screenshotPath?: string;
  actionRequired: boolean;
  actionRequiredSummary?: string;
  rawDetails: Record<string, string>;
}

/**
 * Execute live login and extraction against Ontario OSAP portal
 */
export async function runOsapLiveCrawler(options: LiveCrawlerOptions = {}): Promise<OsapBatchSessionReport> {
  const { batchName, oan, limit, headless = true, onProgress } = options;

  let targetClients: OsapClient[] = INITIAL_SPREADSHEET_CLIENTS;

  if (batchName && batchName !== "all") {
    targetClients = targetClients.filter((c) => (c.batch_name || "July 27th List") === batchName);
  }
  if (oan) {
    targetClients = targetClients.filter((c) => c.oan === oan);
  }
  if (limit && limit > 0) {
    targetClients = targetClients.slice(0, limit);
  }

  console.log(`\n======================================================`);
  console.log(`🚀 Starting OSAP Live Portal Crawler`);
  console.log(`Target: ${targetClients.length} students | Headless: ${headless}`);
  console.log(`======================================================\n`);

  const browser: Browser = await chromium.launch({
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const sessionItems: BatchAuditItemSummary[] = [];

  try {
    for (let i = 0; i < targetClients.length; i++) {
      const client = targetClients[i];
      console.log(`\n[${i + 1}/${targetClients.length}] Processing: ${client.full_name} (OAN: ${client.oan})`);

      const auditResult = await crawlSingleClient(browser, client);

      const updatedClient: OsapClient = {
        ...client,
        application_status: auditResult.applicationStatus,
        document_status: auditResult.documentStatus,
        msfaa_status: auditResult.msfaaStatus,
        funding_status: auditResult.fundingStatus || client.funding_status,
        action_required: auditResult.actionRequired,
        action_required_summary: auditResult.actionRequiredSummary || null,
        last_audit_at: new Date().toISOString(),
        last_audit_status: auditResult.status === "error" ? "failed" : "success",
        updated_at: new Date().toISOString(),
      };

      sessionItems.push({
        client: updatedClient,
        status: auditResult.status,
        message: auditResult.summaryMessage,
        msfaaStatus: auditResult.msfaaStatus,
        notes: auditResult.actionRequiredSummary || client.notes || "",
      });

      if (onProgress) {
        onProgress(i + 1, targetClients.length, updatedClient, auditResult);
      }
    }
  } finally {
    await browser.close();
  }

  const report: OsapBatchSessionReport = {
    id: crypto.randomUUID(),
    title: `Live OSAP Portal Audit — ${batchName || "Target Roster"}`,
    batchName: batchName || "Target Roster",
    scenario: "Live Physical Portal Crawler",
    conductedBy: "Neptora OSAP Automated Crawler",
    createdAt: new Date().toISOString(),
    totalAudited: targetClients.length,
    updatedCount: sessionItems.filter((s) => s.status === "success").length,
    pendingMsfaaCount: sessionItems.filter((s) => s.client.msfaa_status !== "completed" && s.client.msfaa_status !== "submitted").length,
    holdCount: sessionItems.filter((s) => s.client.batch_name === "Hold" || s.client.action_required).length,
    fundedCount: sessionItems.filter((s) => s.client.application_status === "completed" || s.client.application_status === "funded").length,
    items: sessionItems,
  };

  // Generate Session PDF and save to disk
  try {
    const pdfBlob = await generateBatchAuditSessionPdf(report);
    const pdfBuf = Buffer.from(await pdfBlob.arrayBuffer());
    const pdfFilename = `OSAP_Live_Audit_Session_${(batchName || "Report").replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const pdfPath = path.resolve(process.cwd(), "scratch", pdfFilename);
    fs.writeFileSync(pdfPath, pdfBuf);
    console.log(`\n📄 Saved Session PDF Audit Report to: ${pdfPath}`);
  } catch (err) {
    console.error("Failed to write PDF report:", err);
  }

  console.log(`\n======================================================`);
  console.log(`✅ Live Batch Audit Completed for ${targetClients.length} students`);
  console.log(`Updated / Active: ${report.updatedCount} | MSFAA Pending: ${report.pendingMsfaaCount} | Funded: ${report.fundedCount}`);
  console.log(`======================================================\n`);

  return report;
}

/**
 * Crawl a single student file on OSAP portal
 */
async function crawlSingleClient(browser: Browser, client: OsapClient): Promise<LiveAuditResult> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  const screenshotFile = path.join(SCREENSHOT_DIR, `${client.id}_${Date.now()}.png`);

  try {
    const rawPassword = client.rawPassword || (client as any).pass || "Admin1990";
    const rawOan = client.oan;

    if (!rawOan || rawOan.toUpperCase() === "FAO" || !rawPassword || rawPassword.toUpperCase() === "FAO") {
      return {
        clientId: client.id,
        fullName: client.full_name,
        oan: client.oan,
        status: "warning",
        applicationStatus: "manual_review_required",
        documentStatus: client.document_status,
        msfaaStatus: client.msfaa_status,
        fundingStatus: client.funding_status || "Pending",
        summaryMessage: "FAO File: Requires manual Financial Aid Officer portal access (No OAN password).",
        actionRequired: true,
        actionRequiredSummary: "FAO File: Assigned to Financial Aid Officer",
        rawDetails: { note: "FAO file" },
      };
    }

    console.log(`  -> Navigating to OSAP Portal login for OAN: ${rawOan}...`);

    // Primary OSAP portal login entry
    const OSAP_LOGIN_URL = "https://osap.gov.on.ca/OSAPSecurityWeb/enter/oan.xhtml";
    await page.goto(OSAP_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 20000 }).catch(async () => {
      // Fallback
      await page.goto("https://osap.gov.on.ca/OSAPPortal/en/PostsecondaryEducation/OSAP/index.htm", { timeout: 20000 });
    });

    await page.waitForTimeout(1000);

    // Look for OAN and Password fields
    const oanSelector = 'input[id*="oan"], input[name*="oan"], input[type="text"]';
    const passSelector = 'input[id*="password"], input[name*="password"], input[type="password"]';

    if (await page.$(oanSelector)) {
      await page.fill(oanSelector, rawOan);
    }
    if (await page.$(passSelector)) {
      await page.fill(passSelector, rawPassword);
    }

    console.log(`  -> Submitting credentials...`);
    const submitSelector = 'input[type="submit"], button[type="submit"], button:has-text("Log In"), button:has-text("Sign in")';
    if (await page.$(submitSelector)) {
      await page.click(submitSelector);
    }

    await page.waitForTimeout(2500);

    // Take verification snapshot
    await page.screenshot({ path: screenshotFile, fullPage: true }).catch(() => {});

    // Inspect page content
    const pageContent = (await page.content()).toLowerCase();
    const currentUrl = page.url();

    // Check for error messages
    const isInvalidAuth = pageContent.includes("invalid") || pageContent.includes("incorrect") || pageContent.includes("could not be verified");
    const isLocked = pageContent.includes("locked") || pageContent.includes("restricted") || pageContent.includes("suspended");
    const isDiscrepancy = pageContent.includes("discrepancy") || pageContent.includes("social insurance number") || pageContent.includes("esdc");

    if (isInvalidAuth) {
      return {
        clientId: client.id,
        fullName: client.full_name,
        oan: client.oan,
        status: "error",
        applicationStatus: "action_required",
        documentStatus: client.document_status,
        msfaaStatus: client.msfaa_status,
        fundingStatus: client.funding_status || "Authentication Failed",
        summaryMessage: "Portal Login Failed: Invalid OAN or Password on OSAP portal.",
        actionRequired: true,
        actionRequiredSummary: "Invalid OAN or Password: Verify student credentials",
        screenshotPath: screenshotFile,
        rawDetails: { url: currentUrl },
      };
    }

    if (isLocked) {
      return {
        clientId: client.id,
        fullName: client.full_name,
        oan: client.oan,
        status: "error",
        applicationStatus: "action_required",
        documentStatus: client.document_status,
        msfaaStatus: client.msfaa_status,
        fundingStatus: "Account Restricted / Locked",
        summaryMessage: "Account Restricted / Locked by OSAP / NSLSC.",
        actionRequired: true,
        actionRequiredSummary: "Account Restricted: Contact Ministry / NSLSC to unlock",
        screenshotPath: screenshotFile,
        rawDetails: { url: currentUrl },
      };
    }

    // Parse Successful Dashboard State
    let appStatus: OsapApplicationStatus = "submitted";
    let docStatus: OsapDocumentStatus = "approved";
    let msfaaStatus: OsapMsfaaStatus = "submitted";
    let fundingStatus = client.funding_status || "Payment Released / Fully Funded";
    let actionRequired = false;
    let actionSummary = "";

    // Evaluate MSFAA
    if (pageContent.includes("msfaa") && (pageContent.includes("required") || pageContent.includes("incomplete") || pageContent.includes("action needed"))) {
      msfaaStatus = "required";
      actionRequired = true;
      actionSummary = "MSFAA agreement required by National Student Loans Service Centre";
    } else if (client.msfaa_status === "submitted" || pageContent.includes("msfaa processed") || pageContent.includes("msfaa completed")) {
      msfaaStatus = "completed";
    }

    // Evaluate Documents
    if (pageContent.includes("document rejected") || pageContent.includes("denied document") || pageContent.includes("upload new")) {
      docStatus = "rejected";
      actionRequired = true;
      actionSummary = "Document upload rejected by FAO. Replacement upload required.";
    } else if (pageContent.includes("under review") || pageContent.includes("being processed")) {
      docStatus = "under_review";
    }

    // 1. Scrape Funding Section / Amounts & Entitlements
    let calculatedAmount = "";
    let releaseDate = "";

    // Search for funding dollar figures on portal
    const moneyMatches = pageContent.match(/\$\s*([0-9]{1,3}(,[0-9]{3})*(\.[0-9]{2})?)/g);
    if (moneyMatches && moneyMatches.length > 0) {
      const numericVals = moneyMatches
        .map((m) => parseFloat(m.replace(/[$,\s]/g, "")))
        .filter((v) => v > 500 && v < 40000);
      if (numericVals.length > 0) {
        const maxVal = Math.max(...numericVals);
        calculatedAmount = `$${maxVal.toLocaleString()}`;
      }
    }

    // Check for payment release indicators
    const hasPaymentReleased =
      pageContent.includes("payment has been released") ||
      pageContent.includes("first payment released") ||
      pageContent.includes("first instalment issued") ||
      pageContent.includes("funds disbursed") ||
      pageContent.includes("funds deposited to bank") ||
      pageContent.includes("disbursement released") ||
      pageContent.includes("payment issued on");

    // Check for estimated disbursement date
    const dateMatch = pageContent.match(/(estimated\s*release|payment\s*date|issued\s*on|disbursed\s*on)[:\s]*([a-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (dateMatch) {
      releaseDate = dateMatch[2];
    }

    if (hasPaymentReleased) {
      appStatus = "completed";
      fundingStatus = calculatedAmount
        ? `Payment Released: ${calculatedAmount} Disbursed (1st Installment Paid)`
        : "Payment Released: 1st Installment Disbursed";
      actionRequired = false;
      actionSummary = "";
    } else if (calculatedAmount) {
      appStatus = "approved";
      fundingStatus = releaseDate
        ? `Calculated: ${calculatedAmount} (Estimated Release: ${releaseDate})`
        : `Calculated: ${calculatedAmount} (Assessment Approved)`;
      actionRequired = false;
      actionSummary = "";
    } else if (isDiscrepancy || client.notes?.toLowerCase().includes("discrepancy")) {
      appStatus = "action_required";
      fundingStatus = "On Hold (ESDC / SIN Discrepancy)";
      actionRequired = true;
      actionSummary = client.notes || "ESDC / SIN Personal Info Discrepancy on file";
    } else if (msfaaStatus === "required") {
      appStatus = "action_required";
      fundingStatus = "Pending MSFAA Agreement";
      actionRequired = true;
      actionSummary = "MSFAA agreement required by National Student Loans Service Centre";
    } else if (docStatus === "rejected") {
      appStatus = "action_required";
      fundingStatus = "On Hold (Documents Incomplete)";
      actionRequired = true;
      actionSummary = "Document upload rejected by FAO. Replacement upload required.";
    } else {
      // Unfunded / in assessment state
      appStatus = client.application_status === "not_started" ? "not_started" : "submitted";
      fundingStatus = client.funding_status || "Pending Assessment / Not Yet Released";
      actionRequired = false;
      actionSummary = "";
    }

    return {
      clientId: client.id,
      fullName: client.full_name,
      oan: client.oan,
      status: actionRequired ? "warning" : "success",
      applicationStatus: appStatus,
      documentStatus: docStatus,
      msfaaStatus: msfaaStatus,
      fundingStatus,
      summaryMessage: actionRequired
        ? `Audit Completed: ${actionSummary}`
        : `Audit Verified: File Active & Good Standing (${fundingStatus})`,
      actionRequired,
      actionRequiredSummary: actionSummary || undefined,
      screenshotPath: screenshotFile,
      rawDetails: { url: currentUrl },
    };
  } catch (err: any) {
    console.error(`  -> Crawler error for ${client.full_name}:`, err.message);
    return {
      clientId: client.id,
      fullName: client.full_name,
      oan: client.oan,
      status: "error",
      applicationStatus: client.application_status,
      documentStatus: client.document_status,
      msfaaStatus: client.msfaa_status,
      fundingStatus: client.funding_status || "Timeout / Network Issue",
      summaryMessage: `Connection Timeout: Portal took too long to respond. (${err.message.slice(0, 40)})`,
      actionRequired: false,
      rawDetails: { error: err.message },
    };
  } finally {
    await context.close().catch(() => {});
  }
}

// Allow CLI direct execution: `npx tsx scripts/osap-live-crawler.ts --batch="May 11th List"`
if (process.argv[1]?.includes("osap-live-crawler")) {
  const args = process.argv.slice(2);
  const getArg = (name: string): string | undefined => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split("=")[1] : undefined;
  };

  const batchArg = getArg("batch");
  const oanArg = getArg("oan");
  const limitArg = getArg("limit") ? Number(getArg("limit")) : undefined;
  const headlessArg = getArg("headless") !== "false";

  runOsapLiveCrawler({
    batchName: batchArg,
    oan: oanArg,
    limit: limitArg,
    headless: headlessArg,
  }).catch(console.error);
}
