import * as XLSX from "xlsx";
import * as fs from "fs";

function analyzeAllSheetColumns() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (rawRows.length === 0) continue;

    console.log(`\n================ Sheet: "${sheetName}" (${rawRows.length} rows) ================`);
    const colKeys = Object.keys(rawRows[0]);
    console.log("Columns:", colKeys);

    // Print first 5 rows with non-empty values
    for (let i = 0; i < Math.min(5, rawRows.length); i++) {
      const row = rawRows[i];
      const summary: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v !== "") summary[k] = String(v);
      }
      console.log(`Row ${i + 1}:`, summary);
    }
  }
}

analyzeAllSheetColumns();
