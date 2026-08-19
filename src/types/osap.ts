export type OsapApplicationStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "processing"
  | "approved"
  | "partially_approved"
  | "funded"
  | "denied"
  | "action_required"
  | "documents_required"
  | "documents_under_review"
  | "information_required"
  | "completed"
  | "manual_review_required"
  | "audit_failed";

export type OsapDocumentStatus =
  | "not_submitted"
  | "submitted"
  | "received"
  | "under_review"
  | "approved"
  | "rejected"
  | "additional_information_required";

export type OsapMsfaaStatus =
  | "not_started"
  | "in_progress"
  | "required"
  | "submitted"
  | "completed"
  | "action_required";

export type OsapPriority = "low" | "medium" | "high" | "urgent";

export type OsapCredentialStatus = "connected" | "missing" | "requires_verification";

export type OsapActionStatus =
  | "open"
  | "in_progress"
  | "waiting_on_client"
  | "completed"
  | "dismissed";

export type OsapActionSeverity = "low" | "medium" | "high" | "critical";

export interface OsapClient {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  oan?: string | null;
  school?: string | null;
  program?: string | null;
  study_period?: string | null;
  application_year?: string | null;
  batch_name?: string | null;
  assigned_staff?: string | null;
  notes?: string | null;
  credential_status: OsapCredentialStatus;
  application_status: OsapApplicationStatus;
  funding_status?: string | null;
  msfaa_status: OsapMsfaaStatus;
  document_status: OsapDocumentStatus;
  priority: OsapPriority;
  action_required: boolean;
  action_required_summary?: string | null;
  last_audit_at?: string | null;
  next_audit_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OsapApplication {
  id: string;
  client_id: string;
  user_id: string;
  academic_year: string;
  status: OsapApplicationStatus;
  funding_calculated?: number | null;
  grant_amount?: number | null;
  loan_amount?: number | null;
  application_number?: string | null;
  submission_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OsapDocument {
  id: string;
  client_id: string;
  user_id: string;
  document_name: string;
  required: boolean;
  status: OsapDocumentStatus;
  submission_date?: string | null;
  rejection_reason?: string | null;
  instructions?: string | null;
  last_checked_at?: string | null;
  created_at: string;
}

export interface OsapAuditChange {
  id: string;
  audit_id: string;
  client_id: string;
  user_id: string;
  field_category: "application" | "funding" | "document" | "msfaa" | "general";
  field_name: string;
  previous_value: string;
  new_value: string;
  created_at: string;
}

export interface OsapAudit {
  id: string;
  client_id: string;
  client_name?: string;
  user_id: string;
  audit_type: "single" | "batch" | "scheduled";
  status: "success" | "changes_detected" | "manual_review_required" | "mfa_required" | "failed";
  summary?: string | null;
  changes_detected: OsapAuditChange[];
  raw_snapshot: Record<string, unknown>;
  conducted_by?: string | null;
  created_at: string;
}

export interface OsapActionItem {
  id: string;
  client_id: string;
  client_name?: string;
  user_id: string;
  title: string;
  description?: string | null;
  severity: OsapActionSeverity;
  status: OsapActionStatus;
  assigned_to?: string | null;
  due_date?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface OsapNote {
  id: string;
  client_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface OsapImportSummary {
  id: string;
  file_name: string;
  uploaded_by: string;
  total_records: number;
  new_clients: number;
  updated_clients: number;
  duplicates: number;
  errors: number;
  status: "completed" | "completed_with_errors" | "failed";
  created_at: string;
}

export interface OsapImportRowConflict {
  index: number;
  incoming: Partial<OsapClient> & { rawPassword?: string };
  existing: OsapClient;
  resolution: "keep_existing" | "update_existing" | "skip";
}

// Labels & Badge styling maps (Cleaned & aligned directly with Ontario OSAP Portal)
export const APPLICATION_STATUS_LABELS: Record<OsapApplicationStatus, { label: string; color: string; bg: string; border: string }> = {
  completed: { label: "Funded / Deposited", color: "text-emerald-300 font-bold", bg: "bg-emerald-500/25", border: "border-emerald-500/50" },
  funded: { label: "Funded / Deposited", color: "text-emerald-300 font-bold", bg: "bg-emerald-500/25", border: "border-emerald-500/50" },
  approved: { label: "Approved (Enrolment Required)", color: "text-emerald-400 font-semibold", bg: "bg-emerald-950/40", border: "border-emerald-700/50" },
  processing: { label: "Under Assessment", color: "text-amber-400 font-medium", bg: "bg-amber-950/40", border: "border-amber-700/40" },
  in_progress: { label: "Under Assessment", color: "text-amber-400 font-medium", bg: "bg-amber-950/40", border: "border-amber-700/40" },
  submitted: { label: "Under Assessment", color: "text-amber-400 font-medium", bg: "bg-amber-950/40", border: "border-amber-700/40" },
  documents_under_review: { label: "Docs Waiting on FAO Review", color: "text-cyan-400 font-medium", bg: "bg-cyan-950/40", border: "border-cyan-700/40" },
  action_required: { label: "Hold / Action Required", color: "text-rose-400 font-semibold", bg: "bg-rose-950/40", border: "border-rose-700/50" },
  documents_required: { label: "Hold / Action Required", color: "text-rose-400 font-semibold", bg: "bg-rose-950/40", border: "border-rose-700/50" },
  information_required: { label: "Hold / Action Required", color: "text-rose-400 font-semibold", bg: "bg-rose-950/40", border: "border-rose-700/50" },
  partially_approved: { label: "Approved (Enrolment Required)", color: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-700/40" },
  denied: { label: "Denied / Ineligible", color: "text-rose-400 font-semibold", bg: "bg-rose-950/40", border: "border-rose-700/50" },
  manual_review_required: { label: "Hold / Action Required", color: "text-rose-400", bg: "bg-rose-950/40", border: "border-rose-700/50" },
  audit_failed: { label: "Audit Failed / Retry", color: "text-rose-400", bg: "bg-rose-950/40", border: "border-rose-700/50" },
  not_started: { label: "Not Started", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border" },
};

export const DOCUMENT_STATUS_LABELS: Record<OsapDocumentStatus, { label: string; color: string; bg: string; border: string }> = {
  approved: { label: "All Documents Approved", color: "text-emerald-400 font-semibold", bg: "bg-emerald-950/40", border: "border-emerald-700/40" },
  under_review: { label: "Upload Received (Waiting on FAO)", color: "text-cyan-400 font-medium", bg: "bg-cyan-950/40", border: "border-cyan-700/40" },
  submitted: { label: "Upload Received (Waiting on FAO)", color: "text-cyan-400 font-medium", bg: "bg-cyan-950/40", border: "border-cyan-700/40" },
  received: { label: "Upload Received (Waiting on FAO)", color: "text-cyan-400 font-medium", bg: "bg-cyan-950/40", border: "border-cyan-700/40" },
  rejected: { label: "Document Rejected / Action Required", color: "text-rose-400 font-semibold", bg: "bg-rose-950/40", border: "border-rose-700/40" },
  additional_information_required: { label: "Document Rejected / Action Required", color: "text-rose-400 font-semibold", bg: "bg-rose-950/40", border: "border-rose-700/40" },
  not_submitted: { label: "Not Submitted", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border" },
};

export const MSFAA_STATUS_LABELS: Record<OsapMsfaaStatus, { label: string; color: string; bg: string }> = {
  completed: { label: "Completed Online", color: "text-emerald-400 font-semibold", bg: "bg-emerald-950/40" },
  submitted: { label: "Completed Online", color: "text-emerald-400 font-semibold", bg: "bg-emerald-950/40" },
  required: { label: "Pending Online Signature", color: "text-amber-400 font-semibold", bg: "bg-amber-950/40" },
  not_started: { label: "Pending Online Signature", color: "text-amber-400 font-semibold", bg: "bg-amber-950/40" },
  in_progress: { label: "Pending Online Signature", color: "text-amber-400 font-semibold", bg: "bg-amber-950/40" },
  action_required: { label: "Pending Online Signature", color: "text-rose-400 font-semibold", bg: "bg-rose-950/40" },
};

export const PRIORITY_CONFIG: Record<OsapPriority, { label: string; color: string; bg: string; dot: string }> = {
  low: { label: "Low", color: "text-muted-foreground", bg: "bg-muted/40", dot: "bg-muted-foreground" },
  medium: { label: "Medium", color: "text-blue-400", bg: "bg-blue-900/20", dot: "bg-blue-400" },
  high: { label: "High", color: "text-amber-400", bg: "bg-amber-900/20", dot: "bg-amber-400" },
  urgent: { label: "Urgent", color: "text-rose-400", bg: "bg-rose-900/20", dot: "bg-rose-500" },
};

export const CREDENTIAL_STATUS_CONFIG: Record<OsapCredentialStatus, { label: string; color: string; bg: string; icon: string }> = {
  connected: { label: "Connected", color: "text-emerald-400", bg: "bg-emerald-900/20", icon: "CheckCircle" },
  missing: { label: "Missing", color: "text-muted-foreground", bg: "bg-muted/40", icon: "AlertCircle" },
  requires_verification: { label: "Requires Verification", color: "text-amber-400", bg: "bg-amber-900/20", icon: "Clock" },
};

export const ACTION_STATUS_CONFIG: Record<OsapActionStatus, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "text-red-400", bg: "bg-red-900/20" },
  in_progress: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-900/20" },
  waiting_on_client: { label: "Waiting on Client", color: "text-blue-400", bg: "bg-blue-900/20" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-900/20" },
  dismissed: { label: "Dismissed", color: "text-muted-foreground", bg: "bg-muted/30" },
};

export const ACTION_SEVERITY_CONFIG: Record<OsapActionSeverity, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-muted-foreground", bg: "bg-muted/40" },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-900/20" },
  high: { label: "High", color: "text-orange-400", bg: "bg-orange-900/20" },
  critical: { label: "Critical", color: "text-rose-400", bg: "bg-rose-900/20" },
};

export const DEFAULT_OSAP_PRESETS = {
  school: "College",
  program: "Acupuncture 50 weeks",
  application_year: "2026",
  application_status: "not_started" as OsapApplicationStatus,
  priority: "medium" as OsapPriority,
  staff_roles: ["Sales", "Operations"],
  staff_members: [
    "Sales",
    "Operations",
    "Firas (Sales)",
    "JB (Operations)",
    "Abdul (Operations)",
  ],
};

export const OSAP_BATCH_ORDER: string[] = [
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
  "Hold",
];

export interface OsapEmailProfile {
  id: string;
  client_id: string;
  user_id: string;
  primary_email: string;
  college_email?: string | null;
  secondary_email?: string | null;
  preferred_channel: "primary" | "college" | "secondary";
  status: "active" | "unverified" | "bounced" | "opted_out";
  notify_msfaa_reminders: boolean;
  notify_document_status: boolean;
  notify_funding_release: boolean;
  notify_audit_updates: boolean;
  notes?: string | null;
  last_contacted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OsapEmailLog {
  id: string;
  client_id: string;
  user_id: string;
  recipient_email: string;
  template_type: "msfaa_reminder" | "payment_released" | "documents_required" | "general_notice" | "custom";
  subject: string;
  body: string;
  sent_by: string;
  sent_at: string;
  status: "sent" | "draft" | "failed";
}

export const EMAIL_PROFILE_STATUS_CONFIG: Record<
  "active" | "unverified" | "bounced" | "opted_out",
  { label: string; color: string; bg: string }
> = {
  active: { label: "Active & Verified", color: "text-emerald-400", bg: "bg-emerald-900/20" },
  unverified: { label: "Unverified / Pending", color: "text-amber-400", bg: "bg-amber-900/20" },
  bounced: { label: "Bounced / Invalid", color: "text-rose-400", bg: "bg-rose-900/20" },
  opted_out: { label: "Opted Out", color: "text-muted-foreground", bg: "bg-muted/30" },
};
