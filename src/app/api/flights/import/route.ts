import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { flights } from "@/db/schema";
import { parseFlightsText } from "@/lib/parseFlights";
import { badRequest, json, str, unauthorized, verifyAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await verifyAdmin(request))) {
    return unauthorized("Admin password required to import flights");
  }

  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  const text = str(body.text);
  if (!text) return badRequest("Paste at least one flight");

  const { flights: parsed, skipped } = parseFlightsText(text);
  if (parsed.length === 0) {
    return badRequest(
      "No flight could be read. Each line needs a flight number and two airports, e.g. ET-154 AWA ADD 08:15 09:10",
    );
  }

  if (body.replaceAll === true) await db.delete(flights);

  let inserted = 0;
  let updated = 0;
  for (const flight of parsed) {
    const existing = await db
      .select({ id: flights.id })
      .from(flights)
      .where(
        and(
          eq(flights.flightNo, flight.flightNo),
          eq(flights.origin, flight.origin),
          eq(flights.destination, flight.destination),
        ),
      );
    if (existing.length > 0) {
      await db
        .update(flights)
        .set({
          depTime: flight.depTime,
          arrTime: flight.arrTime,
          daypart: flight.daypart,
          active: true,
        })
        .where(eq(flights.id, existing[0].id));
      updated += 1;
    } else {
      await db.insert(flights).values({ ...flight, days: "Daily", active: true });
      inserted += 1;
    }
  }

  const sectors = Array.from(
    new Set(parsed.map((f) => `${f.origin}-${f.destination}`)),
  ).sort();

  return json({ inserted, updated, skipped, sectors }, 201);
}
