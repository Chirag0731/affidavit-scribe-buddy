import { supabase } from "@/integrations/supabase/client";
import type {
  BusinessFinancingApplication,
  ApplicationStatus,
} from "@/types/financing";
import { createSampleBenchmarkApplication } from "@/types/financing";
import type { Affidavit } from "@/types/neptora";

const LOCAL_FINANCING_KEY = "quickflo_business_financing_apps_v1";
const SAVED_AFFIDAVITS_KEY = "neptora_saved_affidavits_cache";

// Helper to get local cache
function getLocalApplications(): BusinessFinancingApplication[] {
  if (typeof window === "undefined") return [createSampleBenchmarkApplication()];
  try {
    const raw = localStorage.getItem(LOCAL_FINANCING_KEY);
    if (!raw) {
      const initial = [createSampleBenchmarkApplication()];
      localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : [createSampleBenchmarkApplication()];
  } catch (err) {
    console.warn("Failed to read local financing applications:", err);
    return [createSampleBenchmarkApplication()];
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
        requestedAmount: String(app.financials.requestedAmount || 0),
        primaryOwner: ownerName,
        email: app.business.email || primaryOwner?.email || "",
        phone: app.business.phone || primaryOwner?.phone || "",
        status: app.status,
        financingAppId: app.id,
      },
      signatures: [],
      generated_content: `Commercial Capital Application: ${app.business.legalName}\nTrade Name / DBA: ${app.business.dba || "Direct"}\nRequested Amount: $${(app.financials.requestedAmount || 0).toLocaleString()} USD\nPrincipal: ${ownerName}\nStatus: ${app.status.toUpperCase()}\nCreated: ${new Date(app.createdAt).toLocaleDateString()}`,
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

// Helper to save local cache
function saveLocalApplications(apps: BusinessFinancingApplication[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify(apps));
    localStorage.setItem("quickflo_financing_ping", String(Date.now()));
    window.dispatchEvent(new CustomEvent("financing_storage_updated", { detail: apps }));
    window.dispatchEvent(new CustomEvent("neptora_affidavits_updated"));
  } catch (err) {
    console.warn("Failed to persist local financing applications:", err);
  }
}

// Fetch all applications
export async function getFinancingApplications(): Promise<BusinessFinancingApplication[]> {
  try {
    const { data, error } = await supabase
      .from("financing_applications" as never)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const remoteApps: BusinessFinancingApplication[] = (data as any[]).map((row) => ({
        ...row.payload,
        id: row.id,
        status: row.status || row.payload.status,
        createdAt: row.created_at || row.payload.createdAt,
        updatedAt: row.updated_at || row.payload.updatedAt,
      }));
      // Sync local storage with latest remote records
      saveLocalApplications(remoteApps);
      remoteApps.forEach(syncToAffidavitCache);
      return remoteApps;
    }
  } catch (err) {
    console.info("Using local financing store (Supabase offline or table pending migration):", err);
  }

  const localApps = getLocalApplications();
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
      return {
        ...row.payload,
        id: row.id,
        status: row.status || row.payload.status,
        createdAt: row.created_at || row.payload.createdAt,
        updatedAt: row.updated_at || row.payload.updatedAt,
      };
    }
  } catch (err) {
    // Fall back to local
  }

  const localList = getLocalApplications();
  return localList.find((a) => a.id === id) || null;
}

// Save or update an application
export async function saveFinancingApplication(
  app: BusinessFinancingApplication
): Promise<BusinessFinancingApplication> {
  const updatedApp: BusinessFinancingApplication = {
    ...app,
    updatedAt: new Date().toISOString(),
  };

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

  // 2. Persist to Supabase if connected
  try {
    await supabase.from("financing_applications" as never).upsert({
      id: updatedApp.id,
      business_name: updatedApp.business.legalName || "Untitled Application",
      status: updatedApp.status,
      requested_amount: updatedApp.financials.requestedAmount || 0,
      payload: updatedApp,
      updated_at: updatedApp.updatedAt,
    } as never);
  } catch (err) {
    console.warn("Could not upsert to Supabase financing_applications:", err);
  }

  return updatedApp;
}

// Delete an application
export async function deleteFinancingApplication(id: string): Promise<boolean> {
  const localList = getLocalApplications();
  const nextList = localList.filter((a) => a.id !== id);
  saveLocalApplications(nextList);
  removeFromAffidavitCache(id);

  try {
    await supabase.from("financing_applications" as never).delete().eq("id", id);
  } catch (err) {
    console.warn("Failed to delete from Supabase financing_applications:", err);
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

// Reset storage to sample application (benchmark reset)
export async function resetFinancingStorageToSample(): Promise<void> {
  const sample = createSampleBenchmarkApplication();
  saveLocalApplications([sample]);
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
};

