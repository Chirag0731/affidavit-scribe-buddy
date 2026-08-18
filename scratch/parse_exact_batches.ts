import * as XLSX from "xlsx";
import * as fs from "fs";
import type { OsapClient, OsapApplicationStatus, OsapPriority } from "../src/types/osap";

interface RawRow {
  batchName: string;
  name: string;
  email: string;
  oan: string;
  pass: string;
  lmsPassword: string;
  inCharge: string;
  inChargeOpps: string;
  notes: string;
  school: string;
  program: string;
  appStatus: string;
  funding: string;
  msfaa: string;
  docStatus: string;
}

function cleanStr(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function cleanName(raw: string): string {
  let name = raw.replace(/^[.\s\-_,]+/, "").replace(/[.\s\-_,]+$/, "").trim();
  if (name.startsWith(".")) name = name.slice(1).trim();
  return name;
}

function normalizeStaff(inCharge: string, opps: string): string {
  const staff = inCharge.trim();
  const ops = opps.trim();
  if (staff && ops) {
    return `${staff} (Sales) / ${ops} (Operations)`;
  }
  const s = staff || ops;
  if (!s) return "Sales";
  if (/firas/i.test(s)) return "Firas (Sales)";
  if (/jb/i.test(s)) return "JB (Operations)";
  if (/abdul/i.test(s)) return "Abdul (Operations)";
  if (/chirag/i.test(s)) return "Chirag (Operations)";
  if (/kaavish/i.test(s)) return "Kaavish (Operations)";
  if (/simran/i.test(s)) return "Simran (Sales)";
  if (/henry/i.test(s)) return "Henry (Sales)";
  if (/michael/i.test(s)) return "Michael (Sales)";
  if (/samar/i.test(s)) return "Samar (Operations)";
  if (/aman/i.test(s)) return "Aman (Operations)";
  return `${s} (Staff)`;
}

function main() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });
  const allRows: RawRow[] = [];

  const BATCH_ORDER = [
    "March 2nd List",
    "March 23rd List",
    "April 13th List",
    "April 27th List",
    "May 11th List",
    "May 25th List",
    "June 15th List",
    "June 29th List",
    "July 13th List",
    "July 27th List",
    "August 24th List",
    "Hold",
  ];

  // Also include any other sheet if present
  const orderedSheetNames = [
    ...BATCH_ORDER.filter((b) => workbook.SheetNames.includes(b)),
    ...workbook.SheetNames.filter((s) => !BATCH_ORDER.includes(s)),
  ];

  console.log("Processing Sheets in Order:", orderedSheetNames);

  for (const sheetName of orderedSheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (rows.length === 0) continue;

    let sheetClientCount = 0;
    for (const row of rows) {
      const getField = (aliases: string[]): string => {
        for (const k of Object.keys(row)) {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (aliases.some((a) => normK === a.toLowerCase().replace(/[^a-z0-9]/g, ""))) {
            return cleanStr(row[k]);
          }
        }
        return "";
      };

      const name = getField(["Names", "Name", "Student Name", "Client Name", "Full Name", "Student"]);
      const oan = getField(["OAN", "OAN Number", "Access Number"]);
      const pass = getField(["Pass", "Password", "PWD"]);
      const lmsPassword = getField(["LMS Password", "LMS PW"]);
      const email = getField(["Email", "Email Address", "Mail"]);
      const inCharge = getField(["In charge", "In Charge", "Incharge", "Staff", "Agent", "__EMPTY_1"]);
      const inChargeOpps = getField(["In charge (Opps)", "In Charge (Opps)", "Opps", "Ops", "Opps Incharge", "__EMPTY"]);
      const college = getField(["College", "School", "Institution"]);
      const program = getField(["Program Name", "Program", "Course"]);
      const appStatus = getField(["Application Status", "Status", "OSAP Status", "OSAP Applied"]);
      const funding = getField(["Funding", "Funding Status", "Calculated Funding", "Grant/Loan"]);
      const msfaa = getField(["MSFAA", "MSFAA Status"]);
      const docStatus = getField(["Registration Form (College)", "Registeration Form 2", "Form Submitted", "Form 2 Submitted", "OSAP Docs"]);
      const notes = getField(["Notes", "Notes (College)", "Notes (JB)", "Comments"]);

      if (!name && !oan && !email) continue;
      if (name.toLowerCase() === "names" || name.toLowerCase() === "name") continue;

      allRows.push({
        batchName: sheetName,
        name,
        email,
        oan,
        pass,
        lmsPassword,
        inCharge,
        inChargeOpps,
        notes,
        school: college || "Eight Branches",
        program: program || "Acupuncture 50 weeks",
        appStatus,
        funding,
        msfaa,
        docStatus,
      });
      sheetClientCount++;
    }
    console.log(`Sheet "${sheetName}": ${sheetClientCount} clients extracted.`);
  }

  console.log(`Total extracted records: ${allRows.length}`);

  const clients: OsapClient[] = [];
  for (let i = 0; i < allRows.length; i++) {
    const raw = allRows[i];
    const fullName = cleanName(raw.name);
    if (!fullName || fullName.length < 2) continue;

    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || "Student";
    const lastName = parts.slice(1).join(" ") || "";

    const isOanNumber = /^\d+$/.test(raw.oan.replace(/\s+/g, ""));
    const oan = isOanNumber ? raw.oan.trim() : (raw.oan && raw.oan !== "FAO" ? raw.oan.trim() : null);
    const email = raw.email.includes("@") ? raw.email.trim() : (!isOanNumber && raw.oan.includes("@") ? raw.oan.trim() : null);

    const school = raw.school && raw.school.length > 2 && raw.school !== "Application Closed"
      ? raw.school.trim()
      : "Eight Branches";

    const program = raw.program && raw.program.length > 2
      ? raw.program.trim()
      : "Acupuncture 50 weeks";

    const isDiscrepancy = raw.batchName === "Hold" || /discrepancy|hold|sin/i.test(fullName) || /discrepancy|sin|hold|dob|age/i.test(raw.notes);
    const isDenied = /closed|denied|reject/i.test(raw.appStatus) || /closed|denied/i.test(raw.school);
    const isApproved = /approved|paid/i.test(raw.appStatus);

    let appStatus: OsapApplicationStatus = "not_started";
    let priority: OsapPriority = "medium";
    let actionRequired = false;
    let actionSummary: string | null = null;

    if (isDiscrepancy) {
      appStatus = "action_required";
      priority = "high";
      actionRequired = true;
      actionSummary = raw.notes ? raw.notes.split("\n")[0] : "SIN Registry / Verification Hold";
    } else if (isDenied) {
      appStatus = "denied";
      priority = "high";
      actionRequired = true;
      actionSummary = "Application closed / ineligible.";
    } else if (isApproved) {
      appStatus = "approved";
      priority = "medium";
    }

    const assignedStaff = normalizeStaff(raw.inCharge, raw.inChargeOpps);

    clients.push({
      id: `osap-client-${String(i + 1).padStart(3, "0")}-${fullName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      user_id: "system",
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email,
      phone: null,
      oan,
      school,
      program,
      application_year: "2026",
      batch_name: raw.batchName,
      study_period: "Full-Time (50 weeks)",
      assigned_staff: assignedStaff,
      credential_status: raw.pass ? "connected" : (oan ? "requires_verification" : "missing"),
      application_status: appStatus,
      funding_status: raw.funding && raw.funding !== "N/a" ? raw.funding : "Pending Assessment",
      msfaa_status: /submitted|done/i.test(raw.msfaa) ? "submitted" : isDiscrepancy ? "required" : "submitted",
      document_status: /submitted|received|done/i.test(raw.docStatus) ? "submitted" : "under_review",
      priority,
      action_required: actionRequired,
      action_required_summary: actionSummary,
      notes: raw.notes ? raw.notes.trim() : null,
      created_at: new Date(Date.now() - (allRows.length - i) * 60000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Sort by Batch Order, then A-Z by full_name
  clients.sort((a, b) => {
    const batchA = BATCH_ORDER.indexOf(a.batch_name || "");
    const batchB = BATCH_ORDER.indexOf(b.batch_name || "");
    if (batchA !== batchB && batchA !== -1 && batchB !== -1) {
      return batchA - batchB;
    }
    return a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
  });

  const tsContent = `// Auto-generated full OSAP client roster separated by batch
import type { OsapClient } from "@/types/osap";

export const OSAP_BATCH_ORDER = ${JSON.stringify(BATCH_ORDER, null, 2)};

export const ALL_OSAP_CLIENTS: OsapClient[] = ${JSON.stringify(clients, null, 2)};
`;

  fs.writeFileSync("src/lib/osap-seed-data.ts", tsContent);
  console.log(`Written ${clients.length} clients separated into batches to src/lib/osap-seed-data.ts`);
}

main();
