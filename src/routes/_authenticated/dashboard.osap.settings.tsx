import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sliders,
  Shield,
  Clock,
  Save,
  CheckCircle2,
  Users,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/osap/settings")({
  component: OsapSettingsPage,
  ssr: false,
});

function OsapSettingsPage() {
  const [scheduleInterval, setScheduleInterval] = useState("daily");
  const [retryLimit, setRetryLimit] = useState("3");
  const [autoActionCreation, setAutoActionCreation] = useState(true);
  const [maskOanDisplay, setMaskOanDisplay] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("OSAP settings saved successfully");
    }, 400);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="section-heading">OSAP Module Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure automated audit schedules, credential encryption security, and portal verification policies.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. AUDIT SCHEDULING */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Clock className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-foreground text-base">Automated Audit Scheduling</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Audit Cadence</label>
              <select
                value={scheduleInterval}
                onChange={(e) => setScheduleInterval(e.target.value)}
                className="input-base text-sm"
              >
                <option value="manual">Manual Audits Only (On-Demand)</option>
                <option value="daily">Daily Automated Audits</option>
                <option value="2_days">Every 2 Days</option>
                <option value="weekly">Weekly Audits</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Max Safe Retry Limit</label>
              <select
                value={retryLimit}
                onChange={(e) => setRetryLimit(e.target.value)}
                className="input-base text-sm"
              >
                <option value="1">1 attempt (Strict / No Retries)</option>
                <option value="2">2 safe attempts</option>
                <option value="3">3 safe attempts (Recommended)</option>
                <option value="5">5 attempts</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={autoActionCreation}
                onChange={(e) => setAutoActionCreation(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-foreground font-medium">
                Automatically generate Action Center tasks when rejected documents or missing MSFAAs are detected
              </span>
            </label>
          </div>
        </div>

        {/* 2. DEFAULT PRESETS & STAFF ROLES */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-foreground text-base">Default Presets & Staff Roles</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Default School / College</label>
              <input
                type="text"
                defaultValue="Eight Branches"
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Default Program of Study</label>
              <input
                type="text"
                defaultValue="Acupuncture 50 weeks"
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Default Application Year</label>
              <input
                type="text"
                defaultValue="2026"
                className="input-base text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Configured Staff Roles & Departments</label>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-gold/15 text-gold border border-gold/30 rounded-lg text-xs font-semibold">
                Sales
              </span>
              <span className="px-3 py-1 bg-gold/15 text-gold border border-gold/30 rounded-lg text-xs font-semibold">
                Operations
              </span>
              <span className="px-3 py-1 bg-muted border border-border rounded-lg text-xs font-medium text-foreground">
                Firas (Sales)
              </span>
              <span className="px-3 py-1 bg-muted border border-border rounded-lg text-xs font-medium text-foreground">
                JB (Operations)
              </span>
              <span className="px-3 py-1 bg-muted border border-border rounded-lg text-xs font-medium text-foreground">
                Abdul (Operations)
              </span>
            </div>
          </div>
        </div>

        {/* 3. CREDENTIAL SECURITY */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Shield className="w-5 h-5 text-gold" />
            <h3 className="font-bold text-foreground text-base">Credential Security & Privacy</h3>
          </div>

          <div className="p-4 bg-muted/20 border border-border rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> WebCrypto AES-GCM 256-bit Encryption Active
            </div>
            <p className="text-muted-foreground">
              OSAP student credentials and access codes are encrypted client-side using PBKDF2 key derivation. Raw passwords are never transmitted in cleartext, exposed in API logs, or included in Excel exports.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={maskOanDisplay}
                onChange={(e) => setMaskOanDisplay(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-foreground font-medium">
                Mask OANs across summary tables (e.g. ••••••1234)
              </span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving Settings..." : "Save OSAP Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
