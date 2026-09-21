import { QUICKFLO_LOGO_BASE64 } from "@/assets/quickflo-logo-asset";

interface FinancingLogoProps {
  className?: string;
  height?: number;
  plain?: boolean;
}

export function FinancingLogo({ className = "", height = 36, plain = false }: FinancingLogoProps) {
  if (plain) {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src={QUICKFLO_LOGO_BASE64}
          alt="QuickFlo Financial"
          style={{ height }}
          className="w-auto object-contain max-w-full drop-shadow-xs"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-xl bg-white shadow-xs border border-white/20 select-none ${className}`}
    >
      <img
        src={QUICKFLO_LOGO_BASE64}
        alt="QuickFlo Financial"
        style={{ height: Math.max(height - 8, 22) }}
        className="w-auto object-contain max-w-full"
      />
    </div>
  );
}
