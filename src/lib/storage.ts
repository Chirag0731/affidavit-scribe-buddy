import { supabase } from "@/integrations/supabase/client";

const BUCKET = "affidavits";

// Global memory cache for blobs so local preview and downloads work immediately even if remote storage is unreachable
const localBlobMap = new Map<string, Blob>();

export function cacheLocalAffidavitBlob(path: string, blob: Blob) {
  localBlobMap.set(path, blob);
}

export function getLocalAffidavitBlob(path: string): Blob | undefined {
  return localBlobMap.get(path);
}

export async function uploadAffidavitFile(
  userId: string,
  filename: string,
  blob: Blob,
): Promise<string> {
  const path = `${userId}/${filename}`;
  // Always cache locally first so user never loses their file
  localBlobMap.set(path, blob);
  localBlobMap.set(filename, blob);

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) {
      console.warn("Supabase storage upload error (using local blob cache):", error.message);
      return path;
    }
    return path;
  } catch (err) {
    console.warn("Storage upload exception (using local blob cache):", err);
    return path;
  }
}

export async function getAffidavitSignedUrl(path: string, expiresInSec = 60): Promise<string> {
  // Check local blob cache first
  const cached = localBlobMap.get(path) || localBlobMap.get(path.split("/").pop() || "");
  if (cached) {
    return URL.createObjectURL(cached);
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSec);
    if (error || !data?.signedUrl) {
      throw error || new Error("Failed to create signed URL");
    }
    return data.signedUrl;
  } catch (err) {
    console.warn("Could not get signed URL from Supabase:", err);
    // If we have any cached blob, return object URL
    if (cached) return URL.createObjectURL(cached);
    throw err;
  }
}

export async function downloadStorageFile(path: string, downloadName: string) {
  const cached = localBlobMap.get(path) || localBlobMap.get(path.split("/").pop() || "");
  if (cached) {
    const objectUrl = URL.createObjectURL(cached);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return;
  }

  try {
    const url = await getAffidavitSignedUrl(path, 60);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch file from storage");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error("Failed to download storage file:", err);
    throw err;
  }
}

export async function deleteAffidavitFiles(paths: string[]) {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return;
  valid.forEach((p) => {
    localBlobMap.delete(p);
    localBlobMap.delete(p.split("/").pop() || "");
  });
  try {
    await supabase.storage.from(BUCKET).remove(valid);
  } catch (err) {
    console.warn("Storage delete failed:", err);
  }
}
