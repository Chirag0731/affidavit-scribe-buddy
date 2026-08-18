const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 1. Get raw file from commit 2a4cf7f and save to temp file
const rawCode = execSync("git show 2a4cf7f:src/lib/osap-seed-data.ts", { maxBuffer: 20 * 1024 * 1024 }).toString();
fs.writeFileSync("scratch/temp_seed.ts", rawCode, "utf8");

// Parse the array by evaluating or regex
const firstBracket = rawCode.indexOf("export const ALL_OSAP_CLIENTS: OsapClient[] = [");
const arrayCode = rawCode.slice(firstBracket + "export const ALL_OSAP_CLIENTS: OsapClient[] = ".length).trim();
// Strip trailing semicolon
const cleanArrayCode = arrayCode.endsWith(";") ? arrayCode.slice(0, -1) : arrayCode;

let clients;
try {
  clients = JSON.parse(cleanArrayCode);
} catch {
  // If JSON.parse fails, use eval in safe sandbox
  clients = eval(cleanArrayCode);
}

console.log(`Loaded ${clients.length} clients from 2a4cf7f.`);

// Date / non-name pattern regexes
const datePatterns = [
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{1,2}(st|nd|rd|th)?\b/gi,
  /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b202[4-9]\b/g,
];

const junkPatterns = [
  /\bfao\s*(issue|issued|hold)?\b/gi,
  /\bissue[d]?\s*(by\s*college)?\b/gi,
  /\bcompleted\b/gi,
  /\bpending\b/gi,
  /\bnot\s*started\b/gi,
  /\bgeneral\s*batch\b/gi,
];

function sanitizeName(raw) {
  if (!raw) return "";
  let name = raw.trim();

  // Remove date patterns
  for (const pat of datePatterns) {
    name = name.replace(pat, " ");
  }

  // Remove junk patterns
  for (const pat of junkPatterns) {
    name = name.replace(pat, " ");
  }

  // Remove trailing/leading special characters, dashes, parentheses, slashes, numbers
  name = name.replace(/[0-9\(\)\[\]\{\}\/\\#@!$%^&*_+=\<\>\|\?~`:;]/g, " ");
  name = name.replace(/[-–—]+/g, " ");
  name = name.replace(/\s+/g, " ").trim();

  // Capitalize properly
  if (name.length > 0) {
    name = name
      .split(" ")
      .filter(w => w.length > 0)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return name;
}

const cleanedClients = [];

for (const c of clients) {
  const cleanFullName = sanitizeName(c.full_name || `${c.first_name || ""} ${c.last_name || ""}`);

  // Skip completely invalid names (e.g. 1-2 char noise or pure junk)
  if (!cleanFullName || cleanFullName.length < 3 || /^(fao|issue|none|n\/a|test)$/i.test(cleanFullName)) {
    console.log(`Skipping invalid junk row: "${c.full_name}"`);
    continue;
  }

  const parts = cleanFullName.split(" ");
  const cleanFirstName = parts[0];
  const cleanLastName = parts.slice(1).join(" ") || parts[0];

  // Clean note
  let cleanNotes = c.notes || "";
  if (/fao/i.test(c.full_name || "") && !cleanNotes.includes("FAO")) {
    cleanNotes = cleanNotes ? `${cleanNotes} • FAO record` : "FAO record";
  }

  cleanedClients.push({
    ...c,
    first_name: cleanFirstName,
    last_name: cleanLastName,
    full_name: cleanFullName,
    notes: cleanNotes || null,
  });
}

console.log(`Sanitized ${cleanedClients.length} real student names.`);

// Sort A-Z
cleanedClients.sort((a, b) => a.full_name.localeCompare(b.full_name));

const fileOutput = `// Auto-generated full OSAP client roster separated by batch
import type { OsapClient } from "@/types/osap";

export const OSAP_BATCH_ORDER = [
  "March 2nd List",
  "March 23rd List",
  "April 13th List",
  "April 27th List",
  "May 11th List",
  "May 25th List",
  "June 15th List",
  "June 29th List",
  "July 13th List",
  "July 27th List",
  "August 24th List",
  "Hold"
];

export const ALL_OSAP_CLIENTS: OsapClient[] = ${JSON.stringify(cleanedClients, null, 2)};
`;

fs.writeFileSync("src/lib/osap-seed-data.ts", fileOutput, "utf8");
console.log("Successfully wrote sanitized dated-batch clients to src/lib/osap-seed-data.ts");
