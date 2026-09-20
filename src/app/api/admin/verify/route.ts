import { getAdminPassword, json, str } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = str(body?.password);
  const expected = await getAdminPassword();
  if (password === expected) {
    return json({ ok: true });
  }
  return json({ ok: false, error: "Incorrect admin password" }, 401);
}
