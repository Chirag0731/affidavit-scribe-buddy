import logoAsset from "@/assets/neptora-logo.png.asset.json";

interface BrandLogoProps {
  className?: string;
  height?: number;
}

export function BrandLogo({ className = "", height = 32 }: BrandLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="Neptora"
      style={{ height }}
      className={`w-auto block ${className}`}
    />
  );
}
