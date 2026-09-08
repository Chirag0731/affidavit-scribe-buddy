import { supabase } from "@/integrations/supabase/client";
import type {
  OsapClient,
  OsapApplication,
  OsapDocument,
  OsapAudit,
  OsapAuditChange,
  OsapActionItem,
  OsapNote,
  OsapImportSummary,
} from "@/types/osap";
import { encryptCredential } from "./osap-crypto";
import { ALL_OSAP_CLIENTS } from "./osap-seed-data";

const LOCAL_CLIENTS_KEY = "neptora_osap_clients_v16_july27_without_zubair_complete";
const LOCAL_AUDITS_KEY = "neptora_osap_audits_cache_v16";
const LOCAL_ACTIONS_KEY = "neptora_osap_actions_cache_v16";
const LOCAL_DOCS_KEY = "neptora_osap_docs_cache_v16";
const LOCAL_NOTES_KEY = "neptora_osap_notes_cache_v16";
const LOCAL_IMPORTS_KEY = "neptora_osap_imports_cache_v16";

export const CONFIRMED_CRM_FUNDED_STUDENTS: string[] = [
  "fadamo abdullahi",
  "robert bende",
  "fawad hyder",
  "khawaza ahmed",
  "raheel mushtaq",
  "husnain riaz",
  "saif ali shaikh",
  "faiza sikander",
  "mehak mir",
  "mark rodo",
  "camar grant",
  "ayooluwa ajayi",
  "richard chaput",
  "jaiden hackett-mignon",
  "jaiden hackett mignon",
  "zubair baig",
  "khalil joseph",
  "chaltu jirata",
  "andrew lee",
  "emmanuil daphnis",
  "bwakila, basila antipas",
  "basila antipas bwakila",
  "basila bwakila",
  "zaniyar mohamad",
  "zaniyar mohammad",
  "kevon whyte",
  "suraj singh",
  "mubarak nazeer",
  "philip wisdom",
  "devon brady",
  "jinto paul",
  "syavash chalabi",
  "peterson mungai, nyakundi",
  "nyakundi peterson mungai",
  "peterson mungai",
  "darren davis",
  "jason martin",
  "jocelyn de los reyes",
  "jocelyn de lon reyes",
  "charles siler shannon",
  "charles shannon",
];

export function isStudentConfirmedFunded(client: { full_name?: string; oan?: string | null; application_status?: string; funding_status?: string | null; notes?: string | null }): boolean {
  if (client.application_status === "completed" || client.application_status === "funded") return true;
  const name = (client.full_name || "").toLowerCase().trim();
  if (CONFIRMED_CRM_FUNDED_STUDENTS.some((n) => name === n || name.includes(n) || n.includes(name))) return true;
  const funding = (client.funding_status || "").toLowerCase();
  const notes = (client.notes || "").toLowerCase();
  if (/deposited|disbursed|funds released|1st payment issued|fully funded|tuition paid/i.test(funding) || /deposited|funds released|1st payment issued/i.test(notes)) {
    return true;
  }
  return false;
}

// Build a seed map from ALL_OSAP_CLIENTS so each student's official cohort batch is permanently mapped
const SEED_BATCH_MAP = new Map<string, string>();
ALL_OSAP_CLIENTS.forEach((c) => {
  if (c.batch_name) {
    SEED_BATCH_MAP.set(c.id, c.batch_name);
    if (c.oan) SEED_BATCH_MAP.set(c.oan, c.batch_name);
    if (c.full_name) SEED_BATCH_MAP.set(c.full_name.trim().toLowerCase(), c.batch_name);
  }
});

export function resolveClientBatch(client: Partial<OsapClient>, fallbackId?: string): string {
  if (client.batch_name && client.batch_name !== "General Batch" && client.batch_name !== "undefined" && client.batch_name !== "null") {
    return client.batch_name;
  }
  const byId = client.id ? SEED_BATCH_MAP.get(client.id) : undefined;
  if (byId) return byId;
  const byFallback = fallbackId ? SEED_BATCH_MAP.get(fallbackId) : undefined;
  if (byFallback) return byFallback;
  const byOan = client.oan ? SEED_BATCH_MAP.get(client.oan) : undefined;
  if (byOan) return byOan;
  const byName = client.full_name ? SEED_BATCH_MAP.get(client.full_name.trim().toLowerCase()) : undefined;
  if (byName) return byName;
  return "July 27th List";
}

