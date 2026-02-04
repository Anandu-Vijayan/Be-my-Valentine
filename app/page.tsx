import { createClient } from "@/lib/supabase/server";
import { NameSelectForm } from "@/components/name-select-form";

export default async function HomePage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
            Setup required
          </h2>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Add <code className="rounded bg-amber-200/50 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/50">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-amber-200/50 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/50">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code className="rounded bg-amber-200/50 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/50">.env.local</code>.
          </p>
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-medium text-amber-700 underline dark:text-amber-300"
          >
            Get them from Supabase Dashboard →
          </a>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("names")
    .select("id, name")
    .order("name");
  const names = data ?? [];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Be my Valentine?
        </h1>
        <p className="text-muted-foreground">
          Choose a name and submit to cast your vote.
        </p>
        <NameSelectForm names={names} />
      </div>
    </main>
  );
}
