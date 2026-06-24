import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, AlertCircle, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Neptora" },
      { name: "description", content: "Sign in or create your Neptora account." },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, firm_name: firmName },
          },
        });
        if (err) { setError(err.message); return; }
        toast.success("Account created. You're signed in.");
        navigate({ to: "/dashboard" });
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) { setError(err.message); return; }
        navigate({ to: "/dashboard" });
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-80 transition-smooth">
            <BrandLogo height={28} />
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-smooth">Back to Home</Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="bg-white border border-border rounded-xl shadow-sm p-8">
            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
              {mode === "signin" ? "Welcome Back" : "Create Your Account"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {mode === "signin" ? "Sign in to your Neptora account to continue." : "Get started with professional affidavit generation."}
            </p>

            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-destructive mb-1">Error</h3>
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                        className="input-base pl-10"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Firm Name (optional)</label>
                    <input
                      type="text"
                      value={firmName}
                      onChange={(e) => setFirmName(e.target.value)}
                      placeholder="Doe & Associates"
                      className="input-base"
                      disabled={loading}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@firm.com"
                    required
                    className="input-base pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="input-base pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-6"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
                  className="text-gold font-medium hover:text-gold-dark transition-smooth"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-400 text-sm mb-1">🔒 Secure Login</h4>
            <p className="text-sm text-blue-400">
              Your login is protected by enterprise-grade encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
