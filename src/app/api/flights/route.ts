import { asc } from "drizzle-orm";
import { db } from "@/db";
import { flights } from "@/db/schema";
import { badRequest, json, str } from "@/lib/server";
import { daypartOf } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(flights)
    .orderBy(asc(flights.origin), asc(flights.destination), asc(flights.depTime));
  return json(rows);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  const flightNo = str(body.flightNo).toUpperCase();
  const origin = str(body.origin).toUpperCase();
  const destination = str(body.destination).toUpperCase();
  if (!flightNo || !origin || !destination)
    return badRequest("Flight number, origin and destination are required");

  const depTime = str(body.depTime);
  const [row] = await db
    .insert(flights)
    .values({
      flightNo,
      origin,
      destination,
      depTime,
      arrTime: str(body.arrTime),
      daypart: str(body.daypart) || daypartOf(depTime),
      days: str(body.days, "Daily") || "Daily",
      active: body.active === false ? false : true,
    })
    .returning();
  return json(row, 201);
}
