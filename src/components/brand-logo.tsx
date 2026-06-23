import logoAsset from "@/assets/neptora-logo.png.asset.json";

interface BrandLogoProps {
  className?: string;
  height?: number;
}

export function BrandLogo({ className = "", height = 32 }: BrandLogoProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-md bg-[#0a1633] px-3 py-1.5 ${className}`}
    >
      <img
        src={logoAsset.url}
        alt="Neptora"
        style={{ height }}
        className="w-auto block"
      />
    </div>
  );
}
