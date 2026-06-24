import { useRef, useState } from "react";
import { RotateCcw, Copy, ClipboardPaste, Wand2, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_LAYOUT,
  PAGE_W,
  PAGE_H,
  MARGIN,
  withLayoutDefaults,
  type TemplateLayout,
  type ElementPos,
  type Template,
} from "@/types/neptora";

type ElKey = keyof TemplateLayout;

interface ElementSpec {
  key: ElKey;
  label: string;
  hasX?: boolean;
  hasWidth?: boolean;
  hasHeight?: boolean;
  hasSize?: boolean;
  hasLh?: boolean;
  render: "centeredText" | "leftText" | "block" | "line" | "image";
  defaultText?: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

const ELEMENTS: ElementSpec[] = [
  { key: "title", label: "Title", hasSize: true, hasWidth: true, render: "centeredText", defaultText: "AFFIDAVIT OF ___", defaultWidth: PAGE_W - MARGIN * 2 },
  { key: "date", label: "Date", hasX: true, hasSize: true, hasWidth: true, render: "leftText", defaultText: "Month Day, Year", defaultWidth: 240 },
  { key: "intro", label: "Intro paragraph", hasX: true, hasWidth: true, hasSize: true, hasLh: true, render: "block", defaultText: "I, [Name], of the City of ___, MAKE OATH AND SAY AS FOLLOWS:", defaultWidth: PAGE_W - MARGIN * 2 },
  { key: "facts", label: "Numbered facts (start)", hasX: true, hasWidth: true, hasSize: true, hasLh: true, render: "block", defaultText: "1. First fact ...", defaultWidth: PAGE_W - MARGIN * 2 },
  { key: "signatureLine", label: "Signature line(s)", hasX: true, hasWidth: true, render: "line", defaultWidth: PAGE_W - MARGIN * 2 },
  { key: "ackTitle", label: "Notary acknowledgement title", hasSize: true, hasWidth: true, render: "centeredText", defaultText: "NOTARY ACKNOWLEDGEMENT", defaultWidth: PAGE_W - MARGIN * 2 },
  { key: "ackText", label: "Acknowledgement text", hasX: true, hasWidth: true, hasSize: true, hasLh: true, render: "block", defaultText: "This affidavit was acknowledged before me ...", defaultWidth: PAGE_W - MARGIN * 2 - 40 },
  { key: "sworn", label: "Sworn/Declared block", hasX: true, hasWidth: true, hasSize: true, hasLh: true, render: "block", defaultText: "Sworn/Declared Remotely from the City of ___ ...", defaultWidth: 234 },
  { key: "notaryImage", label: "Notary image block (right)", hasX: true, hasWidth: true, hasHeight: true, render: "image", defaultWidth: 248, defaultHeight: 139 },
];

const SPEC = Object.fromEntries(ELEMENTS.map((s) => [s.key, s])) as Record<ElKey, ElementSpec>;
const IMG_RATIO = 202 / 361;

const PREVIEW_W = 480;
const SCALE = PREVIEW_W / PAGE_W;

type DragMode = "move" | "resize-w" | "resize-h" | "resize-wh";

export function TemplateLayoutEditor({
  value,
  onChange,
  templates = [],
  currentTemplateId,
  onApplyToAll,
}: {
  value: Partial<TemplateLayout> | null | undefined;
  onChange: (v: TemplateLayout) => void;
  templates?: Template[];
  currentTemplateId?: string;
  onApplyToAll?: (layout: TemplateLayout) => void | Promise<void>;
}) {
  const layout = withLayoutDefaults(value);
  const [selected, setSelected] = useState<ElKey>("title");
  const pageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    key: ElKey;
    mode: DragMode;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const update = (key: ElKey, patch: Partial<ElementPos>) => {
    onChange({ ...layout, [key]: { ...layout[key], ...patch } });
  };

  const widthOf = (key: ElKey): number => {
    const p = layout[key];
    return p.width ?? SPEC[key].defaultWidth ?? PAGE_W - MARGIN * 2;
  };
  const heightOf = (key: ElKey): number => {
    const p = layout[key];
    if (key === "notaryImage") {
      return p.height ?? widthOf(key) * IMG_RATIO;
    }
    return p.height ?? 24;
  };

  const handlePointerDown = (e: React.PointerEvent, key: ElKey, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(key);
    const pos = layout[key];
    dragRef.current = {
      key,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x ?? MARGIN,
      origY: pos.top,
      origW: widthOf(key),
      origH: heightOf(key),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dxPt = (e.clientX - d.startX) / SCALE;
    const dyPt = (e.clientY - d.startY) / SCALE;
    const spec = SPEC[d.key];
    const patch: Partial<ElementPos> = {};
    if (d.mode === "move") {
      patch.top = clamp(d.origY + dyPt, 0, PAGE_H - 10);
      if (spec.hasX) patch.x = clamp(d.origX + dxPt, 0, PAGE_W - 20);
    } else if (d.mode === "resize-w" || d.mode === "resize-wh") {
      const w = clamp(d.origW + dxPt, 20, PAGE_W);
      patch.width = w;
      if (d.key === "notaryImage" && d.mode === "resize-wh") {
        patch.height = clamp(d.origH + dyPt, 20, PAGE_H);
      } else if (d.key === "notaryImage") {
        patch.height = w * IMG_RATIO;
      }
    } else if (d.mode === "resize-h") {
      patch.height = clamp(d.origH + dyPt, 10, PAGE_H);
    }
    update(d.key, patch);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const reset = () => onChange({ ...DEFAULT_LAYOUT });

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(layout, null, 2));
      toast.success("Layout JSON copied to clipboard");
    } catch {
      toast.error("Clipboard not available");
    }
  };

