import { QUICKFLO_LOGO_BASE64 } from "@/assets/quickflo-logo-asset";

interface FinancingLogoProps {
  className?: string;
  height?: number;
}

export function FinancingLogo({ className = "", height = 36 }: FinancingLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <img
        src={QUICKFLO_LOGO_BASE64}
        alt="QuickFlo Financial"
        style={{ height }}
        className="w-auto object-contain max-w-full drop-shadow-xs"
      />
    </div>
  );
}