export const INITIAL_SPREADSHEET_CLIENTS: OsapClient[] = ALL_OSAP_CLIENTS
  .filter((c) => !/approved coe|hold might get removed|fao issues|^issues$|^removed$|start date.*end date/i.test(c.full_name.trim()))
  .map((c) => {
    const properBatch = resolveClientBatch(c);
    const nameLower = c.full_name.toLowerCase();
    const isAshishMehta = nameLower.includes("ashish mehta") || c.oan === "826915448";
    const isCarlaDionisio = nameLower.includes("carla dionisio") || c.oan === "816157205";
    const isJesseBonnah = nameLower.includes("jesse bonnah") || c.oan === "826794292";
    const isZubairBaig = nameLower.includes("zubair baig") || c.oan === "304675510";
    const isMarkRodo = nameLower.includes("mark rodo") || c.oan === "826771036";
    const isFunded = isStudentConfirmedFunded(c);

    if (isAshishMehta) {
      return {
        ...c,
        batch_name: "July 27th List",
        application_status: "documents_under_review",
        document_status: "under_review",
        msfaa_status: "completed",
        funding_status: "Under Assessment (Marital Status Docs Upload Received Aug 4/26 — FAO Review 3-6 Weeks)",
        action_required: false,
        action_required_summary: null,
      };
    }

    if (isCarlaDionisio) {
      return {
        ...c,
        batch_name: "June 29th List",
        application_status: "documents_under_review",
        document_status: "under_review",
        msfaa_status: "completed",
        funding_status: "Under Assessment (Marital Status Docs Upload Received Jun 29/26 — FAO Review 3-6 Weeks)",
        action_required: false,
        action_required_summary: null,
      };
    }

    if (isJesseBonnah) {
      return {
        ...c,
        batch_name: "July 27th List",
        application_status: "approved",
        document_status: "approved",
        msfaa_status: "completed",
        funding_status: "Est. Release: Sep 10/26 - Sep 14/26 ($15,750 1st Payment — COE Confirmed)",
        action_required: false,
        action_required_summary: null,
      };
    }

    if (isFunded) {
      return {
        ...c,
        batch_name: properBatch,
        application_status: "completed",
        document_status: "approved",
        msfaa_status: "completed",
        funding_status: c.funding_status && /deposited|disbursed|paid|funded/i.test(c.funding_status)
          ? c.funding_status
          : isZubairBaig
          ? "Funded: $18,664 Deposited ($9,225 Tuition Paid directly to School)"
          : isMarkRodo
          ? "Funded: $20,000 Total ($15,750 1st Payment Deposited to Bank)"
          : "Funded: 1st Payment Issued & Deposited (Tuition Paid to School)",
        action_required: false,
        action_required_summary: null,
      };
    }

    return {
      ...c,
      batch_name: properBatch,
      msfaa_status: c.msfaa_status || "submitted",
      action_required: c.action_required ?? false,
    };
  });

function getLocalCache<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalCache<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function resetOsapClientsToSpreadsheet(): OsapClient[] {
  try {
    localStorage.removeItem("neptora_osap_clients_cache");
    localStorage.removeItem("neptora_osap_clients_cache_v2");
    localStorage.removeItem("neptora_osap_clients_cache_v3");
    localStorage.removeItem("neptora_osap_clients_cache_v4");
    localStorage.removeItem("neptora_osap_clients_v9_clean_college_roster");
    localStorage.removeItem("neptora_osap_clients_v10_revert_general_batch_july27");
    localStorage.removeItem("neptora_osap_clients_v11_clean_crawler_ashish_fix");
    localStorage.removeItem("neptora_osap_clients_v12_clean_crawler_carla_dionisio_fix");
    localStorage.removeItem("neptora_osap_clients_v13_crm_funded_cohorts_fix");
    localStorage.removeItem("neptora_osap_clients_v14_jesse_bonnah_coe_fix");
    localStorage.removeItem("neptora_osap_clients_v15_july27_cohort_complete_calibration");
    localStorage.removeItem("neptora_active_audit_job_v1");
    localStorage.removeItem("neptora_latest_audit_session_v1");
    localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(INITIAL_SPREADSHEET_CLIENTS));
  } catch {
    /* ignore */
  }
  return INITIAL_SPREADSHEET_CLIENTS;
}

