/**
 * Shared validation for device model name.
 * Used on both client (UX) and server (enforcement) so the rule cannot be bypassed.
 */

function hasMixedLettersAndNumbers(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const hasLetter = /\p{L}/u.test(value);
  const hasDigit = /\d/.test(value);
  return hasLetter && hasDigit;
}

function isOnlyText(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const hasLetter = /\p{L}/u.test(value);
  const hasDigit = /\d/.test(value);
  return hasLetter && !hasDigit;
}

/** Text-only model names that are allowed (excluded from "only text" rejection). */
const ALLOWED_TEXT_MODELS = new Set(["iphone", "mac", "linux", "windows"]);

/**
 * Returns the error message if this model name should be rejected, or null if allowed.
 * - "Poda" or mixed letters+numbers → "Njan ninta thandha"
 * - Only text (letters, no digits) → "Poyi Tharathil Poyi kalikkada", except iPhone/Mac/Linux/Windows
 */
export function getModelRejectionError(modelName: string | undefined | null): string | null {
  const model = (modelName ?? "").trim();
  if (!model) return null;
  if (model.toLowerCase() === "poda") return "Njan ninta thandha";
  if (hasMixedLettersAndNumbers(model)) return "Njan ninta thandha";
  if (isOnlyText(model) && !ALLOWED_TEXT_MODELS.has(model.toLowerCase())) {
    return "Poyi Tharathil Poyi kalikkada";
  }
  return null;
}

/** Returns true if this model name should be rejected (any reason). */
export function isModelNameRejected(modelName: string | undefined | null): boolean {
  return getModelRejectionError(modelName) !== null;
}

/** Returns error message if device name is "Poda" (reject/delete such submissions), else null. */
export function getDeviceNameRejectionError(deviceName: string | undefined | null): string | null {
  const name = (deviceName ?? "").trim();
  if (name.toLowerCase() === "poda") return "Njan ninta thandha";
  return null;
}
