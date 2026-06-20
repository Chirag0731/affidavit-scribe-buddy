import { supabase } from "@/integrations/supabase/client";

const BUCKET = "affidavits";

export async function uploadAffidavitFile(
  userId: string,
  filename: string,
  blob: Blob,
): Promise<string> {
  const path = `${userId}/${filename}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) throw error;
  return path;
}

export async function getAffidavitSignedUrl(path: string, expiresInSec = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadStorageFile(path: string, downloadName: string) {
  const url = await getAffidavitSignedUrl(path, 60);
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export async function deleteAffidavitFiles(paths: string[]) {
  const valid = paths.filter(Boolean);
  if (valid.length === 0) return;
  await supabase.storage.from(BUCKET).remove(valid);
}
