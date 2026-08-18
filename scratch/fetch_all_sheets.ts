import * as XLSX from "xlsx";
import * as fs from "fs";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1M_kJShWZ8034L5NZat-XyLOinQ-isikeqaf-pDFN6mQ/export?format=xlsx";
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync("scratch/all_sheets.xlsx", Buffer.from(buffer));

  const workbook = XLSX.read(buffer, { type: "array" });
  console.log("Sheet names in workbook:", workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
    console.log(`\n================ Sheet: "${sheetName}" (${data.length} rows) ================`);
    if (data.length > 0) {
      console.log("Headers:", Object.keys(data[0] as object));
      console.log("First 3 rows:", JSON.stringify(data.slice(0, 3), null, 2));
    }
  }
}

main().catch(console.error);
