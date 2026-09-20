import { runSeed } from "@/db/seed";
import { json } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await runSeed({ force: body?.force === true });
  return json({ ok: true, ...result });
}
