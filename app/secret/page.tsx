import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type StoredDeviceInfo = {
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

function formatDetails(d: StoredDeviceInfo["details"] | null): string {
  if (!d || typeof d !== "object") return "—";
  const parts: string[] = [];
  if (d.platform) parts.push(d.platform);
  if (d.language) parts.push(d.language);
  if (d.timeZone) parts.push(d.timeZone);
  if (d.screenWidth != null && d.screenHeight != null) parts.push(`${d.screenWidth}×${d.screenHeight}`);
  if (d.brands) parts.push(d.brands);
  if (d.mobile != null) parts.push(d.mobile ? "Mobile" : "Desktop");
  if (d.userAgent) parts.push(d.userAgent.slice(0, 60) + (d.userAgent.length > 60 ? "…" : ""));
  return parts.length ? parts.join(" · ") : "—";
}

export default async function SecretPage({
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
  const nameById = Object.fromEntries(namesList.map((n) => [n.id, n.name]));

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, name_id, device_id, device_info, submitted_at")
    .order("submitted_at", { ascending: false });

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Secret – All submissions</h1>
          <div className="flex gap-2">
            <Link href={`/admin?key=${encodeURIComponent(secret)}`}>
              <Button variant="outline" size="sm">
                Admin
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to home
              </Button>
            </Link>
          </div>
        </div>
        <section>
          <h2 className="mb-2 text-lg font-medium">All submissions (device name, model & details)</h2>
          <div className="overflow-x-auto rounded-lg border bg-card text-card-foreground">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 font-medium">Name voted</th>
                  <th className="px-3 py-2 font-medium">Device name</th>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                  <th className="px-3 py-2 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {(submissions ?? []).map((s) => {
                  const info = s.device_info as StoredDeviceInfo | null;
                  return (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="px-3 py-2 font-medium">{nameById[s.name_id] ?? "—"}</td>
                      <td className="px-3 py-2" title={info?.deviceName ?? s.device_id}>
                        {info?.deviceName ?? "—"}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-muted-foreground" title={info?.modelName ?? ""}>
                        {info?.modelName ?? "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-muted-foreground" title={formatDetails(info?.details ?? null)}>
                        {formatDetails(info?.details ?? null)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!submissions || submissions.length === 0) && (
              <p className="px-3 py-4 text-center text-muted-foreground">No submissions yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
