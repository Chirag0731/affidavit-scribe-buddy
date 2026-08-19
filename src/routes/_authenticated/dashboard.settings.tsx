import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Users,
  UserPlus,
  Shield,
  Crown,
  Eye,
  Mail,
  Building,
  Phone,
  Edit2,
  Trash2,
  Lock,
  UserCheck,
  UserX,
  X,
  Save,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types/neptora";
import {
  getStaffProfiles,
  saveStaffProfile,
  deleteStaffProfile,
  toggleStaffStatus,
  type StaffProfile,
  type StaffRole,
  ROLE_CONFIG,
} from "@/lib/osap-staff-profiles";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
  ssr: false,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"account" | "team">("team");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");

  // Team & Staff Profiles State
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);

  // Form inputs for Staff Profile
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<StaffRole>("staff");
  const [formDepartment, setFormDepartment] = useState("Financial Aid Office");
  const [formPhone, setFormPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);

  useEffect(() => {
    fetchProfile();
    loadStaffProfiles();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: err } = await supabase
        .from("profiles" as never)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (err) throw err;
      const p = data as unknown as Profile | null;
      if (p) {
        setProfile(p);
        setFullName(p.full_name || "");
        setFirmName(p.firm_name || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const loadStaffProfiles = async () => {
    setStaffLoading(true);
    try {
      const list = await getStaffProfiles();
      setStaffList(list);
    } catch {
      toast.error("Failed to load staff profiles");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const { error: err } = await supabase
        .from("profiles" as never)
        .update({ full_name: fullName, firm_name: firmName } as never)
        .eq("id", profile.id);
      if (err) throw err;
      setSuccess(true);
      toast.success("Account settings saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const openAddStaffModal = () => {
    setEditingStaff(null);
    setFormName("");
    setFormEmail("");
    setFormRole("staff");
    setFormDepartment("Financial Aid Office");
    setFormPhone("");
    setFormNotes("");
    setModalOpen(true);
  };

  const openEditStaffModal = (s: StaffProfile) => {
    setEditingStaff(s);
    setFormName(s.full_name);
    setFormEmail(s.email);
    setFormRole(s.role);
    setFormDepartment(s.department);
    setFormPhone(s.phone || "");
    setFormNotes(s.notes || "");
    setModalOpen(true);
  };

  const handleSaveStaffProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Please provide both full name and email address");
      return;
    }

    setSavingStaff(true);
    try {
      const saved = await saveStaffProfile({
        id: editingStaff?.id,
        full_name: formName,
        email: formEmail,
        role: formRole,
        department: formDepartment,
        phone: formPhone || null,
        notes: formNotes || null,
      });

      toast.success(
        editingStaff
          ? `Updated profile for ${saved.full_name} (${ROLE_CONFIG[saved.role].label})`
          : `Created new ${ROLE_CONFIG[saved.role].label} profile for ${saved.full_name}`
      );

      setModalOpen(false);
      await loadStaffProfiles();
    } catch {
      toast.error("Failed to save staff profile");
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeleteStaff = async (s: StaffProfile) => {
    if (s.id === "staff-super-admin-root") {
      toast.error("Primary Root Administrator account cannot be deleted.");
      return;
    }

    if (window.confirm(`Are you sure you want to remove the profile for ${s.full_name}?`)) {
      try {
        await deleteStaffProfile(s.id);
        toast.success(`Removed ${s.full_name} from staff profiles`);
        await loadStaffProfiles();
      } catch {
        toast.error("Failed to delete staff profile");
      }
    }
  };

  const handleToggleStatus = async (s: StaffProfile) => {
    if (s.id === "staff-super-admin-root") {
      toast.error("Primary Root Administrator cannot be deactivated.");
      return;
    }

    try {
      const res = await toggleStaffStatus(s.id);
      if (res) {
        toast.success(`${res.full_name} is now ${res.status === "active" ? "Active" : "Inactive"}`);
        await loadStaffProfiles();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const superAdminCount = staffList.filter((s) => s.role === "super_admin").length;
  const staffCount = staffList.filter((s) => s.role === "staff").length;
  const activeCount = staffList.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="section-heading">System & Team Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal profile, configure team access, and assign Super Admin / Staff roles.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-smooth flex items-center gap-2 ${
              activeTab === "team"
                ? "bg-gold text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Team Profiles & Roles</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[11px] font-mono">
              {staffList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-smooth flex items-center gap-2 ${
              activeTab === "account"
                ? "bg-gold text-black shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>👤 My Account</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TEAM & STAFF PROFILES */}
      {activeTab === "team" && (
        <div className="space-y-6 animate-fade-in">
          {/* Role Overview & Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Super Admin Card */}
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/15 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                    <Crown className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm text-foreground">Super Admin</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300">
                  {superAdminCount} Profiles
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full unrestricted control. Same view and privileges as owner. Can manage team profiles, change system settings, and conduct physical audits.
              </p>
              <div className="text-[11px] text-amber-300/80 font-medium pt-1">
                ✓ Full Control & Master View
              </div>
            </div>

            {/* Staff Card */}
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/15 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Shield className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm text-foreground">Staff (Full Access)</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300">
                  {staffCount} Profiles
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Can see everything across all 419 client files, dated batches, audits, MSFAA, funding, notes, and documents. Can run batch audits and edit files.
              </p>
              <div className="text-[11px] text-emerald-300/80 font-medium pt-1">
                ✓ Full Visibility Over All Students
              </div>
            </div>

            {/* Advisor Card */}
            <div className="p-4 rounded-xl border border-blue-500/40 bg-blue-950/15 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                    <Eye className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm text-foreground">Advisor / Coordinator</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/20 text-blue-300">
                  {staffList.filter((s) => s.role === "advisor").length} Profiles
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Read-only inspection of client rosters, MSFAA tracking matrix, and student file progress. Cannot make destructive modifications.
              </p>
              <div className="text-[11px] text-blue-300/80 font-medium pt-1">
                ✓ Student Roster Inspection
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/15 text-gold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Staff & User Profiles</h3>
                <p className="text-xs text-muted-foreground">
                  {activeCount} active team members with configured access
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddStaffModal}
              className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" /> Add Team Profile
            </button>
          </div>

          {/* Staff Profiles Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Department / Title</th>
                    <th className="py-3 px-4">Role & Visibility</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {staffList.map((s) => {
                    const roleCfg = ROLE_CONFIG[s.role];
                    const isRootAdmin = s.id === "staff-super-admin-root";
                    const isSuper = s.role === "super_admin";

                    return (
                      <tr key={s.id} className="hover:bg-muted/20 transition-smooth">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSuper ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-gold/20 text-gold border border-gold/40"
                            }`}>
                              {s.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <span>{s.full_name}</span>
                                {isRootAdmin && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                    Owner
                                  </span>
                                )}
                              </div>
                              {s.phone && <span className="text-[11px] text-muted-foreground">{s.phone}</span>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {s.email}
                        </td>

                        <td className="py-3 px-4 text-foreground">
                          <span className="px-2 py-0.5 rounded bg-muted/40 border border-border text-[11px]">
                            {s.department}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleCfg.badgeBg} ${roleCfg.badgeColor} ${roleCfg.badgeBorder}`}>
                              {s.role === "super_admin" ? (
                                <Crown className="w-3 h-3" />
                              ) : s.role === "staff" ? (
                                <Shield className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                              <span>{roleCfg.label}</span>
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {s.role === "super_admin"
                                ? "Full Control & Same View"
                                : s.role === "staff"
                                ? "Can See All 419 Students"
                                : "Read-Only View"}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(s)}
                            disabled={isRootAdmin}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-smooth flex items-center gap-1 ${
                              s.status === "active"
                                ? "bg-emerald-900/30 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/50"
                                : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                            }`}
                            title={isRootAdmin ? "Cannot deactivate primary admin" : "Click to toggle status"}
                          >
                            {s.status === "active" ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditStaffModal(s)}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-smooth"
                              title="Edit profile & role"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isRootAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(s)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-smooth"
                                title="Remove staff profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY ACCOUNT */}
      {activeTab === "account" && (
        <div className="space-y-6 animate-fade-in max-w-2xl">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-400">Your settings have been saved.</p>
            </div>
          )}

          <form onSubmit={handleSaveAccount} className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Registered Email</label>
              <input type="email" value={profile?.email || ""} disabled className="input-base text-sm opacity-80" />
              <p className="text-[11px] text-muted-foreground mt-1">Managed via authentication provider.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Administrator Name"
                className="input-base text-sm"
                disabled={saving}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">College / Firm Name</label>
              <input
                type="text"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Eight Branches College"
                className="input-base text-sm"
                disabled={saving}
              />
            </div>

            <button type="submit" disabled={saving} className="btn-primary text-xs flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? "Saving..." : "Save Account Changes"}</span>
            </button>
          </form>
        </div>
      )}

      {/* ADD / EDIT STAFF PROFILE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl animate-fade-in overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gold/15 text-gold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">
                  {editingStaff ? `Edit Staff Profile — ${editingStaff.full_name}` : "Create New Staff / Admin Profile"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffProfile} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="input-base text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. s.jenkins@eightbranches.ca"
                    className="input-base text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">Department / Title</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="Financial Aid Office"
                    className="input-base text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="437-555-0192"
                    className="input-base text-xs"
                  />
                </div>
              </div>

              {/* ROLE SELECTION CARDS */}
              <div className="space-y-2 pt-1">
                <label className="block font-semibold text-foreground">
                  Select User Role & Visibility Level *
                </label>

                <div className="space-y-2">
                  {/* Super Admin Option */}
                  <label
                    onClick={() => setFormRole("super_admin")}
                    className={`p-3 rounded-lg border cursor-pointer block transition-smooth ${
                      formRole === "super_admin"
                        ? "border-amber-500 bg-amber-950/20 shadow-xs ring-1 ring-amber-500/40"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span className="font-bold text-foreground">👑 Super Admin</span>
                      </div>
                      {formRole === "super_admin" && <Check className="w-4 h-4 text-amber-300" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Can control everything. Has the exact same master view and administrative powers as you (owner).
                    </p>
                  </label>

                  {/* Staff Option */}
                  <label
                    onClick={() => setFormRole("staff")}
                    className={`p-3 rounded-lg border cursor-pointer block transition-smooth ${
                      formRole === "staff"
                        ? "border-emerald-500 bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500/40"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-300" />
                        <span className="font-bold text-foreground">🛡️ Staff (Full Access)</span>
                      </div>
                      {formRole === "staff" && <Check className="w-4 h-4 text-emerald-300" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Can see everything across all 419 client files, dated cohorts, audits, MSFAA, and funding. Can conduct live audits.
                    </p>
                  </label>

                  {/* Advisor Option */}
                  <label
                    onClick={() => setFormRole("advisor")}
                    className={`p-3 rounded-lg border cursor-pointer block transition-smooth ${
                      formRole === "advisor"
                        ? "border-blue-500 bg-blue-950/20 shadow-xs ring-1 ring-blue-500/40"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-300" />
                        <span className="font-bold text-foreground">👁️ Advisor / Coordinator</span>
                      </div>
                      {formRole === "advisor" && <Check className="w-4 h-4 text-blue-300" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Read-only visibility for student file tracking and MSFAA compliance checks.
                    </p>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Internal Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notes on responsibilities, cohort assignments..."
                  className="input-base text-xs h-16 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {savingStaff && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingStaff ? "Save Profile Changes" : "Create Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
