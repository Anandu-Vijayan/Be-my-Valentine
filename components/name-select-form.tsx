"use client";

import { useState } from "react";
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

type Name = { id: string; name: string };

export function NameSelectForm({ names }: { names: Name[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setResult(null);
    const res = await submitName(formData);
    setResult(res);
    setPending(false);
    if (res.ok) {
      setSelectedId("");
      router.refresh();
    }
  }

  return (
    <form action={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="name_id" value={selectedId} />
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
      <Button type="submit" disabled={pending || !selectedId} className="w-full">
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
