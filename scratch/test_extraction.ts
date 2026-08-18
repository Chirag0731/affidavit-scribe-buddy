import * as XLSX from "xlsx";
import * as fs from "fs";

function testExtraction() {
  const fileBuf = fs.readFileSync("scratch/all_sheets.xlsx");
  const workbook = XLSX.read(fileBuf, { type: "buffer" });

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

    let msfaaSubmitted = 0;
    let msfaaPending = 0;
    let sampleSub: string[] = [];
    let samplePend: string[] = [];

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

      const msfaa = getField(["MSFAA", "MSFAA Status", "MSFAA "]);
      const osapApplied = getField(["OSAP Applied", "OSAP Status", "Status", "Application Status"]);
      const formSubmitted = getField(["Form Submitted", "Form 2 Submitted"]);
      const notes = getField(["Notes", "Notes (College)", "Notes (JB)"]);

      const isMsfaaDone = /submitted|done|completed|received/i.test(msfaa);

      if (isMsfaaDone) {
        msfaaSubmitted++;
        if (sampleSub.length < 3) sampleSub.push(`${name} -> MSFAA: "${msfaa}", OSAP: "${osapApplied}"`);
      } else {
        msfaaPending++;
        if (samplePend.length < 3) samplePend.push(`${name} -> MSFAA: "${msfaa}", OSAP: "${osapApplied}", Notes: "${notes}"`);
      }
    }

    console.log(`\nSheet: "${sheetName}" -> MSFAA Submitted: ${msfaaSubmitted} | MSFAA Pending: ${msfaaPending}`);
    if (sampleSub.length) console.log("  Submitted examples:", sampleSub);
    if (samplePend.length) console.log("  Pending examples:", samplePend);
  }
}

testExtraction();
