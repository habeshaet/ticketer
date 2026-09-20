import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reasons } from "@/db/schema";
import { badRequest, json, str } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(reasons)
    .orderBy(asc(reasons.sortOrder), asc(reasons.id));
  return json(rows);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  const label = str(body.label).toUpperCase();
  if (!label) return badRequest("Label is required");
  const key =
    str(body.key) ||
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const [row] = await db
    .insert(reasons)
    .values({
      key,
      label,
      purposeLine: str(body.purposeLine),
      sortOrder: Number(body.sortOrder ?? 100) || 100,
      active: body.active === false ? false : true,
    })
    .returning();
  return json(row, 201);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  const id = Number(body.id);
  if (!Number.isFinite(id)) return badRequest("Invalid id");

  const patch: Record<string, unknown> = {};
  if (body.label !== undefined) patch.label = str(body.label).toUpperCase();
  if (body.purposeLine !== undefined) patch.purposeLine = str(body.purposeLine);
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder) || 0;
  if (body.active !== undefined) patch.active = Boolean(body.active);
  if (Object.keys(patch).length === 0) return badRequest("Nothing to update");

  const [row] = await db
    .update(reasons)
    .set(patch)
    .where(eq(reasons.id, id))
    .returning();
  if (!row) return badRequest("Reason not found");
  return json(row);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isFinite(id)) return badRequest("Invalid id");
  await db.delete(reasons).where(eq(reasons.id, id));
  return json({ ok: true });
}
