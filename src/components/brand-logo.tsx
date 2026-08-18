import logoAsset from "@/assets/neptora-logo.png.asset.json";

interface BrandLogoProps {
  className?: string;
  height?: number;
}

export function BrandLogo({ className = "", height = 34 }: BrandLogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="Neptora"
      style={{ height }}
      className={`w-auto block object-contain select-none max-w-full ${className}`}
    />
  );
}
