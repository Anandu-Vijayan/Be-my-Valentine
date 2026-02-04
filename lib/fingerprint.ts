import { createHash } from "crypto";

const FINGERPRINT_HASH_LEN = 32;

/**
 * Compute a stable server-side fingerprint from request headers.
 * Same browser/OS (e.g. Chrome on Windows) produces the same hash even in incognito,
 * so we can limit one submission per (fingerprint, name) to reduce incognito/different-browser abuse.
 * Uses optional secret so the hash cannot be forged by the client.
 */
export function getFingerprintHash(headers: Headers, secret?: string): string | null {
  try {
    const ua = headers.get("user-agent") ?? "";
    const lang = headers.get("accept-language") ?? "";
    const chUa = headers.get("sec-ch-ua") ?? "";
    const chUaPlatform = headers.get("sec-ch-ua-platform") ?? "";
    const input = [secret ?? "", ua, lang, chUa, chUaPlatform].join("|");
    if (!input.replace(/\|/g, "").trim()) return null;
    const hash = createHash("sha256").update(input, "utf8").digest("hex");
    return hash.slice(0, FINGERPRINT_HASH_LEN);
  } catch {
    return null;
  }
}
