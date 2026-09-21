import { supabase } from "@/integrations/supabase/client";
import type {
  BusinessFinancingApplication,
  ApplicationStatus,
} from "@/types/financing";
import type { Affidavit } from "@/types/neptora";

const LOCAL_FINANCING_KEY = "quickflo_business_financing_apps_v1";
const SAVED_AFFIDAVITS_KEY = "neptora_saved_affidavits_cache";

// Helper to get local cache — returns empty array when nothing cached (Supabase is source of truth)
function getLocalApplications(): BusinessFinancingApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_FINANCING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to read local financing applications:", err);
    return [];
  }
}

// Helper to sync financing application as a recognizable affidavit entry
function syncToAffidavitCache(app: BusinessFinancingApplication): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SAVED_AFFIDAVITS_KEY);
    let list: Affidavit[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];

    const syncId = `financing-${app.id}`;
    const primaryOwner = app.owners[0];
    const ownerName = primaryOwner ? `${primaryOwner.firstName} ${primaryOwner.lastName}`.trim() : "Principal";

    const syncItem: Affidavit = {
      id: syncId,
      user_id: "staff-user",
      template_id: "template-business-financing",
      template_name: "Business Financing Application",
      client_name: app.business.legalName || "Commercial Applicant",
      matter_reference: `QF-${app.id.slice(0, 8).toUpperCase()}`,
      form_data: {
        legalName: app.business.legalName,
        dba: app.business.dba || app.business.tradeName || "",
        requestedAmount: String(app.financials.amountRequested || app.financials.requestedAmount || 0),
        primaryOwner: ownerName,
        email: app.business.email || primaryOwner?.email || "",
        phone: app.business.phone || primaryOwner?.phone || "",
        status: app.status,
        financingAppId: app.id,
      },
      signatures: [],
      generated_content: `Commercial Capital Application: ${app.business.legalName}\nTrade Name / DBA: ${app.business.dba || "Direct"}\nRequested Amount: $${(app.financials.amountRequested || app.financials.requestedAmount || 0).toLocaleString()} USD\nPrincipal: ${ownerName}\nStatus: ${app.status.toUpperCase()}\nCreated: ${new Date(app.createdAt).toLocaleDateString()}`,
      docx_path: null,
      pdf_path: null,
      status: app.status === "draft" ? "draft" : "generated",
      created_at: app.createdAt || new Date().toISOString(),
      updated_at: app.updatedAt || new Date().toISOString(),
    };

    const filtered = list.filter((a) => a.id !== syncId && a.id !== app.id);
    localStorage.setItem(SAVED_AFFIDAVITS_KEY, JSON.stringify([syncItem, ...filtered]));
    window.dispatchEvent(new CustomEvent("neptora_affidavits_updated"));
  } catch (err) {
    console.warn("Could not sync financing application into affidavits cache:", err);
  }
}

// Helper to remove financing application from affidavit cache
function removeFromAffidavitCache(appId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(SAVED_AFFIDAVITS_KEY);
    if (!raw) return;
    const list: Affidavit[] = JSON.parse(raw);
    if (Array.isArray(list)) {
      const syncId = `financing-${appId}`;
      const updated = list.filter((a) => a.id !== syncId && a.id !== appId);
      localStorage.setItem(SAVED_AFFIDAVITS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("neptora_affidavits_updated"));
    }
  } catch {
    /* ignore */
  }
}

// Helper to save local cache — silent on quota errors (Supabase is primary)
function saveLocalApplications(apps: BusinessFinancingApplication[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify(apps));
    localStorage.setItem("quickflo_financing_ping", String(Date.now()));
    window.dispatchEvent(new CustomEvent("financing_storage_updated", { detail: apps }));
    window.dispatchEvent(new CustomEvent("neptora_affidavits_updated"));
  } catch (err) {
    // Quota exceeded — just dispatch the event; Supabase has the data
    console.warn("Failed to persist local financing applications (quota), Supabase is authoritative:", err);
    window.dispatchEvent(new CustomEvent("financing_storage_updated", { detail: apps }));
  }
}

// --- Deleted-application tombstones -----------------------------------
// Deleting must stick: without this, a locally cached copy gets re-uploaded
// on the next refresh and the application reappears.
const DELETED_IDS_KEY = "quickflo_financing_deleted_ids_v1";

function getDeletedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function addDeletedId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = Array.from(new Set([...getDeletedIds(), id])).slice(-500);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function clearDeletedId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(getDeletedIds().filter((d) => d !== id)));
  } catch {
    /* ignore */
  }
}

// Fetch all applications
export async function getFinancingApplications(): Promise<BusinessFinancingApplication[]> {
  try {
    const { data, error } = await supabase
      .from("financing_applications" as never)
      .select("*")
      .order("created_at", { ascending: false });

    const deleted = getDeletedIds();

    if (!error && Array.isArray(data) && data.length > 0) {
      const remoteApps: BusinessFinancingApplication[] = (data as any[])
        .filter((row) => !deleted.includes(row.id))
        .map((row) => ({
          ...row.payload,
          id: row.id,
          status: row.status || row.payload?.status || "submitted",
          createdAt: row.created_at || row.payload?.createdAt,
          updatedAt: row.updated_at || row.payload?.updatedAt,
        }));

      // Merge with any unsynced local applications if present
      const localApps = getLocalApplications();
      const nonSampleLocal = localApps.filter(
        (local) =>
          !remoteApps.some((remote) => remote.id === local.id) &&
          local.id !== "benchmark-sample-001" &&
          !deleted.includes(local.id)
      );

      const merged = [...remoteApps, ...nonSampleLocal];
      saveLocalApplications(merged);
      merged.forEach(syncToAffidavitCache);
      return merged;
    }

    if (!error && Array.isArray(data) && data.length === 0) {
      // Remote is empty: push up any local applications that were never deleted
      const localApps = getLocalApplications().filter(
        (a) => a.id !== "benchmark-sample-001" && !deleted.includes(a.id)
      );
      for (const uApp of localApps) {
        try {
          await persistApplicationRow(uApp);
        } catch {
          /* ignore individual sync error */
        }
      }
      saveLocalApplications(localApps);
      return localApps;
    }
  } catch (err) {
    console.info("Using local financing store (Supabase fallback):", err);
  }

  const deletedFallback = getDeletedIds();
  const localApps = getLocalApplications().filter((a) => !deletedFallback.includes(a.id));
  localApps.forEach(syncToAffidavitCache);
  return localApps;
}


