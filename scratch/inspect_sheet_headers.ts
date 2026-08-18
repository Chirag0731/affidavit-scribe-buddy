import * as XLSX from "xlsx";
import * as fs from "fs";

function inspectAllSheets() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 });
    console.log(`\n=== Sheet: "${sheetName}" ===`);
    console.log("Header row (row 0):", rows[0]);
    if (rows.length > 1) {
      console.log("Sample row 1:", rows[1]);
    }
  }
}

inspectAllSheets();