  const pasteJson = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      onChange(withLayoutDefaults(parsed));
      toast.success("Layout pasted");
    } catch {
      toast.error("Clipboard did not contain valid layout JSON");
    }
  };

  const applyFrom = (id: string) => {
    if (!id) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    onChange(withLayoutDefaults(t.layout));
    toast.success(`Applied layout from "${t.name}"`);
  };

  const sel = layout[selected];
  const selSpec = SPEC[selected];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Drag to move. Drag the right or bottom-right handle to resize width/height.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={copyJson} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-border rounded px-3 py-1.5">
            <Copy className="w-3.5 h-3.5" /> Copy layout
          </button>
          <button type="button" onClick={pasteJson} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-border rounded px-3 py-1.5">
            <ClipboardPaste className="w-3.5 h-3.5" /> Paste layout
          </button>
          <button type="button" onClick={reset} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-border rounded px-3 py-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          {onApplyToAll && (
            <button
              type="button"
              onClick={async () => {
                const otherCount = templates.filter((t) => t.id !== currentTemplateId).length;
                if (otherCount === 0) {
                  toast.info("No other templates to apply to");
                  return;
                }
                if (!window.confirm(`Apply this layout to all ${otherCount} other template${otherCount === 1 ? "" : "s"}? This overwrites their saved layouts.`)) return;
                await onApplyToAll(layout);
              }}
              className="text-sm text-white bg-gold hover:opacity-90 flex items-center gap-1.5 rounded px-3 py-1.5"
            >
              <Layers className="w-3.5 h-3.5" /> Apply to all templates
            </button>
          )}
        </div>
      </div>

      {templates.length > 0 && (
        <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-800 rounded p-3 text-sm">
          <Wand2 className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 font-medium">Apply layout from another template:</span>
          <select
            className="input-base !py-1.5 !w-auto flex-1 max-w-xs"
            defaultValue=""
            onChange={(e) => { applyFrom(e.target.value); e.target.value = ""; }}
          >
            <option value="">Choose a template…</option>
            {templates.filter((t) => t.id !== currentTemplateId).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid lg:grid-cols-[auto,1fr] gap-6">
        <div>
          <div
            ref={pageRef}
            className="relative bg-white border border-gray-300 shadow-sm select-none"
            style={{ width: PREVIEW_W, height: PAGE_H * SCALE }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div
              className="absolute border border-dashed border-gray-200 pointer-events-none"
              style={{
                left: MARGIN * SCALE,
                top: MARGIN * SCALE,
                width: (PAGE_W - MARGIN * 2) * SCALE,
                height: (PAGE_H - MARGIN * 2) * SCALE,
              }}
            />
            {ELEMENTS.map((spec) => (
              <ElementPreview
                key={spec.key}
                spec={spec}
                pos={layout[spec.key]}
                selected={spec.key === selected}
                width={widthOf(spec.key)}
                height={heightOf(spec.key)}
                onPointerDown={(e, mode) => handlePointerDown(e, spec.key, mode)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Element</label>
            <select className="input-base" value={selected} onChange={(e) => setSelected(e.target.value as ElKey)}>
              {ELEMENTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Top (pt)" value={sel.top} min={0} max={PAGE_H} onChange={(v) => update(selected, { top: v })} />
            {selSpec.hasX && (
              <NumberField label="X (pt)" value={sel.x ?? MARGIN} min={0} max={PAGE_W} onChange={(v) => update(selected, { x: v })} />
            )}
            {selSpec.hasWidth && (
              <NumberField label="Width (pt)" value={sel.width ?? selSpec.defaultWidth ?? 200} min={20} max={PAGE_W} onChange={(v) => update(selected, { width: v })} />
            )}
            {selSpec.hasHeight && (
              <NumberField label="Height (pt)" value={sel.height ?? selSpec.defaultHeight ?? 100} min={10} max={PAGE_H} onChange={(v) => update(selected, { height: v })} />
            )}
            {selSpec.hasSize && (
              <NumberField label="Font size (pt)" value={sel.size ?? 10.5} min={5} max={36} step={0.5} onChange={(v) => update(selected, { size: v })} />
            )}
            {selSpec.hasLh && (
              <NumberField label="Line height (pt)" value={sel.lh ?? 14} min={6} max={48} step={0.5} onChange={(v) => update(selected, { lh: v })} />
            )}
          </div>

          <div className="text-xs text-muted-foreground leading-relaxed bg-card border border-border rounded p-3">
            US Letter: 612 × 792 pt (8.5 × 11 in). 72 pt = 1 in. Layout saves per template and applies to every generated PDF.
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
  width,
  height,
  onPointerDown,
}: {
  spec: ElementSpec;
  pos: ElementPos;
  selected: boolean;
  width: number;
  height: number;
  onPointerDown: (e: React.PointerEvent, mode: DragMode) => void;
}) {
  const top = pos.top * SCALE;
  const size = (pos.size ?? 10.5) * SCALE;
  const ring = selected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-blue-300";
  const w = width * SCALE;

  let left: number;
  if (spec.render === "centeredText") {
    left = (PAGE_W - width) / 2 * SCALE;
  } else {
    left = (pos.x ?? MARGIN) * SCALE;
  }

  let h: number;
  let inner: React.ReactNode;
  const baseStyle: React.CSSProperties = { left, top, width: w };

  if (spec.render === "centeredText") {
    h = Math.max(size + 4, 18);
    inner = (
      <div className="text-center font-bold truncate" style={{ fontSize: size, lineHeight: `${h}px` }}>
        {spec.defaultText}
      </div>
    );
  } else if (spec.render === "leftText") {
    h = Math.max(size + 4, 18);
    inner = (
      <div className="truncate" style={{ fontSize: size, lineHeight: `${h}px` }}>
        {spec.defaultText}
      </div>
    );
  } else if (spec.render === "block") {
    h = Math.max(24, (pos.lh ?? 14) * SCALE * 1.6);
    inner = (
      <div className="p-0.5">
        <div className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide leading-none">{spec.label}</div>
        <div className="text-gray-700 text-[10px] leading-snug truncate">{spec.defaultText}</div>
      </div>
    );
  } else if (spec.render === "line") {
    h = 14;
    inner = (
      <>
        <div className="border-t border-black/70 mt-1" />
        <div className="text-[10px] text-gray-500 leading-none mt-0.5">Signature</div>
      </>
    );
  } else {
    h = height * SCALE;
    inner = (
      <div className="w-full h-full rounded bg-amber-50/80 border border-dashed border-amber-400 flex items-center justify-center text-[10px] text-amber-800">
        Notary block (image)
      </div>
    );
  }

  const allowHResize = spec.render === "image";

  return (
    <div
      onPointerDown={(e) => onPointerDown(e, "move")}
      className={`absolute cursor-move ${ring} bg-white/80 rounded ${spec.render === "block" ? "border border-dashed border-blue-300/60" : ""}`}
      style={{ ...baseStyle, height: h }}
    >
      {inner}
      {spec.hasWidth && (
        <div
          onPointerDown={(e) => onPointerDown(e, "resize-w")}
          className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-blue-500/0 hover:bg-blue-500/30"
          title="Drag to resize width"
        />
      )}
      {allowHResize && (
        <div
          onPointerDown={(e) => onPointerDown(e, "resize-wh")}
          className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize bg-blue-600 border border-white"
          title="Drag to resize"
        />
      )}
    </div>
  );
}

function NumberField({
  label, value, onChange, min, max, step = 1,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
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
