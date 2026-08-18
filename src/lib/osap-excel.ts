import * as XLSX from "xlsx";
import type {
  OsapClient,
  OsapImportRowConflict,
  OsapApplicationStatus,
  OsapDocumentStatus,
  OsapMsfaaStatus,
  OsapPriority,
} from "@/types/osap";

export interface ColumnMappingField {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

export const TARGET_COLUMNS: ColumnMappingField[] = [
  { key: "full_name", label: "Full Name", aliases: ["full name", "client name", "name", "student name", "client"] },
  { key: "first_name", label: "First Name", aliases: ["first name", "firstname", "fname", "given name"] },
  { key: "last_name", label: "Last Name", aliases: ["last name", "lastname", "lname", "surname", "family name"] },
  { key: "email", label: "Email Address", aliases: ["email", "e-mail", "email address", "mail"] },
  { key: "phone", label: "Phone Number", aliases: ["phone", "telephone", "mobile", "cell", "contact"] },
  { key: "oan", label: "OAN (Ontario Access Number)", aliases: ["oan", "osap access number", "access number", "oan number"] },
  { key: "rawPassword", label: "OSAP Password / Credential Ref", aliases: ["password", "osap password", "credential", "pass", "pwd", "credential reference"] },
  { key: "school", label: "School / Institution", aliases: ["school", "institution", "college", "university", "campus"] },
  { key: "program", label: "Program of Study", aliases: ["program", "course", "degree", "field of study", "major"] },
  { key: "study_period", label: "Study Period", aliases: ["study period", "term", "semester", "period", "duration"] },
  { key: "application_year", label: "Application Year", aliases: ["application year", "year", "academic year", "session"] },
  { key: "application_status", label: "Application Status", aliases: ["application status", "status", "osap status", "osap applied"] },
  { key: "msfaa_status", label: "MSFAA Status", aliases: ["msfaa status", "msfaa", "msfaa signed", "msfaa complete"] },
  { key: "document_status", label: "Document Status", aliases: ["document status", "doc status", "documents", "docs"] },
  { key: "funding_status", label: "Funding Status", aliases: ["funding status", "funding", "calculated funding", "grant/loan"] },
  { key: "assigned_staff", label: "Assigned Staff", aliases: ["assigned staff", "staff", "caseworker", "agent", "advisor"] },
  { key: "priority", label: "Priority", aliases: ["priority", "urgency", "importance"] },
  { key: "notes", label: "Notes / Comments", aliases: ["notes", "comments", "remarks", "memo"] },
];

export interface ParsedSpreadsheet {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  initialMapping: Record<string, string>; // systemKey -> headerName
}

/**
 * Parses an Excel or CSV file into row objects and suggests column mapping.
 */
export async function parseExcelFile(file: File): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  if (jsonData.length === 0) {
    throw new Error("The selected spreadsheet contains no data rows.");
  }

  const rawHeaders = Object.keys(jsonData[0] || {});
  const headers = rawHeaders.filter((h) => h && !h.startsWith("__EMPTY"));

  const rows: Record<string, string>[] = jsonData.map((row) => {
    const cleanRow: Record<string, string> = {};
    for (const h of headers) {
      cleanRow[h] = String(row[h] ?? "").trim();
    }
    return cleanRow;
  });

  // Suggest mapping based on aliases
  const initialMapping: Record<string, string> = {};
  for (const target of TARGET_COLUMNS) {
    for (const h of headers) {
      const normalizedH = h.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
      if (target.aliases.some((alias) => normalizedH === alias || normalizedH.includes(alias))) {
        if (!Object.values(initialMapping).includes(h)) {
          initialMapping[target.key] = h;
          break;
        }
      }
    }
  }

  return {
    fileName: file.name,
    headers,
    rows,
    initialMapping,
  };
}

/**
 * Normalizes an imported status string into standardized OSAP application status.
 */
export function normalizeAppStatus(val?: string): OsapApplicationStatus {
  if (!val) return "not_started";
  const s = val.toLowerCase().trim();
  if (s.includes("deni") || s.includes("reject")) return "denied";
  if (s.includes("partially")) return "partially_approved";
  if (s.includes("approv") || s.includes("complete") || s.includes("paid")) return "approved";
  if (s.includes("action") || s.includes("required")) return "action_required";
  if (s.includes("review") || s.includes("under review")) return "documents_under_review";
  if (s.includes("process") || s.includes("pending")) return "processing";
  if (s.includes("submit")) return "submitted";
  if (s.includes("progress")) return "in_progress";
  return "not_started";
}

/**
 * Normalizes an imported status string into standardized OSAP document status.
 */
export function normalizeDocStatus(val?: string): OsapDocumentStatus {
  if (!val) return "not_submitted";
  const s = val.toLowerCase().trim();
  if (s.includes("reject") || s.includes("deni")) return "rejected";
  if (s.includes("approv") || s.includes("accept") || s.includes("valid")) return "approved";
  if (s.includes("under review") || s.includes("review")) return "under_review";
  if (s.includes("received")) return "received";
  if (s.includes("info") || s.includes("additional")) return "additional_information_required";
  if (s.includes("submit") || s.includes("uploaded")) return "submitted";
  return "not_submitted";
}

/**
 * Normalizes MSFAA status string.
 */
