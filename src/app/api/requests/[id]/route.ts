import { eq } from "drizzle-orm";
import { db } from "@/db";
import { requests } from "@/db/schema";
import { badRequest, json } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId)) return badRequest("Invalid id");
  await db.delete(requests).where(eq(requests.id, requestId));
  return json({ ok: true });
}
