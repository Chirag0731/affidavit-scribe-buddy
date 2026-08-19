export type StaffRole = "super_admin" | "staff" | "advisor";

export interface StaffPermissions {
  can_view_all_clients: boolean;
  can_edit_clients: boolean;
  can_run_audits: boolean;
  can_manage_settings: boolean;
  can_manage_team_profiles: boolean;
  can_export_data: boolean;
  can_delete_records: boolean;
}

export interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  department: string;
  phone?: string | null;
  status: "active" | "inactive" | "invited";
  notes?: string | null;
  permissions: StaffPermissions;
  created_at: string;
  updated_at: string;
  last_login_at?: string | null;
}

export const ROLE_CONFIG: Record<
  StaffRole,
  {
    label: string;
    description: string;
    badgeColor: string;
    badgeBg: string;
    badgeBorder: string;
    icon: string;
    defaultPermissions: StaffPermissions;
  }
> = {
  super_admin: {
    label: "Super Admin",
    description: "Can control everything, modify system configurations, manage staff profiles, and has the exact same master view as the owner.",
    badgeColor: "text-amber-300",
    badgeBg: "bg-amber-950/30",
    badgeBorder: "border-amber-500/40",
    icon: "Crown",
    defaultPermissions: {
      can_view_all_clients: true,
      can_edit_clients: true,
      can_run_audits: true,
      can_manage_settings: true,
      can_manage_team_profiles: true,
      can_export_data: true,
      can_delete_records: true,
    },
  },
  staff: {
    label: "Staff (Full Access)",
    description: "Can see everything across the entire student roster (all 419 files, batches, audits, MSFAA, funding, notes, documents) and run batch audits.",
    badgeColor: "text-emerald-300",
    badgeBg: "bg-emerald-950/30",
    badgeBorder: "border-emerald-500/40",
    icon: "Shield",
    defaultPermissions: {
      can_view_all_clients: true,
      can_edit_clients: true,
      can_run_audits: true,
      can_manage_settings: false,
      can_manage_team_profiles: false,
      can_export_data: true,
      can_delete_records: false,
    },
  },
  advisor: {
    label: "Advisor / Coordinator",
    description: "Can view all student files, inspect MSFAA & funding tracking matrix, and add observations.",
    badgeColor: "text-blue-300",
    badgeBg: "bg-blue-950/30",
    badgeBorder: "border-blue-500/40",
    icon: "Eye",
    defaultPermissions: {
      can_view_all_clients: true,
      can_edit_clients: false,
      can_run_audits: false,
      can_manage_settings: false,
      can_manage_team_profiles: false,
      can_export_data: false,
      can_delete_records: false,
    },
  },
};

const LOCAL_STAFF_KEY = "neptora_staff_profiles_v2";

export const INITIAL_STAFF_PROFILES: StaffProfile[] = [
  {
    id: "staff-super-admin-root",
    full_name: "Primary Administrator (Owner)",
    email: "admin@eightbranches.ca",
    role: "super_admin",
    department: "Executive & Compliance Administration",
    phone: "437-263-4264",
    status: "active",
    notes: "Master Super Admin with root access and full system privileges.",
    permissions: ROLE_CONFIG.super_admin.defaultPermissions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
  },
  {
    id: "staff-firas-sales",
    full_name: "Firas",
    email: "firas@eightbranches.ca",
    role: "staff",
    department: "Admissions & Student Recruitment",
    phone: null,
    status: "active",
    notes: "Sales and Student Onboarding Coordinator.",
    permissions: ROLE_CONFIG.staff.defaultPermissions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "staff-jb-operations",
    full_name: "JB",
    email: "jb@eightbranches.ca",
    role: "staff",
    department: "Operations & Quality Assurance",
    phone: null,
    status: "active",
    notes: "Operations Coordinator & Audit Reviewer.",
    permissions: ROLE_CONFIG.staff.defaultPermissions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "staff-abdul-operations",
    full_name: "Abdul",
    email: "abdul@eightbranches.ca",
    role: "staff",
    department: "Financial Aid & Student Accounts",
    phone: null,
    status: "active",
    notes: "Financial Aid Officer (FAO) & Document Reviewer.",
    permissions: ROLE_CONFIG.staff.defaultPermissions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "staff-sarah-jenkins",
    full_name: "Sarah Jenkins",
    email: "s.jenkins@eightbranches.ca",
    role: "staff",
    department: "Financial Aid Office",
    phone: "437-555-0192",
    status: "active",
    notes: "OSAP Compliance Specialist & MSFAA Coordinator.",
    permissions: ROLE_CONFIG.staff.defaultPermissions,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export async function getStaffProfiles(): Promise<StaffProfile[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STAFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* fallback */
  }
  try {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(INITIAL_STAFF_PROFILES));
  } catch {
    /* ignore */
  }
  return INITIAL_STAFF_PROFILES;
}

export async function saveStaffProfile(
  data: Partial<StaffProfile> & { email: string; full_name: string; role: StaffRole }
): Promise<StaffProfile> {
  const existing = await getStaffProfiles();
  const id = data.id || `staff-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const role = data.role || "staff";

  const profile: StaffProfile = {
    id,
    full_name: data.full_name.trim(),
    email: data.email.trim().toLowerCase(),
    role,
    department: data.department || "Financial Aid Office",
    phone: data.phone || null,
    status: data.status || "active",
    notes: data.notes || null,
    permissions: data.permissions || ROLE_CONFIG[role].defaultPermissions,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: data.last_login_at || null,
  };

  const updated = existing.some((p) => p.id === id)
    ? existing.map((p) => (p.id === id ? profile : p))
    : [profile, ...existing];

  try {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }

  return profile;
}

export async function deleteStaffProfile(id: string): Promise<void> {
  const existing = await getStaffProfiles();
  const updated = existing.filter((p) => p.id !== id);
  try {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

export async function toggleStaffStatus(id: string): Promise<StaffProfile | null> {
  const existing = await getStaffProfiles();
  let target: StaffProfile | null = null;
  const updated = existing.map((p) => {
    if (p.id === id) {
      target = {
        ...p,
        status: p.status === "active" ? "inactive" : "active",
        updated_at: new Date().toISOString(),
      };
      return target;
    }
    return p;
  });

  try {
    localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(updated));
  } catch {
    /* ignore */
  }

  return target;
}
