import * as XLSX from "xlsx";
import * as fs from "fs";

function checkPaymentFunding() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });
  const paymentValues = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    for (const row of rows) {
      for (const [k, v] of Object.entries(row)) {
        const valStr = String(v).trim();
        if (/payment|release|paid|fund|disburs/i.test(k) || /payment|release|paid|funded|disburs/i.test(valStr)) {
          paymentValues.add(`[Sheet "${sheetName}"] Col "${k}": "${valStr}"`);
        }
      }
    }
  }

  console.log("Found Payment / Release / Funding references:\n", Array.from(paymentValues).slice(0, 50));
}

checkPaymentFunding();
