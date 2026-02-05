/**
 * Shared validation for device model name and device info.
 * Used on both client (UX) and server (enforcement). Defensive: never throws, safe for any input.
 */

const MAX_INPUT_LEN = 1000;
const PODA_BLOCK_MESSAGE = "Njan ninta thandha";

/** Words that trigger full submission block (any casing, spaces, or symbols between letters). */
const BLOCKED_WORDS = ["poda", "myre", "kunne", "kunna"] as const;

/** Unicode whitespace (including ZWSP, NBSP, etc.) for stripping in blocked-word checks. */
const UNICODE_WHITESPACE = /[\s\u200B-\u200D\uFEFF\u00A0\u2028\u2029]+/g;

/** Safely coerce to string and cap length. Never throws. */
function safeStr(value: unknown): string {
  if (value == null) return "";
  try {
    const s = String(value);
    return s.length > MAX_INPUT_LEN ? s.slice(0, MAX_INPUT_LEN) : s;
  } catch {
    return "";
  }
}

/** Normalize for blocked-word detection: NFKC, strip all Unicode whitespace, lowercase. Never throws. */
function normalizeForBlockedWord(value: unknown): string {
  try {
    let s = safeStr(value);
    try {
      s = s.normalize("NFKC");
    } catch {
      /* normalize unsupported */
    }
    s = s.replace(UNICODE_WHITESPACE, "");
    return s.toLowerCase();
  } catch {
    return "";
  }
}

/** True if text contains any blocked word (poda, myre, kunne, kunna) in any form. Never throws. */
function containsBlockedWord(value: unknown): boolean {
  try {
    const s = normalizeForBlockedWord(value);
    return BLOCKED_WORDS.some((word) => word.length >= 4 && s.includes(word));
  } catch {
    return false;
  }
}

function isOnlyText(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  try {
    const hasLetter = /\p{L}/u.test(value);
    const hasDigit = /\d/.test(value);
    return hasLetter && !hasDigit;
  } catch {
    return false;
  }
}

/** Text-only model names that are allowed (lowercase to match model.toLowerCase()). */
const ALLOWED_TEXT_MODELS = new Set(["iphone", "ipad", "mac", "linux", "windows", "android"]);

const MAX_BLOCKED_SCAN_DEPTH = 5;

/**
 * Returns true if any blocked word (poda, myre, kunne, kunna) appears in any key or value in obj.
 * Recursive, depth-limited. Blocks submission if client sends such content in any field.
 */
function objectContainsBlockedWord(obj: unknown, depth: number): boolean {
  if (depth > MAX_BLOCKED_SCAN_DEPTH) return false;
  if (obj == null) return false;
  if (typeof obj === "string") return containsBlockedWord(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return containsBlockedWord(String(obj));
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (objectContainsBlockedWord(obj[i], depth + 1)) return true;
    }
    return false;
  }
  if (typeof obj === "object" && obj !== null) {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
      if (containsBlockedWord(key)) return true;
      if (objectContainsBlockedWord(record[key], depth + 1)) return true;
    }
  }
  return false;
}

/** Generic message for model rejections that are not exactly "poda". */
const MODEL_REJECT_OTHER = "This device or model cannot submit.";

/**
 * Returns the error message if this model name should be rejected, or null if allowed.
 * Phone model numbers (e.g. iPhone 14, SM-G991B, Pixel 7) are allowed.
 * "Poyi Tharathil Poyi kalikkada" only when model is exactly "poda".
 * Blocked words (myre, kunne, kunna) in model return PODA_BLOCK_MESSAGE.
 * Never throws; safe for any input.
 */
export function getModelRejectionError(modelName: string | undefined | null): string | null {
  try {
    const model = safeStr(modelName).trim();
    if (!model) return null;
    const normalized = normalizeForBlockedWord(model);
    if (normalized === "poda") return "Poyi Tharathil Poyi kalikkada";
    if (containsBlockedWord(model)) return PODA_BLOCK_MESSAGE;
    const lower = model.toLowerCase();
    if (isOnlyText(model) && !ALLOWED_TEXT_MODELS.has(lower)) {
      return MODEL_REJECT_OTHER;
    }
    return null;
  } catch {
    return null;
  }
}

/** Returns true if this model name should be rejected (any reason). Never throws. */
export function isModelNameRejected(modelName: string | undefined | null): boolean {
  return getModelRejectionError(modelName) !== null;
}

/**
 * True if device_id contains any blocked word (poda, myre, kunne, kunna) in any form.
 * Strips non-letters then checks (e.g. k-u-n-n-e, myre123). Never throws.
 */
export function deviceIdContainsPoda(deviceId: string | undefined | null): boolean {
  try {
    const s = safeStr(deviceId);
    const lettersOnly = s.replace(/[^\p{L}]/gu, "").toLowerCase();
    return BLOCKED_WORDS.some((word) => lettersOnly.length >= word.length && lettersOnly.includes(word));
  } catch {
    return false;
  }
}

/**
 * Returns "Njan ninta thandha" if device_id contains any blocked word; otherwise null.
 */
export function getDeviceIdPodaRejectionError(deviceId: string | undefined | null): string | null {
  return deviceIdContainsPoda(deviceId) ? PODA_BLOCK_MESSAGE : null;
}

/**
 * Returns "Njan ninta thandha" when device name contains any blocked word.
 * Kept for backward compatibility; prefer getDeviceInfoPodaRejectionError for full check.
 */
export function getDeviceNameRejectionError(deviceName: string | undefined | null): string | null {
  try {
    if (containsBlockedWord(deviceName)) return PODA_BLOCK_MESSAGE;
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns "Njan ninta thandha" if any blocked word (poda, myre, kunne, kunna) appears
 * anywhere in the device info payload (any key or value, including nested). Never throws.
 */
export function getDeviceInfoPodaRejectionError(
  deviceInfo: Record<string, unknown> | null | undefined
): string | null {
  try {
    if (!deviceInfo || typeof deviceInfo !== "object" || Array.isArray(deviceInfo)) return null;
    if (objectContainsBlockedWord(deviceInfo, 0)) return PODA_BLOCK_MESSAGE;
    return null;
  } catch {
    return null;
  }
}
