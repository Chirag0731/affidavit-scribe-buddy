import { useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  DEFAULT_LAYOUT,
  PAGE_W,
  PAGE_H,
  MARGIN,
  withLayoutDefaults,
  type TemplateLayout,
  type ElementPos,
} from "@/types/neptora";

type ElKey = keyof TemplateLayout;

interface ElementSpec {
  key: ElKey;
  label: string;
  hasX?: boolean;
  hasWidth?: boolean;
  hasSize?: boolean;
  hasLh?: boolean;
  /** Visual rendering hint */
  render: "centeredText" | "leftText" | "block" | "line" | "image";
  defaultText?: string;
}

const ELEMENTS: ElementSpec[] = [
  { key: "title", label: "Title", hasSize: true, render: "centeredText", defaultText: "AFFIDAVIT OF ___" },
  { key: "date", label: "Date", hasX: true, hasSize: true, render: "leftText", defaultText: "Month Day, Year" },
  { key: "intro", label: "Intro paragraph", hasX: true, hasSize: true, hasLh: true, render: "block", defaultText: "I, [Name], of the City of ___, MAKE OATH AND SAY AS FOLLOWS:" },
  { key: "facts", label: "Numbered facts (start)", hasSize: true, hasLh: true, render: "block", defaultText: "1. First fact ..." },
  { key: "signatureLine", label: "Signature line", render: "line" },
  { key: "ackTitle", label: "Notary acknowledgement title", hasSize: true, render: "centeredText", defaultText: "NOTARY ACKNOWLEDGEMENT" },
  { key: "ackText", label: "Acknowledgement text", hasSize: true, hasLh: true, render: "block", defaultText: "This affidavit was acknowledged before me ..." },
  { key: "sworn", label: "Sworn/Declared block", hasX: true, hasWidth: true, hasSize: true, hasLh: true, render: "block", defaultText: "Sworn/Declared Remotely from the City of ___ ..." },
  { key: "notaryImage", label: "Notary image block (right)", hasX: true, hasWidth: true, render: "image" },
];

const PREVIEW_W = 480;
const SCALE = PREVIEW_W / PAGE_W;