/**
 * Fetch all OSAP clients
 */
export async function getOsapClients(): Promise<OsapClient[]> {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("neptora_osap_clients_cache");
      localStorage.removeItem("neptora_osap_clients_cache_v2");
      localStorage.removeItem("neptora_osap_clients_cache_v3");
      localStorage.removeItem("neptora_osap_clients_v9_clean_college_roster");
      localStorage.removeItem("neptora_osap_clients_v10_revert_general_batch_july27");
      localStorage.removeItem("neptora_osap_clients_v11_clean_crawler_ashish_fix");
      localStorage.removeItem("neptora_osap_clients_v12_clean_crawler_carla_dionisio_fix");
      localStorage.removeItem("neptora_osap_clients_v13_crm_funded_cohorts_fix");
      localStorage.removeItem("neptora_osap_clients_v14_jesse_bonnah_coe_fix");
      localStorage.removeItem("neptora_osap_clients_v15_july27_cohort_complete_calibration");
      localStorage.removeItem("neptora_active_audit_job_v1");
      localStorage.removeItem("neptora_latest_audit_session_v1");
    }

    let clients: OsapClient[] = [];
    try {
      const { data, error } = await supabase
        .from("osap_clients" as never)
        .select("*")
        .order("full_name", { ascending: true });

      if (!error && data && (data as any).length > 0) {
        clients = data as unknown as OsapClient[];
      }
    } catch {
      /* fallback to local */
    }

    if (clients.length === 0) {
      const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
      clients = cached.length > 0 ? cached : INITIAL_SPREADSHEET_CLIENTS;
    }

    // Filter non-student header rows and sanitize
    const cleaned = clients
      .filter((c) => !/approved coe|hold might get removed|fao issues|^issues$|^removed$|start date.*end date/i.test(c.full_name.trim()))
      .map((c) => {
        const properBatch = resolveClientBatch(c);
        const nameLower = c.full_name.toLowerCase();
        const isAshishMehta = nameLower.includes("ashish mehta") || c.oan === "826915448";
        const isCarlaDionisio = nameLower.includes("carla dionisio") || c.oan === "816157205";
        const isJesseBonnah = nameLower.includes("jesse bonnah") || c.oan === "826794292";
        const isZubairBaig = nameLower.includes("zubair baig") || c.oan === "304675510";
        const isMarkRodo = nameLower.includes("mark rodo") || c.oan === "826771036";
        const isFunded = isStudentConfirmedFunded(c);

        if (isAshishMehta) {
          return {
            ...c,
            batch_name: "July 27th List",
            application_status: "documents_under_review" as const,
            document_status: "under_review" as const,
            msfaa_status: "completed" as const,
            funding_status: "Under Assessment (Marital Status Docs Upload Received Aug 4/26 — FAO Review 3-6 Weeks)",
            action_required: false,
            action_required_summary: null,
          };
        }

        if (isCarlaDionisio) {
          return {
            ...c,
            batch_name: "June 29th List",
            application_status: "documents_under_review" as const,
            document_status: "under_review" as const,
            msfaa_status: "completed" as const,
            funding_status: "Under Assessment (Marital Status Docs Upload Received Jun 29/26 — FAO Review 3-6 Weeks)",
            action_required: false,
            action_required_summary: null,
          };
        }

        if (isJesseBonnah) {
          return {
            ...c,
            batch_name: "July 27th List",
            application_status: "approved" as const,
            document_status: "approved" as const,
            msfaa_status: "completed" as const,
            funding_status: "Est. Release: Sep 10/26 - Sep 14/26 ($15,750 1st Payment — COE Confirmed)",
            action_required: false,
            action_required_summary: null,
          };
        }

        if (isFunded) {
          return {
            ...c,
            batch_name: properBatch,
            application_status: "completed" as const,
            document_status: "approved" as const,
            msfaa_status: "completed" as const,
            funding_status: c.funding_status && /deposited|disbursed|paid|funded/i.test(c.funding_status)
              ? c.funding_status
              : isZubairBaig
              ? "Funded: $18,664 Deposited ($9,225 Tuition Paid directly to School)"
              : isMarkRodo
              ? "Funded: $20,000 Total ($15,750 1st Payment Deposited to Bank)"
              : "Funded: 1st Payment Issued & Deposited (Tuition Paid to School)",
            action_required: false,
            action_required_summary: null,
          };
        }

        return {
          ...c,
          batch_name: properBatch,
          msfaa_status: c.msfaa_status || "submitted",
          action_required: c.action_required ?? false,
        };
      });

    setLocalCache(LOCAL_CLIENTS_KEY, cleaned);
    return cleaned.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } catch (err) {
    const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
    const clients = cached.length > 0 ? cached : INITIAL_SPREADSHEET_CLIENTS;
    const cleaned = clients
      .filter((c) => !/approved coe|hold might get removed|fao issues|^issues$|^removed$|start date.*end date/i.test(c.full_name.trim()))
      .map((c) => ({
        ...c,
        batch_name: resolveClientBatch(c),
      }));
    setLocalCache(LOCAL_CLIENTS_KEY, cleaned);
    return cleaned.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }
}


