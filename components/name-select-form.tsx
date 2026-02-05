"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitName, type SubmitResult } from "@/app/actions";
import {
  getDeviceIdPodaRejectionError,
  getDeviceInfoPodaRejectionError,
  getModelRejectionError,
} from "@/lib/validate-model";

const DEVICE_ID_KEY = "valentine_device_id";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  const r = () => Math.floor(Math.random() * 16).toString(16);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) =>
    c === "x" ? r() : (Math.floor(Math.random() * 4) + 8).toString(16)
  );
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored != null && stored.length === 36 && UUID_REGEX.test(stored)) {
    return stored;
  }
  const id = generateUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export type DeviceInfo = {
  deviceName?: string;
  modelName?: string;
  details?: {
    userAgent?: string;
    platform?: string;
    language?: string;
    timeZone?: string;
    screenWidth?: number;
    screenHeight?: number;
    brands?: string;
    mobile?: boolean;
    platformVersion?: string;
  };
};

function parseDeviceFromUA(ua: string): { deviceName: string; modelName: string } {
  const d: { deviceName: string; modelName: string } = { deviceName: "", modelName: "" };
  if (!ua) return d;
  const u = ua.toLowerCase();
  if (u.includes("iphone")) {
    d.deviceName = "iPhone";
    const versionMatch = ua.match(/iphone\s*os\s*(\d+[_.]?\d*)/i);
    const modelMatch = ua.match(/iphone\d+,\d+/i);
    if (versionMatch) d.modelName = `iPhone (iOS ${versionMatch[1].replace("_", ".")})`;
    else if (modelMatch) d.modelName = `iPhone ${modelMatch[0].replace(/iphone/i, "").trim()}`;
    else d.modelName = "iPhone";
  } else if (u.includes("ipad")) {
    d.deviceName = "iPad";
    d.modelName = ua.match(/ipad/i) ? "iPad" : "iPad";
  } else if (u.includes("android")) {
    d.deviceName = "Android";
    const m = ua.match(/(?:samsung|sm-[\w-]+|pixel\s*\d+|oneplus|xiaomi|huawei|oppo|vivo)[^)]*/i);
    if (m) d.modelName = m[0].trim().slice(0, 40);
    else d.modelName = "Android device";
  } else if (u.includes("windows")) {
    d.deviceName = "Windows";
    d.modelName = ua.includes("Windows NT 10") ? "Windows 10/11" : "Windows";
  } else if (u.includes("mac os")) {
    d.deviceName = "Mac";
    d.modelName = ua.includes("Intel") ? "Mac (Intel)" : "Mac";
  } else if (u.includes("linux")) {
    d.deviceName = "Linux";
    d.modelName = "Linux";
  } else {
    d.deviceName = "Unknown";
    d.modelName = ua.slice(0, 50) || "—";
  }
  return d;
}

async function collectDeviceInfo(): Promise<DeviceInfo> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return {};
  const screen = typeof window.screen !== "undefined" ? window.screen : null;
  let timeZone = "";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // ignore
  }
  const ua = navigator.userAgent ?? "";
  const parsed = parseDeviceFromUA(ua);

  let deviceName = parsed.deviceName;
  let modelName = parsed.modelName;
  let brands = "";
  let platformVersion: string | undefined;
  let mobile: boolean | undefined;

  const nav = navigator as Navigator & { userAgentData?: { getHighEntropyValues?(hints: string[]): Promise<{ brands?: { brand: string; version: string }[]; model?: string; platform?: string; platformVersion?: string; mobile?: boolean }> } };
  if (nav.userAgentData?.getHighEntropyValues) {
    try {
      const hints = await nav.userAgentData.getHighEntropyValues(["brands", "model", "platform", "platformVersion", "mobile"]);
      if (hints.brands?.length) {
        brands = hints.brands.map((b) => `${b.brand} ${b.version}`.trim()).join(", ");
      }
      if (hints.model) modelName = hints.model;
      if (hints.platform) deviceName = hints.platform;
      if (hints.platformVersion) platformVersion = hints.platformVersion;
      if (typeof hints.mobile === "boolean") mobile = hints.mobile;
    } catch {
      // ignore
    }
  }

  return {
    deviceName: deviceName || undefined,
    modelName: modelName || undefined,
    details: {
      userAgent: ua || undefined,
      platform: navigator.platform ?? undefined,
      language: navigator.language ?? undefined,
      timeZone: timeZone || undefined,
      screenWidth: screen ? screen.width : undefined,
      screenHeight: screen ? screen.height : undefined,
      brands: brands || undefined,
      mobile,
      platformVersion,
    },
  };
}

type Name = { id: string; name: string };

export function NameSelectForm({ names }: { names: Name[] }) {
  const router = useRouter();
  const deviceIdRef = useRef<HTMLInputElement>(null);
  const [deviceId, setDeviceId] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    if (deviceIdRef.current) deviceIdRef.current.value = id;
  }, []);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    try {
      const idToSend =
        deviceId ||
        deviceIdRef.current?.value ||
        getOrCreateDeviceId();
      if (!idToSend) {
        setResult({ ok: false, error: "Device ID could not be created. Please allow storage and refresh." });
        return;
      }
      const deviceIdPodaError = getDeviceIdPodaRejectionError(idToSend);
      if (deviceIdPodaError) {
        setResult({ ok: false, error: deviceIdPodaError });
        return;
      }
      formData.set("device_id", idToSend);
      if (deviceIdRef.current) deviceIdRef.current.value = idToSend;
      const deviceInfo = await collectDeviceInfo();
      const podaError = getDeviceInfoPodaRejectionError(deviceInfo as Record<string, unknown>);
      if (podaError) {
        setResult({ ok: false, error: podaError });
        return;
      }
      const modelError = getModelRejectionError(deviceInfo.modelName);
      if (modelError) {
        setResult({ ok: false, error: modelError });
        return;
      }
      formData.set("device_info", JSON.stringify(deviceInfo));
      const res = await submitName(formData);
      setResult(res);
      if (res.ok) {
        setSelectedId("");
        router.refresh();
      }
    } catch {
      setResult({ ok: false, error: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="name_id" value={selectedId} />
      <input type="hidden" name="device_id" ref={deviceIdRef} defaultValue="" />
      <Select
        value={selectedId}
        onValueChange={setSelectedId}
        required
        disabled={pending}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a name..." />
        </SelectTrigger>
        <SelectContent>
          {names.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              {n.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="submit"
        disabled={pending || !selectedId || !deviceId}
        className="w-full"
      >
        {pending ? "Submitting…" : "Submit"}
      </Button>
      {result && (
        <p
          className={
            result.ok
              ? "text-sm text-green-600 dark:text-green-400"
              : "text-sm text-red-600 dark:text-red-400"
          }
        >
          {result.ok ? "Thanks! Your choice was recorded." : result.error}
        </p>
      )}
    </form>
  );
}
