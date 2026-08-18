import type {
  OsapClient,
  OsapAudit,
  OsapAuditChange,
  OsapActionItem,
  OsapDocument,
  OsapApplicationStatus,
  OsapDocumentStatus,
  OsapMsfaaStatus,
} from "@/types/osap";

export type AuditScenario =
  | "live_file_audit"
  | "approved"
  | "processing"
  | "denied"
  | "rejected_documents"
  | "documents_under_review"
  | "msfaa_incomplete"
  | "mfa_required"
  | "portal_unavailable"
  | "manual_review";

export interface AuditExecutionResult {
  client: OsapClient;
  audit: OsapAudit;
  changes: OsapAuditChange[];
  newActions: OsapActionItem[];
  updatedDocuments: OsapDocument[];
  status: "success" | "changes_detected" | "mfa_required" | "manual_review_required" | "failed";
  message: string;
}

/**
 * Runs an automated simulation or staff-assisted audit on a client.
 * Detects differences against previous state, generates audit logs, and produces actionable tasks.
 */
export function runClientAudit(
  client: OsapClient,
  scenario: AuditScenario = "live_file_audit",
  manualOverrides?: {
    appStatus?: OsapApplicationStatus;
    fundingStatus?: string;
    docStatus?: OsapDocumentStatus;
    msfaaStatus?: OsapMsfaaStatus;
    notes?: string;
  },
): AuditExecutionResult {
  // If scenario is portal_unavailable
  if (scenario === "portal_unavailable") {
    const auditId = crypto.randomUUID();
    const audit: OsapAudit = {
      id: auditId,
      client_id: client.id,
      client_name: client.full_name,
      user_id: client.user_id,
      audit_type: "single",
      status: "failed",
      summary: "OSAP Portal was unavailable or connection timed out.",
      changes_detected: [],
      raw_snapshot: { error: "Portal Connection Timeout", timestamp: new Date().toISOString() },
      conducted_by: "Automated Auditor",
      created_at: new Date().toISOString(),
    };

    return {
      client: {
        ...client,
        application_status: "audit_failed",
        action_required: true,
        action_required_summary: "Portal unavailable during audit — retry later.",
        last_audit_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      audit,
      changes: [],
      newActions: [
        {
          id: crypto.randomUUID(),
          client_id: client.id,
          client_name: client.full_name,
          user_id: client.user_id,
          title: "Audit Failed — Portal Unavailable",
          description: "OSAP Portal connection timed out during automated audit. Retry audit when portal returns online.",
          severity: "medium",
          status: "open",
          created_at: new Date().toISOString(),
        },
      ],
      updatedDocuments: [],
      status: "failed",
      message: "OSAP Portal was unavailable. Recorded failed audit.",
    };
  }

  // If scenario is mfa_required
  if (scenario === "mfa_required") {
    const auditId = crypto.randomUUID();
    const audit: OsapAudit = {
      id: auditId,
      client_id: client.id,
      client_name: client.full_name,
      user_id: client.user_id,
      audit_type: "single",
      status: "mfa_required",
      summary: "OSAP Portal requires 2FA SMS code or authenticator approval.",
      changes_detected: [],
      raw_snapshot: { status: "MFA_PROMPT", timestamp: new Date().toISOString() },
      conducted_by: "Automated Auditor",
      created_at: new Date().toISOString(),
    };

    return {
      client: {
        ...client,
        credential_status: "requires_verification",
        action_required: true,
        action_required_summary: "OSAP Portal 2-Factor Authentication required.",
        last_audit_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      audit,
      changes: [],
      newActions: [
        {
          id: crypto.randomUUID(),
          client_id: client.id,
          client_name: client.full_name,
          user_id: client.user_id,
          title: "OSAP Portal MFA Code Required",
          description: "Contact client to receive the 2FA SMS verification code sent to their phone to resume audit.",
          severity: "high",
          status: "waiting_on_client",
          created_at: new Date().toISOString(),
        },
      ],
      updatedDocuments: [],
      status: "mfa_required",
      message: "MFA challenge detected. Audit paused for staff/client intervention.",
    };
  }

  // Determine new target state
  let newAppStatus: OsapApplicationStatus = client.application_status;
  let newFundingStatus: string = client.funding_status || "Pending Calculation";
  let newDocStatus: OsapDocumentStatus = client.document_status;
  let newMsfaaStatus: OsapMsfaaStatus = client.msfaa_status;

  if (manualOverrides?.appStatus) newAppStatus = manualOverrides.appStatus;
  if (manualOverrides?.fundingStatus) newFundingStatus = manualOverrides.fundingStatus;
  if (manualOverrides?.docStatus) newDocStatus = manualOverrides.docStatus;
  if (manualOverrides?.msfaaStatus) newMsfaaStatus = manualOverrides.msfaaStatus;

  if (!manualOverrides && scenario) {
    switch (scenario) {
      case "approved":
        newAppStatus = "approved";
        newFundingStatus = "$9,450 ($6,200 Grant / $3,250 Loan)";
        newDocStatus = "approved";
        newMsfaaStatus = "completed";
        break;
      case "processing":
        newAppStatus = "processing";
        newFundingStatus = "Under Assessment";
        newDocStatus = "under_review";
        newMsfaaStatus = "submitted";
        break;
      case "denied":
        newAppStatus = "denied";
        newFundingStatus = "$0 (Income / Eligibility Threshold Exceeded)";
        newDocStatus = "rejected";
        newMsfaaStatus = "action_required";
        break;
      case "rejected_documents":
        newAppStatus = "action_required";
        newFundingStatus = "On Hold (Documents Incomplete)";
        newDocStatus = "rejected";
        newMsfaaStatus = "submitted";
        break;
      case "documents_under_review":
        newAppStatus = "documents_under_review";
        newFundingStatus = "Calculating...";
        newDocStatus = "under_review";
        newMsfaaStatus = "completed";
        break;
      case "msfaa_incomplete":
        newAppStatus = "action_required";
        newFundingStatus = "Approved — Disbursement Blocked (MSFAA Missing)";
        newDocStatus = "approved";
        newMsfaaStatus = "required";
        break;
      case "manual_review":
        newAppStatus = "manual_review_required";
        newFundingStatus = "Manual File Verification";
        newDocStatus = "additional_information_required";
        newMsfaaStatus = "in_progress";
        break;
    }
  } else if (!manualOverrides && !scenario) {
    // Default natural progression simulation
    if (client.application_status === "not_started" || client.application_status === "in_progress") {
      newAppStatus = "submitted";
      newDocStatus = "under_review";
      newMsfaaStatus = "submitted";
    } else if (client.application_status === "submitted" || client.application_status === "documents_under_review") {
      newAppStatus = "processing";
      newFundingStatus = "$8,800 ($5,500 Grant / $3,300 Loan)";
      newDocStatus = "approved";
      newMsfaaStatus = "completed";
    } else if (client.application_status === "processing") {
      newAppStatus = "approved";
      newFundingStatus = "$10,200 ($7,000 Grant / $3,200 Loan)";
      newDocStatus = "approved";
      newMsfaaStatus = "completed";
    }
  }

  // Calculate change list
  const auditId = crypto.randomUUID();
  const changes: OsapAuditChange[] = [];

  if (client.application_status !== newAppStatus) {
    changes.push({
      id: crypto.randomUUID(),
      audit_id: auditId,
      client_id: client.id,
      user_id: client.user_id,
      field_category: "application",
      field_name: "Application Status",
      previous_value: client.application_status,
      new_value: newAppStatus,
      created_at: new Date().toISOString(),
    });
  }

  if (client.funding_status !== newFundingStatus) {
    changes.push({
      id: crypto.randomUUID(),
      audit_id: auditId,
      client_id: client.id,
      user_id: client.user_id,
      field_category: "funding",
      field_name: "Funding Status",
      previous_value: client.funding_status || "None",
      new_value: newFundingStatus,
      created_at: new Date().toISOString(),
    });
  }

  if (client.document_status !== newDocStatus) {
    changes.push({
      id: crypto.randomUUID(),
      audit_id: auditId,
      client_id: client.id,
      user_id: client.user_id,
      field_category: "document",
      field_name: "Document Status",
      previous_value: client.document_status,
      new_value: newDocStatus,
      created_at: new Date().toISOString(),
    });
  }

  if (client.msfaa_status !== newMsfaaStatus) {
    changes.push({
      id: crypto.randomUUID(),
      audit_id: auditId,
      client_id: client.id,
      user_id: client.user_id,
      field_category: "msfaa",
      field_name: "MSFAA Status",
      previous_value: client.msfaa_status,
      new_value: newMsfaaStatus,
      created_at: new Date().toISOString(),
    });
  }

  // Generate action items if issues are detected
  const newActions: OsapActionItem[] = [];
  let actionRequired = false;
  let actionSummary = "";

  if (newDocStatus === "rejected") {
    actionRequired = true;
    actionSummary = "Supporting documentation was rejected by OSAP.";
    newActions.push({
      id: crypto.randomUUID(),
      client_id: client.id,
      client_name: client.full_name,
      user_id: client.user_id,
      title: "Document Rejected by OSAP",
      description: "One or more uploaded affidavit/income verification documents were rejected. Review reason and upload replacement.",
      severity: "high",
      status: "open",
      created_at: new Date().toISOString(),
    });
  } else if (newMsfaaStatus === "required" || newMsfaaStatus === "action_required") {
    actionRequired = true;
    actionSummary = "MSFAA agreement is incomplete. Student must complete online loan agreement.";
    newActions.push({
      id: crypto.randomUUID(),
      client_id: client.id,
      client_name: client.full_name,
      user_id: client.user_id,
      title: "MSFAA Incomplete",
      description: "Student has not completed their Master Student Financial Assistance Agreement on the National Student Loans portal.",
      severity: "medium",
      status: "waiting_on_client",
      created_at: new Date().toISOString(),
    });
  } else if (newAppStatus === "denied") {
    actionRequired = true;
    actionSummary = "OSAP application denied. Review denial letter for appeal grounds.";
    newActions.push({
      id: crypto.randomUUID(),
      client_id: client.id,
      client_name: client.full_name,
      user_id: client.user_id,
      title: "OSAP Application Denied",
      description: "Application was denied. Check if an OSAP review or marital status appeal affidavit is applicable.",
      severity: "critical",
      status: "open",
      created_at: new Date().toISOString(),
    });
  }

  const updatedDocs: OsapDocument[] = [
    {
      id: crypto.randomUUID(),
      client_id: client.id,
      user_id: client.user_id,
      document_name: "Proof of Canadian Status / Identity",
      required: true,
      status: newDocStatus === "rejected" ? "rejected" : newDocStatus === "approved" ? "approved" : "under_review",
      submission_date: new Date().toISOString().split("T")[0],
      rejection_reason: newDocStatus === "rejected" ? "Image quality blurry or name mismatch" : null,
      last_checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      client_id: client.id,
      user_id: client.user_id,
      document_name: "Affidavit of Separation / Martial Status",
      required: true,
      status: newDocStatus,
      submission_date: new Date().toISOString().split("T")[0],
      rejection_reason: newDocStatus === "rejected" ? "Missing commissioner signature or notary seal" : null,
      last_checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  const auditStatus = (client.batch_name === "Hold" || client.action_required || newMsfaaStatus === "required" || newDocStatus === "rejected")
    ? "changes_detected"
    : changes.length > 0
    ? "changes_detected"
    : "success";

  let summary = "";
  let message = "";

  if (scenario === "live_file_audit") {
    if (client.batch_name === "Hold" || client.notes?.toLowerCase().includes("discrepancy")) {
      summary = `Hold / Discrepancy: ${client.notes ? client.notes.split("\n")[0] : "SIN Registry personal information mismatch"}`;
      message = `🚨 Hold / Discrepancy File: ${client.notes ? client.notes.split("\n")[0] : "SIN Registry personal information mismatch"}`;
    } else if (newMsfaaStatus === "required" || newMsfaaStatus === "action_required") {
      summary = `MSFAA Incomplete: Master Student Financial Assistance Agreement pending student online signature.`;
      message = `⚠️ MSFAA Incomplete: Student must complete online MSFAA on NSLSC portal.`;
    } else if (newDocStatus === "under_review") {
      summary = `Documents Under Review: Supporting college registration / PR verification under assessment.`;
      message = `📄 Documents Under Review: Awaiting portal document verification.`;
    } else {
      summary = `Application In Good Standing: All required documents and MSFAA agreement submitted.`;
      message = `✅ Application In Good Standing: MSFAA submitted, documents received.`;
    }
  } else {
    summary = changes.length > 0
      ? `${changes.length} change(s) detected: ${changes.map((c) => `${c.field_name} (${c.previous_value} → ${c.new_value})`).join(", ")}`
      : `Audit completed successfully. No changes detected since previous audit.`;
    message = changes.length > 0
      ? `Audit completed. ${changes.length} change(s) detected: ${changes.map((c) => c.field_name).join(", ")}`
      : `Audit completed. All records verified.`;
  }

  const audit: OsapAudit = {
    id: auditId,
    client_id: client.id,
    client_name: client.full_name,
    user_id: client.user_id,
    audit_type: "single",
    status: auditStatus,
    summary,
    changes_detected: changes,
    raw_snapshot: {
      appStatus: newAppStatus,
      fundingStatus: newFundingStatus,
      docStatus: newDocStatus,
      msfaaStatus: newMsfaaStatus,
      batch: client.batch_name,
      timestamp: new Date().toISOString(),
    },
    conducted_by: manualOverrides ? "Staff Manual Entry" : "Automated Auditor",
    created_at: new Date().toISOString(),
  };

  const updatedClient: OsapClient = {
    ...client,
    application_status: newAppStatus,
    funding_status: newFundingStatus,
    document_status: newDocStatus,
    msfaa_status: newMsfaaStatus,
    action_required: actionRequired || client.action_required,
    action_required_summary: actionSummary || client.action_required_summary,
    last_audit_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    client: updatedClient,
    audit,
    changes,
    newActions,
    updatedDocuments: updatedDocs,
    status: auditStatus,
    message,
  };
}
