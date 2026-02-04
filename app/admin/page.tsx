import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddNameForm } from "@/components/add-name-form";

type NameWithCount = { id: string; name: string; count: number };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || key !== secret) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: names } = await supabase.from("names").select("id, name").order("name");
  const namesList = names ?? [];

  if (!namesList.length) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Admin</h1>
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to home
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Add the first name to get started.</p>
          <AddNameForm adminKey={secret} />
        </div>
      </main>
    );
  }

  const { data: counts } = await supabase
    .from("submissions")
    .select("name_id");

  const countByKey = (counts ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.name_id] = (acc[row.name_id] ?? 0) + 1;
    return acc;
  }, {});

  const list: NameWithCount[] = namesList.map((n) => ({
    id: n.id,
    name: n.name,
    count: countByKey[n.id] ?? 0,
  }));
  list.sort((a, b) => b.count - a.count);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <Link href="/">
            <Button variant="outline" size="sm">
              Back to home
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Add a new name:</p>
          <AddNameForm adminKey={secret} />
        </div>
        <section>
          <h2 className="mb-2 text-lg font-medium">Votes by name</h2>
          <ul className="space-y-2 rounded-lg border bg-card p-4 text-card-foreground">
            {list.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-md border border-border/50 bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.count} vote{item.count !== 1 ? "s" : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
