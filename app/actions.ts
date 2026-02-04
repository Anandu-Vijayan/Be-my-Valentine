"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getFingerprintHash } from "@/lib/fingerprint";
import {
  getDeviceIdPodaRejectionError,
  getDeviceInfoPodaRejectionError,
  getModelRejectionError,
} from "@/lib/validate-model";

const DEVICE_ID_MAX_LEN = 64;
// Only allow IDs our client generates: UUID v4 or fallback "d-<base36>-<base36>". Rejects spoofed values.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_ID_FALLBACK = /^d-[a-z0-9]+-[a-z0-9]+$/i;
const DEVICE_INFO_MAX_RAW_LEN = 8192;
const MAX_STRING_LEN = 500;
const NAME_ID_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADD_NAME_MAX_LEN = 100;
const GENERIC_ERROR = "Something went wrong. Please try again.";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}

const DETAIL_KEYS = new Set([
  "userAgent", "platform", "language", "timeZone", "screenWidth", "screenHeight",
  "brands", "mobile", "platformVersion",
]);

function toStr(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return s.length > MAX_STRING_LEN ? s.slice(0, MAX_STRING_LEN) : s;
}

function sanitizeDeviceInfo(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof raw.deviceName === "string") out.deviceName = toStr(raw.deviceName);
  if (typeof raw.modelName === "string") out.modelName = toStr(raw.modelName);
  if (raw.details && typeof raw.details === "object" && !Array.isArray(raw.details)) {
    const d = raw.details as Record<string, unknown>;
    const details: Record<string, unknown> = {};
    for (const key of Object.keys(d)) {
      if (!DETAIL_KEYS.has(key)) continue;
      const v = d[key];
      if (key === "screenWidth" || key === "screenHeight") {
        const n = Number(v);
        if (Number.isFinite(n)) details[key] = n;
      } else if (key === "mobile") {
        if (typeof v === "boolean") details[key] = v;
      } else {
        details[key] = toStr(v);
      }
    }
    out.details = details;
  }
  return out;
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitName(formData: FormData): Promise<SubmitResult> {
  try {
    const nameIdRaw = formData.get("name_id");
    const nameId = typeof nameIdRaw === "string" ? nameIdRaw.trim() : "";
    if (!nameId || !NAME_ID_UUID.test(nameId)) {
      return { ok: false, error: "Please select a name." };
    }

    let deviceIdRaw = formData.get("device_id");
  if (deviceIdRaw instanceof File) deviceIdRaw = null;
  const deviceId = (typeof deviceIdRaw === "string" ? deviceIdRaw.trim() : "") || "";
  const deviceIdValid =
    deviceId.length > 0 &&
    deviceId.length <= DEVICE_ID_MAX_LEN &&
    (UUID_V4.test(deviceId) || DEVICE_ID_FALLBACK.test(deviceId));
  if (!deviceIdValid) {
    return { ok: false, error: "Device ID is missing or invalid. Please refresh and try again." };
  }
  const deviceIdPodaError = getDeviceIdPodaRejectionError(deviceId);
  if (deviceIdPodaError) {
    return { ok: false, error: deviceIdPodaError };
  }
  const deviceIdForDb = deviceId.slice(0, DEVICE_ID_MAX_LEN);

  const deviceInfoRaw = formData.get("device_info")?.toString();
  if (!deviceInfoRaw || deviceInfoRaw.length > DEVICE_INFO_MAX_RAW_LEN) {
    return { ok: false, error: "Invalid request." };
  }
  let deviceInfo: Record<string, unknown>;
  try {
    const parsed = JSON.parse(deviceInfoRaw) as unknown;
    if (!isPlainObject(parsed)) {
      return { ok: false, error: "Invalid request." };
    }
    deviceInfo = parsed;
  } catch {
    return { ok: false, error: "Invalid request." };
  }

  // Require deviceName and modelName from client; reject stripped or spoofed payloads missing them.
  const deviceName = typeof deviceInfo.deviceName === "string" ? deviceInfo.deviceName.trim() : "";
  const modelName = typeof deviceInfo.modelName === "string" ? deviceInfo.modelName.trim() : "";
  if (!deviceName || !modelName) {
    return { ok: false, error: "Invalid request." };
  }

  const podaError = getDeviceInfoPodaRejectionError(deviceInfo);
  if (podaError) {
    return { ok: false, error: podaError };
  }

  const modelError = getModelRejectionError(modelName);
  if (modelError) {
    return { ok: false, error: modelError };
  }

  deviceInfo = sanitizeDeviceInfo(deviceInfo);

  const supabase = await createClient();

  // Ensure name_id exists in names table (prevents fake or deleted name_id).
  const { data: nameRow, error: nameError } = await supabase
    .from("names")
    .select("id")
    .eq("id", nameId)
    .maybeSingle();

  if (nameError || !nameRow) {
    return { ok: false, error: "Please select a name." };
  }

  const safeDeviceId = deviceIdForDb;

  // Enforce one submission per device per name.
  const { data: existingByDevice } = await supabase
    .from("submissions")
    .select("id")
    .eq("device_id", safeDeviceId)
    .eq("name_id", nameId)
    .maybeSingle();

  if (existingByDevice) {
    return { ok: false, error: "You've already submitted this name from this device." };
  }

  // Same browser/OS fingerprint (e.g. incognito or same machine) can only submit once per name.
  const headersList = await headers();
  const fingerprintSecret = process.env.FINGERPRINT_SECRET?.trim();
  const fingerprintHash = getFingerprintHash(headersList, fingerprintSecret);

  if (fingerprintHash) {
    const { data: existingByFingerprint } = await supabase
      .from("submissions")
      .select("id")
      .eq("fingerprint_hash", fingerprintHash)
      .eq("name_id", nameId)
      .maybeSingle();

    if (existingByFingerprint) {
      return { ok: false, error: "You've already submitted this name from this device or browser." };
    }
  }

  const { error } = await supabase.from("submissions").insert({
    name_id: nameId,
    device_id: safeDeviceId,
    device_info: deviceInfo,
    ...(fingerprintHash && { fingerprint_hash: fingerprintHash }),
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You've already submitted this name from this device or browser." };
    }
    return { ok: false, error: GENERIC_ERROR };
  }
  return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}

export type AddNameResult = { ok: true } | { ok: false; error: string };

/** Strip control characters and limit length for safe display/storage. */
function sanitizeName(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]/g, "").slice(0, ADD_NAME_MAX_LEN).trim();
}

export async function addName(formData: FormData): Promise<AddNameResult> {
  try {
    const secret = process.env.ADMIN_SECRET;
    const keyRaw = formData.get("admin_key");
    const key = typeof keyRaw === "string" ? keyRaw : "";
    if (!secret || key !== secret) {
      return { ok: false, error: "Unauthorized." };
    }

    const nameRaw = formData.get("name")?.toString() ?? "";
    const name = sanitizeName(nameRaw);
    if (!name) {
      return { ok: false, error: "Enter a name." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("names").insert({ name });

    if (error) {
      if (error.code === "23505") return { ok: false, error: "That name already exists." };
      return { ok: false, error: GENERIC_ERROR };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}
