const fs = require("fs");
const path = require("path");

const filePath = path.resolve("src/lib/osap-seed-data.ts");
let content = fs.readFileSync(filePath, "utf8");

content = content.replace(/"batch_name":\s*"[^"]+"/g, '"batch_name": "General Batch"');
fs.writeFileSync(filePath, content, "utf8");

console.log("Successfully updated all clients in osap-seed-data.ts to 'General Batch'");
