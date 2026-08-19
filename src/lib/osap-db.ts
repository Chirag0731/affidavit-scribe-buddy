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

const LOCAL_CLIENTS_KEY = "neptora_osap_clients_v9_clean_college_roster";
const LOCAL_AUDITS_KEY = "neptora_osap_audits_cache_v9";
const LOCAL_ACTIONS_KEY = "neptora_osap_actions_cache_v9";
const LOCAL_DOCS_KEY = "neptora_osap_docs_cache_v9";
const LOCAL_NOTES_KEY = "neptora_osap_notes_cache_v9";
const LOCAL_IMPORTS_KEY = "neptora_osap_imports_cache_v9";

export const INITIAL_SPREADSHEET_CLIENTS: OsapClient[] = ALL_OSAP_CLIENTS;

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
    localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(ALL_OSAP_CLIENTS));
  } catch {
    /* ignore */
  }
  return ALL_OSAP_CLIENTS;
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
    }

    const { data, error } = await supabase
      .from("osap_clients" as never)
      .select("*")
      .order("full_name", { ascending: true });

    if (error) throw error;
    let clients = (data as unknown as OsapClient[]) || [];
    if (clients.length === 0) {
      const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
      clients = cached.length > 0 ? cached : ALL_OSAP_CLIENTS;
      setLocalCache(LOCAL_CLIENTS_KEY, clients);
    } else {
      setLocalCache(LOCAL_CLIENTS_KEY, clients);
    }
    return clients.sort((a, b) => a.full_name.localeCompare(b.full_name));
  } catch (err) {
    const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
    const clients = cached.length > 0 ? cached : ALL_OSAP_CLIENTS;
    setLocalCache(LOCAL_CLIENTS_KEY, clients);
    return clients.sort((a, b) => a.full_name.localeCompare(b.full_name));
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
    return data as unknown as OsapClient;
  } catch (err) {
    const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
    return cached.find((c) => c.id === id) || null;
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
  const payload = {
    ...client,
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
    const fallbackClient: OsapClient = {
      id: fallbackId,
      user_id: userId,
      first_name: client.first_name || "Client",
      last_name: client.last_name || "",
      full_name: client.full_name || `${client.first_name} ${client.last_name}`.trim(),
      email: client.email || null,
      phone: client.phone || null,
      oan: client.oan || null,
      school: client.school || null,
      program: client.program || null,
      study_period: client.study_period || null,
      application_year: client.application_year || "2026",
      assigned_staff: client.assigned_staff || null,
      notes: client.notes || null,
      credential_status: client.rawPassword ? "connected" : client.credential_status || "missing",
      application_status: client.application_status || "not_started",
      funding_status: client.funding_status || null,
      msfaa_status: client.msfaa_status || "not_started",
      document_status: client.document_status || "not_submitted",
      priority: client.priority || "medium",
      action_required: client.action_required ?? false,
      action_required_summary: client.action_required_summary || null,
      last_audit_at: client.last_audit_at || null,
      next_audit_at: client.next_audit_at || null,
      created_at: client.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const cached = getLocalCache<OsapClient>(LOCAL_CLIENTS_KEY);
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
