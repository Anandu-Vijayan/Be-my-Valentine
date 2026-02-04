/**
 * Shared validation for device model name.
 * Used on both client (UX) and server (enforcement) so the rule cannot be bypassed.
 */

function isOnlyText(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const hasLetter = /\p{L}/u.test(value);
  const hasDigit = /\d/.test(value);
  return hasLetter && !hasDigit;
}

/** Text-only model names that are allowed (excluded from "only text" rejection). */
const ALLOWED_TEXT_MODELS = new Set(["iphone", "mac", "linux", "windows"]);

/** Generic message for model rejections that are not exactly "poda". */
const MODEL_REJECT_OTHER = "This device or model cannot submit.";

/**
 * Returns the error message if this model name should be rejected, or null if allowed.
 * Phone model numbers (e.g. iPhone 14, SM-G991B, Pixel 7) are allowed.
 * "Poyi Tharathil Poyi kalikkada" only when model is exactly "poda".
 */
export function getModelRejectionError(modelName: string | undefined | null): string | null {
  const model = (modelName ?? "").trim();
  if (!model) return null;
  if (model.toLowerCase() === "poda") return "Poyi Tharathil Poyi kalikkada";
  if (isOnlyText(model) && !ALLOWED_TEXT_MODELS.has(model.toLowerCase())) {
    return MODEL_REJECT_OTHER;
  }
  return null;
}

/** Returns true if this model name should be rejected (any reason). */
export function isModelNameRejected(modelName: string | undefined | null): boolean {
  return getModelRejectionError(modelName) !== null;
}

/** Returns "Njan ninta thandha" only when device name is exactly "poda" (case-insensitive). All other cases use different messages or allow. */
export function getDeviceNameRejectionError(deviceName: string | undefined | null): string | null {
  const name = (deviceName ?? "").trim();
  if (name.toLowerCase() === "poda") return "Njan ninta thandha";
  return null;
}
