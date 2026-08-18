import * as XLSX from "xlsx";
import * as fs from "fs";

function checkMsfaaData() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });
  const msfaaStats: Record<string, { total: number; pendingOrBlank: number; samplePending: string[] }> = {};

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    let total = 0;
    let pendingOrBlank = 0;
    const samplePending: string[] = [];

    for (const row of rows) {
      const getField = (aliases: string[]): string => {
        for (const k of Object.keys(row)) {
          const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (aliases.some((a) => normK === a.toLowerCase().replace(/[^a-z0-9]/g, ""))) {
            return String(row[k]).trim();
          }
        }
        return "";
      };

      const name = getField(["Names", "Name", "Student Name"]);
      if (!name || name.toLowerCase() === "names" || name.toLowerCase() === "name") continue;

      total++;
      const msfaa = getField(["MSFAA", "MSFAA Status", "MSFAA "]);
      const isSubmitted = /submitted|done|completed/i.test(msfaa);

      if (!isSubmitted) {
        pendingOrBlank++;
        if (samplePending.length < 5) {
          samplePending.push(`${name} (MSFAA: "${msfaa || "Blank/Pending"}")`);
        }
      }
    }

    msfaaStats[sheetName] = { total, pendingOrBlank, samplePending };
  }

  console.log("=== MSFAA Analysis Across Sheets ===");
  for (const [sheet, data] of Object.entries(msfaaStats)) {
    console.log(`\nSheet: "${sheet}" - Total: ${data.total} | Pending/Missing MSFAA: ${data.pendingOrBlank}`);
    if (data.samplePending.length > 0) {
      console.log("  Sample Pending Students:\n   - " + data.samplePending.join("\n   - "));
    }
  }
}

checkMsfaaData();
