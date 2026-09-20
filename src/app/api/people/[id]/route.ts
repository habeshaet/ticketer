import { eq } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";
import { classifyId, normalizeId } from "@/lib/classify";
import { badRequest, json, str } from "@/lib/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const personId = Number(id);
  if (!Number.isFinite(personId)) return badRequest("Invalid id");
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");

  const patch: Record<string, unknown> = {};
  if (body.kind !== undefined)
    patch.kind = str(body.kind) === "trainee" ? "trainee" : "employee";
  if (body.staffNo !== undefined) {
    const staffNo = normalizeId(str(body.staffNo));
    patch.staffNo = staffNo;
    if (body.kind === undefined && staffNo) patch.kind = classifyId(staffNo).kind;
  }
  if (body.fullName !== undefined)
    patch.fullName = str(body.fullName).toUpperCase();
  if (body.idNo !== undefined) patch.idNo = str(body.idNo);
  if (body.chargeCode !== undefined) patch.chargeCode = str(body.chargeCode);
  if (body.station !== undefined) patch.station = str(body.station).toUpperCase();
  if (body.phone !== undefined) patch.phone = str(body.phone);
  if (body.note !== undefined) patch.note = str(body.note);
  if (body.active !== undefined) patch.active = Boolean(body.active);

  if (Object.keys(patch).length === 0) return badRequest("Nothing to update");

  const [row] = await db
    .update(people)
    .set(patch)
    .where(eq(people.id, personId))
    .returning();
  if (!row) return badRequest("Person not found");
  return json(row);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const personId = Number(id);
  if (!Number.isFinite(personId)) return badRequest("Invalid id");
  await db.delete(people).where(eq(people.id, personId));
  return json({ ok: true });
}
