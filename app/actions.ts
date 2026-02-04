"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitName(formData: FormData): Promise<SubmitResult> {
  const nameId = formData.get("name_id");
  if (!nameId || typeof nameId !== "string") {
    return { ok: false, error: "Please select a name." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("submissions").insert({ name_id: nameId });

  if (error) {
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
