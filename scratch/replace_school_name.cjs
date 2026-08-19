const fs = require("fs");
const path = require("path");

const filePath = path.resolve(__dirname, "../src/lib/osap-seed-data.ts");
let content = fs.readFileSync(filePath, "utf8");
content = content.replaceAll('"Eight Branches"', '"College"');
content = content.replaceAll('Eight Branches', 'College');
fs.writeFileSync(filePath, content, "utf8");
console.log("Updated osap-seed-data.ts to College");
