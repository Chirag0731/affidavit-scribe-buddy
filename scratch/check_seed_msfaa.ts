import { ALL_OSAP_CLIENTS } from "../src/lib/osap-seed-data";

function checkSeed() {
  const submitted = ALL_OSAP_CLIENTS.filter((c) => c.msfaa_status === "submitted");
  const pending = ALL_OSAP_CLIENTS.filter((c) => c.msfaa_status !== "submitted");

  console.log(`ALL_OSAP_CLIENTS in seed-data:`);
  console.log(`Total: ${ALL_OSAP_CLIENTS.length}`);
  console.log(`MSFAA Submitted: ${submitted.length}`);
  console.log(`MSFAA Pending: ${pending.length}`);

  const byBatch: Record<string, { total: number; sub: number; pend: number }> = {};
  ALL_OSAP_CLIENTS.forEach((c) => {
    const b = c.batch_name || "General Batch";
    if (!byBatch[b]) byBatch[b] = { total: 0, sub: 0, pend: 0 };
    byBatch[b].total++;
    if (c.msfaa_status === "submitted") byBatch[b].sub++;
    else byBatch[b].pend++;
  });

  console.log("\nBreakdown by Batch:");
  console.table(byBatch);
}

checkSeed();
