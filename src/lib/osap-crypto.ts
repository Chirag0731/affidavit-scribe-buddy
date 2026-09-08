/**
 * OSAP Credential Encryption & Sensitive Data Protection
 * Uses WebCrypto AES-GCM with user-scoped key derivation.
 * Passwords and sensitive credentials are never stored or logged in plain text.
 */

const SALT = new TextEncoder().encode("neptora_osap_secure_vault_v1");

async function getKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(`neptora_key_${userId}`),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: SALT,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptCredential(
  userId: string,
  plainText: string,
): Promise<{ encryptedData: string; iv: string }> {
  if (!plainText) return { encryptedData: "", iv: "" };
  const key = await getKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const encryptedBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  const encryptedBytes = new Uint8Array(encryptedBuf);
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedBytes));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return { encryptedData: encryptedBase64, iv: ivBase64 };
}

export async function decryptCredential(
  userId: string,
  encryptedBase64: string,
  ivBase64: string,
): Promise<string> {
  if (!encryptedBase64 || !ivBase64) return "";
  try {
    const key = await getKey(userId);
    const encryptedBytes = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

    const decryptedBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedBytes,
    );

    return new TextDecoder().decode(decryptedBuf);
  } catch (err) {
    console.error("[OSAP Crypto] Decryption failed or invalid key");
    return "";
  }
}

/**
 * Masks an OAN (Ontario Access Number) for safe UI display (e.g. "•••••1234")
 */
export function maskOan(oan?: string | null): string {
  if (!oan) return "—";
  const cleaned = oan.trim();
  if (cleaned.includes("@") || /\.(com|ca|net|org)/i.test(cleaned) || /reset|eset/i.test(cleaned)) {
    return "—";
  }
  if (cleaned.toUpperCase() === "FAO") return "FAO";
  if (cleaned.length <= 4) return cleaned;
  const lastFour = cleaned.slice(-4);
  return `•••••${lastFour}`;
}

/**
 * Sanitizes object data before logging or exporting by redacting any password fields.
 */
export function sanitizeForLog<T extends Record<string, unknown>>(data: T): T {
  const copy = { ...data };
  for (const key of Object.keys(copy)) {
    if (/(password|credential|secret|token)/i.test(key)) {
      (copy as Record<string, unknown>)[key] = "[REDACTED]";
    }
  }
  return copy;
}
