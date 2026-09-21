import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PenTool, Type, RotateCcw, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SignatureStyleId =
  | "font-signature-1"
  | "font-signature-2"
  | "font-signature-3"
  | "font-signature-4";

interface SignatureStyleConfig {
  id: SignatureStyleId;
  label: string;
  sublabel: string;
  fontFamily: string;
  fontClass: string;
  canvasFontSize: number;
}

const SIGNATURE_STYLES: SignatureStyleConfig[] = [
  {
    id: "font-signature-1",
    label: "Executive Script",
    sublabel: "Great Vibes",
    fontFamily: "'Great Vibes', 'Brush Script MT', cursive",
    fontClass: "font-signature-1",
    canvasFontSize: 46,
  },
  {
    id: "font-signature-2",
    label: "Flowing Cursive",
    sublabel: "Dancing Script",
    fontFamily: "'Dancing Script', 'Segoe Script', cursive",
    fontClass: "font-signature-2",
    canvasFontSize: 40,
  },
  {
    id: "font-signature-3",
    label: "Modern Pen",
    sublabel: "Caveat",
    fontFamily: "'Caveat', 'Lucida Handwriting', cursive",
    fontClass: "font-signature-3",
    canvasFontSize: 44,
  },
  {
    id: "font-signature-4",
    label: "Fine Flourish",
    sublabel: "Alex Brush",
    fontFamily: "'Alex Brush', 'Apple Chancery', cursive",
    fontClass: "font-signature-4",
    canvasFontSize: 48,
  },
];

interface FinancingSignaturePadProps {
  value?: string;
  signerName?: string;
  onChange: (dataUrl: string) => void;
  required?: boolean;
}

export function FinancingSignaturePad({
  value,
  signerName = "",
  onChange,
}: FinancingSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!value);
  const [typedName, setTypedName] = useState(signerName);
  const [selectedFont, setSelectedFont] = useState<SignatureStyleId>("font-signature-1");
  const [activeTab, setActiveTab] = useState<"draw" | "type">("draw");
  const [history, setHistory] = useState<ImageData[]>([]);

  // Update typedName if signerName changes and local typedName is blank
  useEffect(() => {
    if (signerName && !typedName) {
      setTypedName(signerName);
    }
  }, [signerName]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions with high DPR
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a";

    // If initial value exists and is an image, draw it
    if (value && value.startsWith("data:image")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, []);

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), imgData]);
    } catch {
      // ignore
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    saveHistory();
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    exportCanvas();
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setHistory([]);
    onChange("");
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...history];
    const prev = newHistory.pop();
    setHistory(newHistory);

    if (prev) {
      ctx.putImageData(prev, 0, 0);
      exportCanvas();
    } else {
      handleClear();
    }
  };

  const handleAdoptTypedSignature = async (styleOverride?: SignatureStyleId) => {
    const styleId = styleOverride || selectedFont;
    const text = typedName.trim();
    if (!text) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure web fonts are completely ready before rasterizing
    if (typeof document !== "undefined" && document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // proceed
      }
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    const activeStyle =
      SIGNATURE_STYLES.find((s) => s.id === styleId) || SIGNATURE_STYLES[0];

    ctx.save();
    ctx.font = `italic ${activeStyle.canvasFontSize}px ${activeStyle.fontFamily}`;
    ctx.fillStyle = "#0f172a";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(text, rect.width / 2, rect.height / 2);
    ctx.restore();

    setHasDrawn(true);
    exportCanvas();
  };

  return (
    <div className="w-full space-y-3">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const tab = v as "draw" | "type";
          setActiveTab(tab);
          if (tab === "type" && typedName.trim() && !hasDrawn) {
            setTimeout(() => handleAdoptTypedSignature(), 50);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <TabsList className="grid grid-cols-2 w-48 h-8">
            <TabsTrigger value="draw" className="text-xs flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5" />
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="text-xs flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" />
              Type
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5">
            {history.length > 0 && activeTab === "draw" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUndo}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Undo
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* DRAW TAB */}
        <TabsContent value="draw" className="mt-2 space-y-2">
          <div className="relative border-2 border-dashed border-border rounded-xl bg-white overflow-hidden shadow-inner group focus-within:border-cyan-600 transition-colors">
            <canvas
              ref={canvasRef}
              className="w-full h-36 cursor-crosshair touch-none select-none block"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1">
                <PenTool className="w-6 h-6 stroke-1" />
                <span className="text-xs font-medium">
                  Draw your signature here with finger or mouse
                </span>
              </div>
            )}

            <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 select-none flex items-center gap-1 font-serif">
              <span>X</span>
              <div className="w-24 border-b border-slate-300" />
            </div>
          </div>
        </TabsContent>

        {/* TYPE TAB */}
        <TabsContent value="type" className="mt-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              type="text"
              placeholder="Type your legal full name"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="sm:col-span-2 text-sm bg-background"
            />
            <Button
              type="button"
              onClick={() => handleAdoptTypedSignature()}
              className="bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs h-9"
              disabled={!typedName.trim()}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Adopt Signature
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SIGNATURE_STYLES.map((style) => {
              const isSelected = selectedFont === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setSelectedFont(style.id);
                    if (typedName.trim()) {
                      handleAdoptTypedSignature(style.id);
                    }
                  }}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all duration-150 relative overflow-hidden group cursor-pointer",
                    isSelected
                      ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/50 shadow-sm"
                      : "border-border/80 bg-muted/20 hover:bg-muted/40 hover:border-border text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-tight text-muted-foreground">
                      {style.label}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-xl sm:text-2xl mt-1.5 leading-none truncate select-none",
                      style.fontClass,
                      isSelected ? "text-cyan-200" : "text-foreground"
                    )}
                  >
                    {typedName.trim() || style.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Canvas preview below typing */}
          <div className="relative border-2 border-dashed border-border rounded-xl bg-white overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              className="w-full h-28 block pointer-events-none select-none"
            />
            <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 select-none flex items-center gap-1 font-serif">
              <span>X</span>
              <div className="w-24 border-b border-slate-300" />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span className="flex items-center gap-1">
          {hasDrawn ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <Check className="w-3.5 h-3.5" /> Signature captured
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              Signature required to authorize credit pull
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground/80">
          Secured with 256-bit encryption
        </span>
      </div>
    </div>
  );
}