export function TemplateLayoutEditor({
  value,
  onChange,
}: {
  value: Partial<TemplateLayout> | null | undefined;
  onChange: (v: TemplateLayout) => void;
}) {
  const layout = withLayoutDefaults(value);
  const [selected, setSelected] = useState<ElKey>("title");
  const pageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: ElKey; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const update = (key: ElKey, patch: Partial<ElementPos>) => {
    onChange({ ...layout, [key]: { ...layout[key], ...patch } });
  };

  const handlePointerDown = (e: React.PointerEvent, key: ElKey) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(key);
    const pos = layout[key];
    dragRef.current = {
      key,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x ?? MARGIN,
      origY: pos.top,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dxPt = (e.clientX - d.startX) / SCALE;
    const dyPt = (e.clientY - d.startY) / SCALE;
    const spec = ELEMENTS.find((s) => s.key === d.key)!;
    const patch: Partial<ElementPos> = { top: clamp(d.origY + dyPt, 0, PAGE_H - 10) };
    if (spec.hasX) patch.x = clamp(d.origX + dxPt, 0, PAGE_W - 20);
    update(d.key, patch);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const reset = () => {
    onChange({ ...DEFAULT_LAYOUT });
  };

  const sel = layout[selected];
  const selSpec = ELEMENTS.find((s) => s.key === selected)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Drag any element on the page to reposition. Use the panel for precise values.
        </p>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1.5 border border-gray-300 rounded px-3 py-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
        </button>
      </div>

      <div className="grid lg:grid-cols-[auto,1fr] gap-6">
        {/* Page preview */}
        <div>
          <div
            ref={pageRef}
            className="relative bg-white border border-gray-300 shadow-sm select-none"
            style={{ width: PREVIEW_W, height: PAGE_H * SCALE }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => {/* clicking blank deselects nothing — keep selection */}}
          >
            {/* margin guides */}
            <div
              className="absolute border border-dashed border-gray-200 pointer-events-none"
              style={{
                left: MARGIN * SCALE,
                top: MARGIN * SCALE,
                width: (PAGE_W - MARGIN * 2) * SCALE,
                height: (PAGE_H - MARGIN * 2) * SCALE,
              }}
            />
            {ELEMENTS.map((spec) => {
              const p = layout[spec.key];
              const isSel = spec.key === selected;
              return (
                <ElementPreview
                  key={spec.key}
                  spec={spec}
                  pos={p}
                  selected={isSel}
                  onPointerDown={(e) => handlePointerDown(e, spec.key)}
                />
              );
            })}
          </div>
        </div>

        {/* Right-side controls */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Element</label>
            <select
              className="input-base"
              value={selected}
              onChange={(e) => setSelected(e.target.value as ElKey)}
            >
              {ELEMENTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Top (pt from top of page)"
              value={sel.top}
              min={0}
              max={PAGE_H}
              onChange={(v) => update(selected, { top: v })}
            />
            {selSpec.hasX && (
              <NumberField
                label="X (pt from left)"
                value={sel.x ?? MARGIN}
                min={0}
                max={PAGE_W}
                onChange={(v) => update(selected, { x: v })}
              />
            )}
            {selSpec.hasWidth && (
              <NumberField
                label="Width (pt)"
                value={sel.width ?? 200}
                min={20}
                max={PAGE_W}
                onChange={(v) => update(selected, { width: v })}
              />
            )}
            {selSpec.hasSize && (
              <NumberField
                label="Font size (pt)"
                value={sel.size ?? 10.5}
                min={5}
                max={36}
                step={0.5}
                onChange={(v) => update(selected, { size: v })}
              />
            )}
            {selSpec.hasLh && (
              <NumberField
                label="Line height (pt)"
                value={sel.lh ?? 14}
                min={6}
                max={48}
                step={0.5}
                onChange={(v) => update(selected, { lh: v })}
              />
            )}
          </div>

          <div className="text-xs text-gray-500 leading-relaxed bg-gray-50 border border-gray-200 rounded p-3">
            US Letter page: 612 × 792 pt (≈ 8.5″ × 11″). 72 pt = 1 inch. Coordinates
            are saved per template and applied to every generated PDF.
          </div>
        </div>
      </div>
    </div>
  );
}

function ElementPreview({
  spec,
  pos,
  selected,
  onPointerDown,
}: {
  spec: ElementSpec;
  pos: ElementPos;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const top = pos.top * SCALE;
  const size = (pos.size ?? 10.5) * SCALE;
  const lh = (pos.lh ?? 14) * SCALE;
  const ring = selected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-blue-300";
  const baseLabelCls = `absolute cursor-move ${ring} bg-white/80`;

  if (spec.render === "centeredText") {
    return (
      <div
        onPointerDown={onPointerDown}
        className={`${baseLabelCls} px-1 rounded`}
        style={{
          left: 0,
          right: 0,
          top,
          textAlign: "center",
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1,
        }}
      >
        <span className="inline-block bg-white px-1 border border-transparent">{spec.defaultText}</span>
      </div>
    );
  }

  if (spec.render === "leftText") {
    const x = (pos.x ?? MARGIN) * SCALE;
    return (
      <div
        onPointerDown={onPointerDown}
        className={`${baseLabelCls} px-1 rounded`}
        style={{ left: x, top, fontSize: size, lineHeight: 1 }}
      >
        {spec.defaultText}
      </div>
    );
  }

  if (spec.render === "block") {
    const x = (pos.x ?? MARGIN) * SCALE;
    const w = (pos.width ?? PAGE_W - MARGIN * 2) * SCALE;
    return (
      <div
        onPointerDown={onPointerDown}
        className={`${baseLabelCls} rounded border border-dashed border-blue-300/60 p-0.5`}
        style={{ left: x, top, width: w, fontSize: size, lineHeight: `${lh}px` }}
      >
        <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide leading-none">
          {spec.label}
        </div>
        <div className="text-gray-700 text-[10px] leading-snug truncate">
          {spec.defaultText}
        </div>
      </div>
    );
  }

  if (spec.render === "line") {
    return (
      <div
        onPointerDown={onPointerDown}
        className={`${baseLabelCls} rounded`}
        style={{
          left: MARGIN * SCALE,
          right: MARGIN * SCALE,
          top,
          height: 14,
        }}
      >
        <div className="border-t border-black/70 mt-1" />
        <div className="text-[10px] text-gray-500 leading-none mt-0.5">Signature</div>
      </div>
    );
  }

  // image block
  const x = (pos.x ?? 308) * SCALE;
  const w = (pos.width ?? 248) * SCALE;
  const h = w * (202 / 361);
  return (
    <div
      onPointerDown={onPointerDown}
      className={`${baseLabelCls} rounded bg-amber-50/80 border border-dashed border-amber-400 flex items-center justify-center text-[10px] text-amber-800`}
      style={{ left: x, top, width: w, height: h }}
    >
      Notary block (image)
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        className="input-base !py-2"
        value={Number.isFinite(value) ? Math.round(value * 10) / 10 : 0}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
