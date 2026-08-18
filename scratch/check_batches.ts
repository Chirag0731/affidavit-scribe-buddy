import * as XLSX from "xlsx";
import * as fs from "fs";

function main() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });
  console.log("ALL Sheet Names in Workbook:\n", workbook.SheetNames);

  const targetBatches = [
    "May 11th List",
    "May 25th List",
    "June 15th List",
    "June 29th List",
    "July 13th List",
    "July 27th List",
    "August 24th List",
    "Hold",
  ];

  for (const target of targetBatches) {
    const found = workbook.SheetNames.find((s) => s.trim().toLowerCase() === target.trim().toLowerCase());
    console.log(`Target batch: "${target}" -> Found in workbook? ${found ? `YES ("${found}")` : "NO"}`);
    if (found) {
      const ws = workbook.Sheets[found];
      const rows = XLSX.utils.sheet_to_json(ws);
      console.log(`  Row count in "${found}": ${rows.length}`);
    }
  }
}

main();
