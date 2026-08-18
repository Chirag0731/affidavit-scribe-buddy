import * as fs from "fs";
import type { OsapClient, OsapApplicationStatus, OsapDocumentStatus, OsapMsfaaStatus, OsapPriority, OsapCredentialStatus } from "../src/types/osap";

interface RawClient {
  sheetName: string;
  inCharge: string;
  name: string;
  oan: string;
  pass: string;
  email: string;
  college: string;
  program: string;
  appDate: string;
  appStatus: string;
  funding: string;
  msfaa: string;
  docStatus: string;
  notes: string;
}

function cleanName(raw: string): string {
  let name = raw.replace(/^[.\s\-_,]+/, "").replace(/[.\s\-_,]+$/, "").trim();
  if (name.startsWith(".")) name = name.slice(1).trim();
  return name;
}

function normalizeStaff(raw: string): string {
  const s = raw.trim();
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
  if (/sales/i.test(s)) return "Sales";
  if (/opps|operations/i.test(s)) return "Operations";
  return `${s} (Staff)`;
}

function generate() {
  const rawList: RawClient[] = JSON.parse(fs.readFileSync("scratch/parsed_all_clients.json", "utf-8"));
  const clients: OsapClient[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const raw = rawList[i];
    const fullName = cleanName(raw.name);
    if (!fullName || fullName.length < 2) continue;

    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || "Student";
    const lastName = parts.slice(1).join(" ") || "";

    const isOanNumber = /^\d+$/.test(raw.oan.replace(/\s+/g, ""));
    const oan = isOanNumber ? raw.oan.trim() : (raw.oan && raw.oan !== "FAO" ? raw.oan.trim() : null);
    const email = raw.email.includes("@") ? raw.email.trim() : (!isOanNumber && raw.oan.includes("@") ? raw.oan.trim() : null);

    const school = raw.college && raw.college.length > 2 && raw.college !== "Application Closed"
      ? raw.college.trim()
      : "Eight Branches";

    const program = raw.program && raw.program.length > 2
      ? raw.program.trim()
      : "Acupuncture 50 weeks";

    const isDiscrepancy = /discrepancy|hold|sin/i.test(fullName) || /discrepancy|sin|hold|dob/i.test(raw.notes);
    const isDenied = /closed|denied|reject/i.test(raw.appStatus) || /closed|denied/i.test(raw.college);
    const isApproved = /approved|paid/i.test(raw.appStatus);

    let appStatus: OsapApplicationStatus = "not_started";
    let priority: OsapPriority = "medium";
    let actionRequired = false;
    let actionSummary: string | null = null;

    if (isDiscrepancy) {
      appStatus = "action_required";
      priority = "high";
      actionRequired = true;
      actionSummary = "SIN Registry personal information discrepancy. Application on hold.";
    } else if (isDenied) {
      appStatus = "denied";
      priority = "high";
      actionRequired = true;
      actionSummary = "Application closed / ineligible.";
    } else if (isApproved) {
      appStatus = "approved";
      priority = "medium";
    }

    const assignedStaff = normalizeStaff(raw.inCharge);

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
      created_at: new Date(Date.now() - (rawList.length - i) * 60000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Sort A-Z by full_name
  clients.sort((a, b) => a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" }));

  console.log(`Successfully prepared ${clients.length} cleaned clients sorted A-Z.`);

  const tsContent = `// Auto-generated full OSAP client roster extracted across all sheets in spreadsheet
import type { OsapClient } from "@/types/osap";

export const ALL_OSAP_CLIENTS: OsapClient[] = ${JSON.stringify(clients, null, 2)};
`;

  fs.writeFileSync("src/lib/osap-seed-data.ts", tsContent);
  console.log("Written to src/lib/osap-seed-data.ts");
}

generate();
