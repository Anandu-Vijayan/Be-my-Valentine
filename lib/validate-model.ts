/**
 * Shared validation for device model name.
 * Used on both client (UX) and server (enforcement). Defensive: never throws, safe for any input.
 */

const MAX_INPUT_LEN = 1000;

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

/** Text-only model names that are allowed (excluded from "only text" rejection). */
const ALLOWED_TEXT_MODELS = new Set(["iphone", "mac", "linux", "windows"]);

/** Generic message for model rejections that are not exactly "poda". */
const MODEL_REJECT_OTHER = "This device or model cannot submit.";

/**
 * Returns the error message if this model name should be rejected, or null if allowed.
 * Phone model numbers (e.g. iPhone 14, SM-G991B, Pixel 7) are allowed.
 * "Poyi Tharathil Poyi kalikkada" only when model is exactly "poda".
 * Never throws; safe for any input.
 */
export function getModelRejectionError(modelName: string | undefined | null): string | null {
  try {
    const model = safeStr(modelName).trim();
    if (!model) return null;
    const lower = model.toLowerCase();
    if (lower === "poda") return "Poyi Tharathil Poyi kalikkada";
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
 * Returns "Njan ninta thandha" when device name contains the word "poda" (case-insensitive).
 * Blocks submission immediately; never throws; safe for any input.
 */
export function getDeviceNameRejectionError(deviceName: string | undefined | null): string | null {
  try {
    const name = safeStr(deviceName).trim();
    if (name.toLowerCase().includes("poda")) return "Njan ninta thandha";
    return null;
  } catch {
    return null;
  }
}
