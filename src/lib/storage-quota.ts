/**
 * Utility to protect browser Web Storage from quota overflow errors
 * and provide a resilient storage adapter for authentication and state.
 */

const memoryStore = new Map<string, string>();

const KNOWN_LEGACY_KEYS = [
  "neptora_osap_clients_cache",
  "neptora_osap_clients_cache_v2",
  "neptora_osap_clients_cache_v3",
  "neptora_osap_clients_cache_v4",
  "neptora_osap_clients_v9_clean_college_roster",
  "neptora_osap_clients_v10_revert_general_batch_july27",
  "neptora_osap_clients_v11_clean_crawler_ashish_fix",
  "neptora_osap_clients_v12_clean_crawler_carla_dionisio_fix",
  "neptora_osap_clients_v13_crm_funded_cohorts_fix",
  "neptora_osap_clients_v14_jesse_bonnah_coe_fix",
  "neptora_osap_clients_v15_july27_cohort_complete_calibration",
  "neptora_osap_clients_v16_july27_without_zubair_complete",
  "neptora_osap_clients_v17_jesse_bonnah_msfaa_fixed",
  "neptora_osap_clients_v18_complete_portfolio_accuracy_cleanup",
  "neptora_active_audit_job_v1",
  "neptora_latest_audit_session_v1",
  "neptora_audit_sessions_history_v1",
  "neptora_osap_clients_v19_jasmine_ogbuagu_live_scan_calibration",
  "neptora_osap_audits_cache_v19",
  "neptora_osap_actions_cache_v19",
  "neptora_osap_docs_cache_v19",
  "neptora_osap_notes_cache_v19",
  "neptora_osap_imports_cache_v19",
  // Note: quickflo_business_financing_apps_v1 and neptora_saved_affidavits_cache
  // are ACTIVE data stores — do NOT purge them here
];

export function purgeStorageBloat(aggressive = false): void {
  if (typeof window === "undefined") return;

  try {
    for (const key of KNOWN_LEGACY_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }

    // Active data stores that must NEVER be purged
    const PROTECTED_KEYS = new Set([
      "quickflo_business_financing_apps_v1",
      "neptora_saved_affidavits_cache",
      "neptora_osap_staff_profiles_v1",
    ]);

    if (aggressive) {
      const totalKeys = localStorage.length;
      const keysToRemove: string[] = [];

      for (let i = 0; i < totalKeys; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Never remove Supabase auth tokens or active data
        if (key.startsWith("sb-")) continue;
        if (PROTECTED_KEYS.has(key)) continue;

        keysToRemove.push(key);
      }

      for (const key of keysToRemove) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore storage access restriction */
  }
}

// Automatically purge bloat when running in browser
if (typeof window !== "undefined") {
  purgeStorageBloat(false);
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;

    try {
      const item = localStorage.getItem(key);
      if (item !== null) return item;
    } catch {
      /* fallback */
    }

    try {
      const sessionItem = sessionStorage.getItem(key);
      if (sessionItem !== null) return sessionItem;
    } catch {
      /* fallback */
    }

    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;

    memoryStore.set(key, value);

    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      // Storage quota exceeded or blocked
      purgeStorageBloat(true);

      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        try {
          sessionStorage.setItem(key, value);
        } catch {
          // Both storages exhausted; memoryStore already retains the value
        }
      }
    }
  },

  removeItem(key: string): void {
    if (typeof window === "undefined") return;

    memoryStore.delete(key);

    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }

    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
