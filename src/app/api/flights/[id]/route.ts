import { eq } from "drizzle-orm";
import { db } from "@/db";
import { flights } from "@/db/schema";
import { badRequest, json, str, unauthorized, verifyAdmin } from "@/lib/server";
import { daypartOf } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await verifyAdmin(request))) {
    return unauthorized("Admin password required to edit flight");
  }

  const { id } = await ctx.params;
  const flightId = Number(id);
  if (!Number.isFinite(flightId)) return badRequest("Invalid id");
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const patch: Record<string, unknown> = {};
  if (body.flightNo !== undefined) patch.flightNo = str(body.flightNo).toUpperCase();
  if (body.origin !== undefined) patch.origin = str(body.origin).toUpperCase();
  if (body.destination !== undefined)
    patch.destination = str(body.destination).toUpperCase();
  if (body.depTime !== undefined) {
    patch.depTime = str(body.depTime);
    patch.daypart = str(body.daypart) || daypartOf(str(body.depTime));
  }
  if (body.arrTime !== undefined) patch.arrTime = str(body.arrTime);
  if (body.daypart !== undefined) patch.daypart = str(body.daypart);
  if (body.days !== undefined) patch.days = str(body.days, "Daily");
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (Object.keys(patch).length === 0) return badRequest("Nothing to update");

  const [row] = await db
    .update(flights)
    .set(patch)
    .where(eq(flights.id, flightId))
    .returning();
  if (!row) return badRequest("Flight not found");
  return json(row);
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!(await verifyAdmin(request))) {
    return unauthorized("Admin password required to delete flight");
  }

  const { id } = await ctx.params;
  const flightId = Number(id);
  if (!Number.isFinite(flightId)) return badRequest("Invalid id");
  await db.delete(flights).where(eq(flights.id, flightId));
  return json({ ok: true });
}
