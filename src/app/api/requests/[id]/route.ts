import { eq } from "drizzle-orm";
import { db } from "@/db";
import { requests } from "@/db/schema";
import { badRequest, json, unauthorized, verifyAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, ctx: Ctx) {
  if (!(await verifyAdmin(request))) {
    return unauthorized("Admin password required to delete history");
  }

  const { id } = await ctx.params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId)) return badRequest("Invalid id");
  await db.delete(requests).where(eq(requests.id, requestId));
  return json({ ok: true });
}
