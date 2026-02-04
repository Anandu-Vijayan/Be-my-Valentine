"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addName, type AddNameResult } from "@/app/actions";

export function AddNameForm({ adminKey }: { adminKey: string }) {
  const [result, setResult] = useState<AddNameResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    try {
      const res = await addName(formData);
      setResult(res);
      if (res.ok) {
        const el = document.getElementById("add-name-input");
        if (el && "value" in el) (el as HTMLInputElement).value = "";
        window.location.reload();
      }
    } catch {
      setResult({ ok: false, error: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="admin_key" value={adminKey} />
      <div className="flex gap-2">
        <input
          id="add-name-input"
          type="text"
          name="name"
          placeholder="New name"
          className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          disabled={pending}
          required
        />
        <Button type="submit" disabled={pending} size="default">
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {result && !result.ok && (
        <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
      )}
    </form>
  );
}