export function normalizeMsfaaStatus(val?: string): OsapMsfaaStatus {
  if (!val) return "not_started";
  const s = val.toLowerCase().trim();
  if (s.includes("done") || s.includes("complete") || s.includes("signed") || s.includes("yes")) return "completed";
  if (s.includes("submit")) return "submitted";
  if (s.includes("req") || s.includes("action") || s.includes("need")) return "required";
  if (s.includes("progress")) return "in_progress";
  return "not_started";
}

/**
 * Normalizes Priority string.
 */
export function normalizePriority(val?: string): OsapPriority {
  if (!val) return "medium";
  const s = val.toLowerCase().trim();
  if (s.includes("urg")) return "urgent";
  if (s.includes("high")) return "high";
  if (s.includes("low")) return "low";
  return "medium";
}

/**
 * Identifies duplicates against existing clients and categorizes new vs conflicting rows.
 */
export function analyzeImportRows(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  existingClients: OsapClient[],
): {
  newRows: (Partial<OsapClient> & { rawPassword?: string })[];
  conflicts: OsapImportRowConflict[];
  missingCount: number;
} {
  const newRows: (Partial<OsapClient> & { rawPassword?: string })[] = [];
  const conflicts: OsapImportRowConflict[] = [];
  let missingCount = 0;

  rows.forEach((row, index) => {
    let fullName = row[mapping.full_name || ""]?.trim() || "";
    const firstName = row[mapping.first_name || ""]?.trim() || "";
    const lastName = row[mapping.last_name || ""]?.trim() || "";

    if (!fullName && (firstName || lastName)) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (fullName && (!firstName || !lastName)) {
      const parts = fullName.split(/\s+/);
      // Auto-derive
    }

    if (!fullName && !row[mapping.oan || ""]?.trim() && !row[mapping.email || ""]?.trim()) {
      missingCount++;
      return;
    }

    const email = row[mapping.email || ""]?.trim() || null;
    const phone = row[mapping.phone || ""]?.trim() || null;
    const oan = row[mapping.oan || ""]?.trim() || null;
    const rawPassword = row[mapping.rawPassword || ""]?.trim() || undefined;

    const incoming: Partial<OsapClient> & { rawPassword?: string } = {
      first_name: firstName || fullName.split(/\s+/)[0] || "Client",
      last_name: lastName || fullName.split(/\s+/).slice(1).join(" ") || "",
      full_name: fullName || `${firstName} ${lastName}`.trim(),
      email,
      phone,
      oan,
      school: row[mapping.school || ""]?.trim() || null,
      program: row[mapping.program || ""]?.trim() || null,
      study_period: row[mapping.study_period || ""]?.trim() || null,
      application_year: row[mapping.application_year || ""]?.trim() || new Date().getFullYear().toString(),
      assigned_staff: row[mapping.assigned_staff || ""]?.trim() || null,
      notes: row[mapping.notes || ""]?.trim() || null,
      credential_status: rawPassword ? "connected" : oan ? "requires_verification" : "missing",
      application_status: normalizeAppStatus(row[mapping.application_status || ""]),
      msfaa_status: normalizeMsfaaStatus(row[mapping.msfaa_status || ""]),
      document_status: normalizeDocStatus(row[mapping.document_status || ""]),
      funding_status: row[mapping.funding_status || ""]?.trim() || null,
      priority: normalizePriority(row[mapping.priority || ""]),
      action_required: false,
      rawPassword,
    };

    // Match existing by OAN (primary) OR Email/Name
    const matched = existingClients.find((e) => {
      if (oan && e.oan && e.oan.replace(/\s+/g, "") === oan.replace(/\s+/g, "")) return true;
      if (email && e.email && e.email.toLowerCase() === email.toLowerCase()) return true;
      if (fullName && e.full_name && e.full_name.toLowerCase() === fullName.toLowerCase()) return true;
      return false;
    });

    if (matched) {
      conflicts.push({
        index,
        incoming,
        existing: matched,
        resolution: "update_existing",
      });
    } else {
      newRows.push(incoming);
    }
  });

  return { newRows, conflicts, missingCount };
}

/**
 * Generates and downloads an Excel spreadsheet of OSAP clients.
 * NEVER includes plain text passwords or sensitive raw credentials.
 */
export function exportClientsToExcel(clients: OsapClient[], filename = "OSAP_Clients_Export.xlsx") {
  const exportRows = clients.map((c) => ({
    "Client ID": c.id,
    "Full Name": c.full_name,
    "First Name": c.first_name,
    "Last Name": c.last_name,
    "Email": c.email || "",
    "Phone": c.phone || "",
    "OAN": c.oan || "",
    "Credential Status": c.credential_status,
    "School": c.school || "",
    "Program": c.program || "",
    "Study Period": c.study_period || "",
    "Application Year": c.application_year || "",
    "Application Status": c.application_status,
    "Funding Status": c.funding_status || "",
    "MSFAA Status": c.msfaa_status,
    "Document Status": c.document_status,
    "Priority": c.priority,
    "Action Required": c.action_required ? "Yes" : "No",
    "Action Summary": c.action_required_summary || "",
    "Assigned Staff": c.assigned_staff || "",
    "Last Audit": c.last_audit_at ? new Date(c.last_audit_at).toLocaleDateString() : "Never",
    "Notes": c.notes || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "OSAP Clients");

  XLSX.writeFile(workbook, filename);
}
