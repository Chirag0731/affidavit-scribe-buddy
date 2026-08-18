/**
 * Client-side helpers to turn a pasted/uploaded signature crop into a
 * transparent PNG (white paper knocked out, ink kept).
 */

export interface ProcessedSignature {
  dataUrl: string;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("Could not read that file"));
    fr.readAsDataURL(blob);
  });
}

/**
 * Remove the light background of a signature image and trim empty edges.
 * `threshold` is the luminance (0-255) above which a pixel is treated as paper.
 */
export async function makeSignatureTransparent(
  source: Blob | string,
  threshold = 235,
): Promise<ProcessedSignature> {
  const src = typeof source === "string" ? source : await blobToDataUrl(source);
  const img = await loadImage(src);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");
  ctx.drawImage(img, 0, 0);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;

  // Soft band below the threshold keeps antialiased ink edges smooth.
  const soft = 45;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha: number;
    if (lum >= threshold) {
      alpha = 0;
    } else if (lum >= threshold - soft) {
      alpha = Math.round(((threshold - lum) / soft) * 255);
    } else {
      alpha = px[i + 3];
    }
    px[i + 3] = Math.min(px[i + 3], alpha);

    if (px[i + 3] > 16) {
      const p = i / 4;
      const x = p % canvas.width;
      const y = Math.floor(p / canvas.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  ctx.putImageData(data, 0, 0);

  // Trim to the ink bounding box (with a small padding) when we found ink.
  if (maxX >= minX && maxY >= minY) {
    const pad = 4;
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const sw = Math.min(canvas.width - sx, maxX - minX + 1 + pad * 2);
    const sh = Math.min(canvas.height - sy, maxY - minY + 1 + pad * 2);

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    const octx = out.getContext("2d");
    if (!octx) throw new Error("Canvas is not available in this browser");
    octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return { dataUrl: out.toDataURL("image/png"), width: sw, height: sh };
  }

  return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
}

/** Pull the first image out of a paste event, if any. */
export function imageFromClipboard(e: ClipboardEvent): Blob | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of Array.from(items)) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
