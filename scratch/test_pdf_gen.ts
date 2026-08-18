import { generateBatchAuditSessionPdf, generateSingleAuditPdf, type OsapBatchSessionReport } from "../src/lib/osap-pdf-generator";
import { ALL_OSAP_CLIENTS } from "../src/lib/osap-seed-data";
import type { OsapAudit } from "../src/types/osap";
import * as fs from "fs";

async function testPdf() {
  const sampleClients = ALL_OSAP_CLIENTS.slice(0, 10);

  const report: OsapBatchSessionReport = {
    id: "test-session-12345",
    title: "Audit Session - May 11th List",
    batchName: "May 11th List",
    scenario: "Smart Live Audit",
    conductedBy: "Staff Coordinator",
    createdAt: new Date().toISOString(),
    totalAudited: sampleClients.length,
    updatedCount: 8,
    pendingMsfaaCount: 2,
    holdCount: 0,
    fundedCount: 3,
    items: sampleClients.map((c, i) => ({
      client: c,
      status: i % 2 === 0 ? "success" : "warning",
      message: i % 2 === 0 ? "Updated: File active" : "Pending MSFAA Agreement",
      msfaaStatus: c.msfaa_status,
      notes: c.notes || "",
    })),
  };

  const batchBlob = await generateBatchAuditSessionPdf(report);
  const batchBuf = Buffer.from(await batchBlob.arrayBuffer());
  fs.writeFileSync("scratch/test_batch_report.pdf", batchBuf);
  console.log(`Generated batch report PDF: ${batchBuf.length} bytes`);

  const singleAudit: OsapAudit = {
    id: "audit-test-999",
    client_id: sampleClients[0].id,
    client_name: sampleClients[0].full_name,
    audit_type: "single",
    status: "success",
    summary: "Audit completed successfully. All documents approved.",
    changes_detected: [
      {
        id: "ch-1",
        audit_id: "audit-test-999",
        client_id: sampleClients[0].id,
        field_category: "application",
        field_name: "Application Status",
        previous_value: "submitted",
        new_value: "completed",
        created_at: new Date().toISOString(),
      },
    ],
    raw_snapshot: {},
    conducted_by: "Staff Coordinator",
    created_at: new Date().toISOString(),
  };

  const singleBlob = await generateSingleAuditPdf(singleAudit, sampleClients[0]);
  const singleBuf = Buffer.from(await singleBlob.arrayBuffer());
  fs.writeFileSync("scratch/test_single_report.pdf", singleBuf);
  console.log(`Generated single report PDF: ${singleBuf.length} bytes`);
}

testPdf().catch(console.error);
