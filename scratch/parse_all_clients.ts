import * as XLSX from "xlsx";
import * as fs from "fs";

interface ClientRecord {
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

function cleanStr(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

async function parseAll() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });
  const allClients: ClientRecord[] = [];

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (rows.length === 0) continue;

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
      const email = getField(["Email", "Email Address", "Mail"]);
      const inCharge = getField(["In charge", "In Charge", "Incharge", "In charge (Opps)", "Opps", "Staff", "Agent"]);
      const college = getField(["College", "School", "Institution"]);
      const program = getField(["Program Name", "Program", "Course"]);
      const appDate = getField(["Date of Application", "Application Date", "Date"]);
      const appStatus = getField(["Application Status", "Status", "OSAP Status"]);
      const funding = getField(["Funding", "Funding Status", "Calculated Funding", "Grant/Loan"]);
      const msfaa = getField(["MSFAA", "MSFAA Status"]);
      const docStatus = getField(["Registration Form (College)", "Registeration Form 2", "Form Submitted", "Form 2 Submitted"]);
      const notes = getField(["Notes", "Notes (College)", "Notes (JB)", "Comments"]);

      if (!name && !oan && !email) continue;
      if (name.toLowerCase() === "names" || name.toLowerCase() === "name" || name.toLowerCase() === "student") continue;

      allClients.push({
        sheetName,
        inCharge,
        name,
        oan,
        pass,
        email,
        college,
        program,
        appDate,
        appStatus,
        funding,
        msfaa,
        docStatus,
        notes,
      });
    }
  }

  console.log(`Total extracted raw rows across ${workbook.SheetNames.length} sheets: ${allClients.length}`);

  // Unique clients deduplication
  const uniqueMap = new Map<string, ClientRecord>();
  for (const c of allClients) {
    const normOan = c.oan.replace(/[^0-9]/g, "");
    const normEmail = c.email.toLowerCase().trim();
    const normName = c.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    const key = (normOan && normOan.length > 5) ? normOan : (normEmail || normName);
    if (!key) continue;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, { ...c });
    } else {
      const existing = uniqueMap.get(key)!;
      if (!existing.pass && c.pass) existing.pass = c.pass;
      if (!existing.email && c.email) existing.email = c.email;
      if (!existing.college && c.college) existing.college = c.college;
      if (!existing.program && c.program) existing.program = c.program;
      if (!existing.notes && c.notes) existing.notes = c.notes;
      if (!existing.inCharge && c.inCharge) existing.inCharge = c.inCharge;
      if (!existing.oan && c.oan) existing.oan = c.oan;
      if (c.name.length > existing.name.length && !c.name.includes("Discrepancy")) existing.name = c.name;
    }
  }

  const uniqueClients = Array.from(uniqueMap.values());
  console.log(`Total unique clients extracted: ${uniqueClients.length}`);

  // Sort A to Z by Name
  uniqueClients.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  fs.writeFileSync("scratch/parsed_all_clients.json", JSON.stringify(uniqueClients, null, 2));
  console.log("Saved to scratch/parsed_all_clients.json");
  console.log("\nFirst 15 clients A-Z:\n", uniqueClients.slice(0, 15).map((c, i) => `${i + 1}. ${c.name} (${c.oan ? "OAN: " + c.oan : "No OAN"}) - ${c.college || "Eight Branches"} / ${c.program || "Acupuncture 50 weeks"} [Staff: ${c.inCharge || "Sales"}]`).join("\n"));
  console.log("\nLast 15 clients A-Z:\n", uniqueClients.slice(-15).map((c, i) => `${uniqueClients.length - 15 + i + 1}. ${c.name} (${c.oan ? "OAN: " + c.oan : "No OAN"}) - ${c.college || "Eight Branches"} / ${c.program || "Acupuncture 50 weeks"} [Staff: ${c.inCharge || "Sales"}]`).join("\n"));
}

parseAll().catch(console.error);
