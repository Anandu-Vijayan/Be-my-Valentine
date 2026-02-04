"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const DEVICE_ID_MAX_LEN = 64;
const VALID_DEVICE_ID = /^[a-zA-Z0-9_-]{1,64}$/;

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
    try {
      const parsed = JSON.parse(deviceInfoRaw) as Record<string, unknown>;
      if (typeof parsed === "object" && parsed !== null) {
        deviceInfo = parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const supabase = await createClient();
  const safeDeviceId = deviceIdForDb || `f-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
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
