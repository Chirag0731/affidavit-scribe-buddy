import { supabase } from "@/integrations/supabase/client";
import { dataUrlToBlob } from "@/lib/signature-image";

const BUCKET = "signatures";

export interface SavedSignature {
  id: string;
  user_id: string;
  label: string;
  storage_path: string;
  created_at: string;
}

export async function listSavedSignatures(): Promise<SavedSignature[]> {
  const { data, error } = await supabase
    .from("signatures" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as SavedSignature[]) || [];
}

export async function saveSignature(label: string, dataUrl: string): Promise<SavedSignature> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const path = `${user.id}/${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, dataUrlToBlob(dataUrl), { upsert: true, contentType: "image/png" });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("signatures" as never)
    .insert({ user_id: user.id, label, storage_path: path } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as SavedSignature;
}

export async function renameSignature(id: string, label: string): Promise<void> {
  const { error } = await supabase
    .from("signatures" as never)
    .update({ label } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSignature(sig: SavedSignature): Promise<void> {
  await supabase.storage.from(BUCKET).remove([sig.storage_path]);
  const { error } = await supabase.from("signatures" as never).delete().eq("id", sig.id);
  if (error) throw error;
}

/** Fetch a stored signature as a data URL so it can be embedded in PDFs. */
export async function loadSignatureDataUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 120);
  if (error) throw error;
  const res = await fetch(data.signedUrl);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("Could not load signature"));
    fr.readAsDataURL(blob);
  });
}
