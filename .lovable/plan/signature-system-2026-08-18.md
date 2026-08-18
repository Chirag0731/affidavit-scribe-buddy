# Signature System

Add cropped signature images (pasted or uploaded) that are auto-cleaned to a transparent background and placed on top of each deponent's signature line in the generated PDF/DOCX and the live preview.

## What you'll be able to do

1. On the preview step, each deponent gets a signature slot showing their name and signature line.
2. Paste a cropped signature straight from the clipboard (Ctrl/Cmd+V) or upload an image file.
3. The white/light background of the pasted image is automatically knocked out so only the ink shows, sitting cleanly on top of the line.
4. Optionally save the signature to your signature library, then reuse it on any future affidavit by picking it from a dropdown.
5. Each placed signature can be dragged and resized directly on the preview page; it starts auto-centered just above the line.
6. Manage saved signatures (rename/delete) from Settings.

## Backend

- New `signatures` table: `id`, `user_id`, `label`, `storage_path`, `created_at`. RLS scoped to `auth.uid()`, plus the required GRANTs.
- New private `signatures` storage bucket with per-user folder policies, mirroring how affidavit files are handled.
- Signature images are stored as transparent PNGs after processing.

## Technical notes

- **Transparency**: client-side canvas pass — read pixels, set alpha to 0 for near-white pixels (luminance threshold with a soft edge band), re-encode as PNG. No server dependency, works on paste and upload.
- **Paste capture**: a paste handler on the signature slot reads `ClipboardEvent.clipboardData.items` for `image/*` blobs; file input fallback for upload.
- **Data model** (`src/types/neptora.ts`): add a `signatures` entry to `TemplateLayout`-adjacent state as a per-affidavit array `{ deponentIndex, dataUrl, x, top, width, height }`, defaulted from the `signatureLine` position (centered on the line, default height ~28pt). Stored on the affidavit record so reopening a saved affidavit keeps the signature.
- **PDF** (`src/lib/doc-generator.ts`): `pdf.embedPng` each signature and `drawImage` at its position, drawn after the signature lines so ink overlaps the rule.
- **DOCX**: same images inserted via `ImageRun` inside the existing signature table cells.
- **Preview** (`src/components/pdf-html-preview.tsx`): render each signature as an absolutely-positioned `<img>` using the same pt→px conversion, with drag/resize handles matching the interaction model already used in the template layout editor.
- **Reuse**: saved signatures are fetched into a picker; selecting one loads its PNG from storage via a signed URL.
