import { asc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";
import { classifyId, normalizeId } from "@/lib/classify";
import {
  badRequest,
  ensureDatabaseColumns,
  json,
  str,
  unauthorized,
  verifyAdmin,
} from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureDatabaseColumns();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const kind = (searchParams.get("kind") ?? "").trim();
  const batch = (searchParams.get("batch") ?? "").trim();

  const filters = [];
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(
        ilike(people.fullName, like),
        ilike(people.staffNo, like),
        ilike(people.idNo, like),
        ilike(people.batch, like),
        ilike(people.station, like),
        ilike(people.note, like),
      ),
    );
  }
  if (kind === "employee" || kind === "trainee") {
    filters.push(sql`${people.kind} = ${kind}`);
  }
  if (batch) {
    filters.push(sql`${people.batch} = ${batch}`);
  }

  const rows = filters.length
    ? await db
        .select()
        .from(people)
        .where(sql.join(filters, sql` and `))
        .orderBy(asc(people.fullName))
    : await db.select().from(people).orderBy(asc(people.fullName));

  return json(rows);
}

export async function POST(request: Request) {
  await ensureDatabaseColumns();
  if (!(await verifyAdmin(request))) {
    return unauthorized("Admin password required to add to directory");
  }

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  const fullName = str(body.fullName).toUpperCase();
  if (!fullName) return badRequest("Full name is required");

  const staffNo = normalizeId(str(body.staffNo));
  const requestedKind = str(body.kind);
  const kind =
    requestedKind === "trainee" || requestedKind === "employee"
      ? requestedKind
      : classifyId(staffNo).kind;

  const [row] = await db
    .insert(people)
    .values({
      kind,
      staffNo,
      fullName,
      idNo: str(body.idNo),
      batch: str(body.batch),
      chargeCode: str(body.chargeCode),
      station: str(body.station).toUpperCase(),
      phone: str(body.phone),
      note: str(body.note),
      active: body.active === false ? false : true,
    })
    .returning();

  return json(row, 201);
}
