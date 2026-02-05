import { createHash } from "crypto";

const FINGERPRINT_HASH_LEN = 32;
/** Expected format: exactly 32 hex characters (e.g. first 32 chars of SHA-256 hex). */
const FINGERPRINT_HEX_REGEX = /^[0-9a-f]{32}$/;

/**
 * Compute a stable server-side fingerprint from request headers.
 * Same browser/OS (e.g. Chrome on Windows) produces the same hash even in incognito,
 * so we can limit one submission per (fingerprint, name) to reduce incognito/different-browser abuse.
 *
 * @param headers - Request headers (e.g. from next/headers).
 * @param secret - Optional FINGERPRINT_SECRET env: mixed into the hash so the fingerprint cannot be forged by the client. Omit or leave unset to rely only on header values.
 * @returns 32-character hex string, or null if input is empty or hashing fails.
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
    const result = hash.slice(0, FINGERPRINT_HASH_LEN);
    return result.length === FINGERPRINT_HASH_LEN && FINGERPRINT_HEX_REGEX.test(result) ? result : null;
  } catch {
    return null;
  }
}
