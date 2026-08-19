import { useEffect, useState } from "react";
import { Scale, Shield, Sparkles } from "lucide-react";

export function AppLoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show smooth luxury splash screen on initial mobile/desktop load
    const timer = setTimeout(() => {
      setFading(true);
      const removeTimer = setTimeout(() => {
        setVisible(false);
      }, 400);
      return () => clearTimeout(removeTimer);
    }, 450);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090B] text-foreground transition-opacity duration-400 ease-out select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      {/* Subtle Ambient Gold Glow Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gold/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center px-6 space-y-6 max-w-sm">
        {/* Glowing Brand Monogram Badge */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-gold/40 shadow-2xl flex items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-gold/15 to-transparent" />
            <Scale className="w-10 h-10 text-gold animate-pulse drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)]" />
          </div>
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gold/20 border border-gold/50 flex items-center justify-center text-gold">
            <Sparkles className="w-3 h-3 text-gold animate-spin" style={{ animationDuration: "6s" }} />
          </span>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="font-serif text-2xl font-bold tracking-wider text-foreground">
            NEPTORA
          </h1>
          <p className="text-[11px] font-medium tracking-widest uppercase text-gold/80">
            Legal Document & Case Intelligence
          </p>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-44 h-1 bg-zinc-800/80 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-gold/50 via-gold to-amber-300 rounded-full animate-[progress_1s_ease-in-out_infinite]" />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <Shield className="w-3.5 h-3.5 text-gold/70" />
          <span>Encrypted Legal Vault</span>
        </div>
      </div>
    </div>
  );
}
