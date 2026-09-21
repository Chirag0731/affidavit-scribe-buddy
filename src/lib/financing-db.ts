import { supabase } from "@/integrations/supabase/client";
import type {
  BusinessFinancingApplication,
  ApplicationStatus,
} from "@/types/financing";
import { createSampleBenchmarkApplication } from "@/types/financing";

const LOCAL_FINANCING_KEY = "quickflo_business_financing_apps_v1";

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

// Helper to save local cache
function saveLocalApplications(apps: BusinessFinancingApplication[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_FINANCING_KEY, JSON.stringify(apps));
    window.dispatchEvent(new CustomEvent("financing_storage_updated"));
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
      return remoteApps;
    }
  } catch (err) {
    console.info("Using local financing store (Supabase offline or table pending migration):", err);
  }

  return getLocalApplications();
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
  getApplicationById: getFinancingApplicationById,
  saveApplication: saveFinancingApplication,
  updateStatus: updateFinancingApplicationStatus,
  deleteApplication: deleteFinancingApplication,
  resetToSample: resetFinancingStorageToSample,
};

