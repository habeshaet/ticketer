import { asc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";
import { classifyId, normalizeId } from "@/lib/classify";
import { badRequest, json, str } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const kind = (searchParams.get("kind") ?? "").trim();

  const filters = [];
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(
        ilike(people.fullName, like),
        ilike(people.staffNo, like),
        ilike(people.idNo, like),
        ilike(people.station, like),
        ilike(people.note, like),
      ),
    );
  }
  if (kind === "employee" || kind === "trainee") {
    filters.push(sql`${people.kind} = ${kind}`);
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
      chargeCode: str(body.chargeCode),
      station: str(body.station).toUpperCase(),
      phone: str(body.phone),
      note: str(body.note),
      active: body.active === false ? false : true,
    })
    .returning();

  return json(row, 201);
}
