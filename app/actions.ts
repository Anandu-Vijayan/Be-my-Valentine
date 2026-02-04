"use server";

import { createClient } from "@/lib/supabase/server";
import { getDeviceNameRejectionError, getModelRejectionError } from "@/lib/validate-model";

const DEVICE_ID_MAX_LEN = 64;
const VALID_DEVICE_ID = /^[a-zA-Z0-9_-]{1,64}$/;
const DEVICE_INFO_MAX_RAW_LEN = 8192;
const MAX_STRING_LEN = 500;

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
  const nameId = formData.get("name_id");
  if (!nameId || typeof nameId !== "string") {
    return { ok: false, error: "Please select a name." };
  }

  let deviceIdRaw = formData.get("device_id");
  if (deviceIdRaw instanceof File) deviceIdRaw = null;
  let deviceId = (typeof deviceIdRaw === "string" ? deviceIdRaw.trim() : "") || "";
  if (!deviceId || deviceId.length > DEVICE_ID_MAX_LEN || !VALID_DEVICE_ID.test(deviceId)) {
    return { ok: false, error: "Device ID is missing or invalid. Please refresh and try again." };
  }
  const deviceIdForDb = String(deviceId).slice(0, DEVICE_ID_MAX_LEN);
  if (!deviceIdForDb) {
    return { ok: false, error: "Device ID is missing or invalid. Please refresh and try again." };
  }

  let deviceInfo: Record<string, unknown> = {};
  const deviceInfoRaw = formData.get("device_info")?.toString();
  if (deviceInfoRaw) {
    if (deviceInfoRaw.length > DEVICE_INFO_MAX_RAW_LEN) {
      return { ok: false, error: "Invalid request." };
    }
    try {
      const parsed = JSON.parse(deviceInfoRaw) as Record<string, unknown>;
      if (typeof parsed === "object" && parsed !== null) {
        deviceInfo = parsed;
      }
    } catch {
      return { ok: false, error: "Invalid request." };
    }
  }

  const deviceName = typeof deviceInfo.deviceName === "string" ? deviceInfo.deviceName : undefined;
  const deviceError = getDeviceNameRejectionError(deviceName);
  if (deviceError) {
    return { ok: false, error: deviceError };
  }

  const modelName = typeof deviceInfo.modelName === "string" ? deviceInfo.modelName : undefined;
  const modelError = getModelRejectionError(modelName);
  if (modelError) {
    return { ok: false, error: modelError };
  }

  deviceInfo = sanitizeDeviceInfo(deviceInfo);

  const supabase = await createClient();
  const safeDeviceId = deviceIdForDb;

  // Enforce one submission per device per name: check before insert so we can return a clear message.
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("device_id", safeDeviceId)
    .eq("name_id", String(nameId))
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "You've already submitted this name from this device." };
  }

  const { error } = await supabase.from("submissions").insert({
    name_id: String(nameId),
    device_id: safeDeviceId,
    device_info: deviceInfo,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "You've already submitted this name from this device." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type AddNameResult = { ok: true } | { ok: false; error: string };

export async function addName(formData: FormData): Promise<AddNameResult> {
  const secret = process.env.ADMIN_SECRET;
  const key = formData.get("admin_key");
  if (!secret || key !== secret) {
    return { ok: false, error: "Unauthorized." };
  }

  const name = formData.get("name")?.toString()?.trim();
  if (!name) {
    return { ok: false, error: "Enter a name." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("names").insert({ name });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That name already exists." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
