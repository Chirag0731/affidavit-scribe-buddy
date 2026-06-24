import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types/neptora";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
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

  const handleSave = async (e: React.FormEvent) => {
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
      toast.success("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      <div>
        <h1 className="section-heading mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account profile.</p>
      </div>

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

      <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input type="email" value={profile?.email || ""} disabled className="input-base" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
          <input
            type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name" className="input-base" disabled={saving}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Firm Name</label>
          <input
            type="text" value={firmName} onChange={(e) => setFirmName(e.target.value)}
            placeholder="Your firm name" className="input-base" disabled={saving}
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