// Fetch single application by ID
export async function getFinancingApplicationById(
  id: string
): Promise<BusinessFinancingApplication | null> {
  try {
    const { data, error } = await supabase
      .from("financing_applications" as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      const row = data as any;
      const app: BusinessFinancingApplication = {
        ...row.payload,
        id: row.id,
        status: row.status || row.payload?.status || "submitted",
        createdAt: row.created_at || row.payload?.createdAt,
        updatedAt: row.updated_at || row.payload?.updatedAt,
      };

      // Keep local store in sync
      const localList = getLocalApplications();
      const idx = localList.findIndex((a) => a.id === app.id);
      if (idx >= 0) {
        localList[idx] = app;
      } else {
        localList.unshift(app);
      }
      saveLocalApplications(localList);
      syncToAffidavitCache(app);
      return app;
    }
  } catch (err) {
    console.info("Falling back to local application lookup:", err);
  }

  const localList = getLocalApplications();
  return localList.find((a) => a.id === id) || null;
}

// Write one application row to the server.
// Public (not signed-in) visitors cannot run an upsert, because the server
// blocks them from reading existing rows. So: try insert first, and if the row
// already exists, update it instead.
async function persistApplicationRow(app: BusinessFinancingApplication): Promise<void> {
  const row = {
    id: app.id,
    business_name: app.business?.legalName || "Commercial Applicant",
    status: app.status,
    requested_amount: app.financials?.amountRequested || app.financials?.requestedAmount || 0,
    payload: app,
    created_at: app.createdAt || new Date().toISOString(),
    updated_at: app.updatedAt || new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from("financing_applications" as never)
    .insert(row as never);

  if (!insertError) return;

  const { id: _omit, created_at: _omitCreated, ...updateRow } = row;
  const { error: updateError } = await supabase
    .from("financing_applications" as never)
    .update(updateRow as never)
    .eq("id", app.id);

  if (updateError) {
    throw new Error(updateError.message || insertError.message || "Failed to save application");
  }
}

// Save or update an application
export async function saveFinancingApplication(
  app: BusinessFinancingApplication
): Promise<BusinessFinancingApplication> {
  const updatedApp: BusinessFinancingApplication = {
    ...app,
    updatedAt: new Date().toISOString(),
  };

  // Saving again un-deletes a previously removed application
  clearDeletedId(updatedApp.id);

  // 1. Update local storage immediately for zero-latency UX
  const localList = getLocalApplications();
  const existingIndex = localList.findIndex((a) => a.id === updatedApp.id);
  let nextList: BusinessFinancingApplication[];
  if (existingIndex >= 0) {
    nextList = [...localList];
    nextList[existingIndex] = updatedApp;
  } else {
    nextList = [updatedApp, ...localList];
  }
  saveLocalApplications(nextList);

  // Sync to Saved Affidavits cache so it surfaces on all dashboard affidavit lists
  syncToAffidavitCache(updatedApp);

  // 2. Persist to the server
  try {
    await persistApplicationRow(updatedApp);
  } catch (err) {
    console.warn("Could not save application to the server:", err);
  }

  return updatedApp;
}


// Delete an application — Supabase is authoritative
export async function deleteFinancingApplication(id: string): Promise<boolean> {
  // Remember the deletion so nothing re-uploads this application later
  addDeletedId(id);

  // Remove from local cache immediately for instant UI feedback
  const localList = getLocalApplications();
  const nextList = localList.filter((a) => a.id !== id);
  saveLocalApplications(nextList);
  removeFromAffidavitCache(id);

  // Delete from Supabase
  try {
    const { error } = await supabase
      .from("financing_applications" as never)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error(error.message || "Failed to delete from server");
    }
  } catch (err) {
    console.warn("Failed to delete from Supabase financing_applications:", err);
    throw err;
  }

  return true;
}

// Update application status
export async function updateFinancingApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<BusinessFinancingApplication> {
  const app = await getFinancingApplicationById(id);
  if (!app) throw new Error("Application not found");
  app.status = status;
  app.updatedAt = new Date().toISOString();
  return await saveFinancingApplication(app);
}

export const updateFinancingStatus = updateFinancingApplicationStatus;

// Reset local storage cache
export async function resetFinancingStorageToSample(): Promise<void> {
  saveLocalApplications([]);
}

// Subscribe to real-time changes across clients and devices
export function subscribeToFinancingApplications(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  try {
    const channel = supabase
      .channel("financing_applications_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "financing_applications",
        },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn("Could not establish Supabase realtime subscription:", err);
    return () => {};
  }
}

// Unified Store Object
export const financingStore = {
  getApplications: getFinancingApplications,
  getApplication: getFinancingApplicationById,
  getApplicationById: getFinancingApplicationById,
  saveApplication: saveFinancingApplication,
  updateStatus: updateFinancingApplicationStatus,
  deleteApplication: deleteFinancingApplication,
  resetToSample: resetFinancingStorageToSample,
  subscribe: subscribeToFinancingApplications,
};