/**
 * Fetch single OSAP client by ID
 */
export async function getOsapClientById(id: string): Promise<OsapClient | null> {
  try {
    const { data, error } = await supabase
      .from("osap_clients" as never)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    const c = data as unknown as OsapClient;
    return {
      ...c,
      batch_name: resolveClientBatch(c),
    };
  } catch (err) {
    const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
    const c = cached.find((x) => x.id === id) || null;
    return c ? { ...c, batch_name: resolveClientBatch(c) } : null;
  }
}

/**
 * Save or update single client
 */
export async function saveOsapClient(
  client: Partial<OsapClient> & { rawPassword?: string },
  userId: string = client.user_id || "system",
): Promise<OsapClient> {
  const isUpdate = Boolean(client.id);
  const properBatch = resolveClientBatch(client);
  const payload = {
    ...client,
    batch_name: properBatch,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  delete payload.rawPassword;

  try {
    let saved: OsapClient;
    if (isUpdate) {
      const { data, error } = await supabase
        .from("osap_clients" as never)
        .update(payload as never)
        .eq("id", client.id!)
        .select("*")
        .single();
      if (error) throw error;
      saved = data as unknown as OsapClient;
    } else {
      const { data, error } = await supabase
        .from("osap_clients" as never)
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      saved = data as unknown as OsapClient;
    }

    if (!saved.batch_name || saved.batch_name === "General Batch") {
      saved.batch_name = properBatch;
    }

    // Save encrypted credentials if supplied
    if (client.rawPassword && saved.id) {
      const { encryptedData, iv } = await encryptCredential(userId, client.rawPassword);
      await supabase
        .from("osap_credentials" as never)
        .upsert({
          client_id: saved.id,
          user_id: userId,
          encrypted_data: encryptedData,
          iv,
          status: "connected",
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as never, { onConflict: "client_id" });
    }

    // Update local cache
    const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
    const updatedCache = isUpdate
      ? cached.map((c) => (c.id === saved.id ? saved : c))
      : [saved, ...cached];
    setLocalCache(LOCAL_CLIENTS_KEY, updatedCache);

    return saved;
  } catch (err) {
    // Fallback to local
    const fallbackId = client.id || crypto.randomUUID();
    const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
    const existing = cached.find((c) => c.id === fallbackId);

    const fallbackClient: OsapClient = {
      id: fallbackId,
      user_id: userId,
      first_name: client.first_name || existing?.first_name || "Client",
      last_name: client.last_name || existing?.last_name || "",
      full_name: client.full_name || existing?.full_name || `${client.first_name || ""} ${client.last_name || ""}`.trim(),
      email: client.email !== undefined ? client.email : existing?.email || null,
      phone: client.phone !== undefined ? client.phone : existing?.phone || null,
      oan: client.oan !== undefined ? client.oan : existing?.oan || null,
      school: client.school !== undefined ? client.school : existing?.school || null,
      program: client.program !== undefined ? client.program : existing?.program || null,
      study_period: client.study_period !== undefined ? client.study_period : existing?.study_period || null,
      batch_name: properBatch || existing?.batch_name || "July 27th List",
      application_year: client.application_year || existing?.application_year || "2026",
      assigned_staff: client.assigned_staff !== undefined ? client.assigned_staff : existing?.assigned_staff || null,
      notes: client.notes !== undefined ? client.notes : existing?.notes || null,
      credential_status: client.rawPassword ? "connected" : client.credential_status || existing?.credential_status || "missing",
      application_status: client.application_status || existing?.application_status || "not_started",
      funding_status: client.funding_status !== undefined ? client.funding_status : existing?.funding_status || null,
      msfaa_status: client.msfaa_status || existing?.msfaa_status || "not_started",
      document_status: client.document_status || existing?.document_status || "not_submitted",
      priority: client.priority || existing?.priority || "medium",
      action_required: client.action_required !== undefined ? client.action_required : existing?.action_required ?? false,
      action_required_summary: client.action_required_summary !== undefined ? client.action_required_summary : existing?.action_required_summary || null,
      last_audit_at: client.last_audit_at || existing?.last_audit_at || null,
      next_audit_at: client.next_audit_at || existing?.next_audit_at || null,
      created_at: client.created_at || existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedCache = isUpdate
      ? cached.map((c) => (c.id === fallbackId ? fallbackClient : c))
      : [fallbackClient, ...cached];
    setLocalCache(LOCAL_CLIENTS_KEY, updatedCache);
    return fallbackClient;
  }
}

/**
 * Delete a client
 */
export async function deleteOsapClient(id: string): Promise<void> {
  try {
    await supabase.from("osap_clients" as never).delete().eq("id", id);
  } catch {
    /* ignore */
  }
  const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
  setLocalCache(LOCAL_CLIENTS_KEY, cached.filter((c) => c.id !== id));
}

/**
 * Save multiple clients from Excel import
 */
export async function bulkSaveOsapClients(
  clients: (Partial<OsapClient> & { rawPassword?: string })[],
  userId: string,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const client of clients) {
    if (client.id) {
      await saveOsapClient(client, userId);
      updated++;
    } else {
      await saveOsapClient(client, userId);
      inserted++;
    }
  }

  return { inserted, updated };
}

/**
 * Fetch audits
 */
export async function getOsapAudits(clientId?: string): Promise<OsapAudit[]> {
  try {
    let q = supabase.from("osap_audits" as never).select("*").order("created_at", { ascending: false });
    if (clientId) q = q.eq("client_id", clientId);
    const { data, error } = await q;
    if (error) throw error;
    const audits = (data as unknown as OsapAudit[]) || [];
    setLocalCache(LOCAL_AUDITS_KEY, audits);
    return audits;
  } catch {
    const cached = getLocalCache<OsapAudit>(LOCAL_AUDITS_KEY);
    return clientId ? cached.filter((a) => a.client_id === clientId) : cached;
  }
}

/**
 * Save audit record & changes
 */
export async function recordOsapAudit(audit: OsapAudit): Promise<void> {
  try {
    await supabase.from("osap_audits" as never).insert({
      id: audit.id,
      client_id: audit.client_id,
      user_id: audit.user_id,
      audit_type: audit.audit_type,
      status: audit.status,
      summary: audit.summary,
      changes_detected: audit.changes_detected,
      raw_snapshot: audit.raw_snapshot,
      conducted_by: audit.conducted_by,
      created_at: audit.created_at,
    } as never);

    if (audit.changes_detected.length > 0) {
      await supabase.from("osap_audit_changes" as never).insert(
        audit.changes_detected.map((c) => ({
          id: c.id,
          audit_id: audit.id,
          client_id: audit.client_id,
          user_id: audit.user_id,
          field_category: c.field_category,
          field_name: c.field_name,
          previous_value: c.previous_value,
          new_value: c.new_value,
          created_at: c.created_at,
        })) as never,
      );
    }
  } catch {
    /* ignore fallback */
  }

  const cached = getLocalCache<OsapAudit>(LOCAL_AUDITS_KEY);
  setLocalCache(LOCAL_AUDITS_KEY, [audit, ...cached]);
}

/**
 * Fetch action items
 */
export async function getOsapActions(clientId?: string): Promise<OsapActionItem[]> {
  try {
    let q = supabase.from("osap_action_items" as never).select("*").order("created_at", { ascending: false });
    if (clientId) q = q.eq("client_id", clientId);
    const { data, error } = await q;
    if (error) throw error;
    const actions = (data as unknown as OsapActionItem[]) || [];
    setLocalCache(LOCAL_ACTIONS_KEY, actions);
    return actions;
  } catch {
    const cached = getLocalCache<OsapActionItem>(LOCAL_ACTIONS_KEY);
    return clientId ? cached.filter((a) => a.client_id === clientId) : cached;
  }
}

/**
 * Save action item
 */
export async function saveOsapAction(action: OsapActionItem): Promise<void> {
  try {
    await supabase.from("osap_action_items" as never).upsert(action as never);
  } catch {
    /* ignore fallback */
  }
  const cached = getLocalCache<OsapActionItem>(LOCAL_ACTIONS_KEY);
  const updated = cached.some((a) => a.id === action.id)
    ? cached.map((a) => (a.id === action.id ? action : a))
    : [action, ...cached];
  setLocalCache(LOCAL_ACTIONS_KEY, updated);
}

/**
 * Fetch documents for client
 */
export async function getOsapDocuments(clientId?: string): Promise<OsapDocument[]> {
  try {
    let q = supabase.from("osap_documents" as never).select("*").order("created_at", { ascending: false });
    if (clientId) q = q.eq("client_id", clientId);
    const { data, error } = await q;
    if (error) throw error;
    const docs = (data as unknown as OsapDocument[]) || [];
    setLocalCache(LOCAL_DOCS_KEY, docs);
    return docs;
  } catch {
    const cached = getLocalCache<OsapDocument>(LOCAL_DOCS_KEY);
    return clientId ? cached.filter((d) => d.client_id === clientId) : cached;
  }
}

/**
 * Save OSAP Document
 */
export async function saveOsapDocument(doc: OsapDocument): Promise<void> {
  try {
    await supabase.from("osap_documents" as never).upsert(doc as never);
  } catch {
    /* ignore fallback */
  }
  const cached = getLocalCache<OsapDocument>(LOCAL_DOCS_KEY);
  const updated = cached.some((d) => d.id === doc.id)
    ? cached.map((d) => (d.id === doc.id ? doc : d))
    : [doc, ...cached];
  setLocalCache(LOCAL_DOCS_KEY, updated);
}

/**
 * Fetch notes for client
 */
export async function getOsapNotes(clientId: string): Promise<OsapNote[]> {
  try {
    const { data, error } = await supabase
      .from("osap_notes" as never)
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as OsapNote[]) || [];
  } catch {
    const cached = getLocalCache<OsapNote>(LOCAL_NOTES_KEY);
    return cached.filter((n) => n.client_id === clientId);
  }
}

/**
 * Add note
 */
export async function addOsapNote(note: OsapNote): Promise<void> {
  try {
    await supabase.from("osap_notes" as never).insert(note as never);
  } catch {
    /* ignore */
  }
  const cached = getLocalCache<OsapNote>(LOCAL_NOTES_KEY);
  setLocalCache(LOCAL_NOTES_KEY, [note, ...cached]);
}

/**
 * Fetch import history summaries
 */
export async function getOsapImports(): Promise<OsapImportSummary[]> {
  try {
    const { data, error } = await supabase
      .from("osap_imports" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const imports = (data as unknown as OsapImportSummary[]) || [];
    setLocalCache(LOCAL_IMPORTS_KEY, imports);
    return imports;
  } catch {
    return getLocalCache<OsapImportSummary>(LOCAL_IMPORTS_KEY);
  }
}

/**
 * Record import batch
 */
export async function recordOsapImport(summary: OsapImportSummary): Promise<void> {
  try {
    await supabase.from("osap_imports" as never).insert(summary as never);
  } catch {
    /* ignore */
  }
  const cached = getLocalCache<OsapImportSummary>(LOCAL_IMPORTS_KEY);
  setLocalCache(LOCAL_IMPORTS_KEY, [summary, ...cached]);
}
