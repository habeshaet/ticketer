import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { flights, people, reasons } from "@/db/schema";
import { getSettingsRow, json } from "@/lib/server";
import { multiCityRoutes } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  await getSettingsRow();
  const [settingsRow, reasonRows, flightRows, peopleRows] = await Promise.all([
    getSettingsRow(),
    db.select().from(reasons).orderBy(asc(reasons.sortOrder), asc(reasons.id)),
    db
      .select()
      .from(flights)
      .where(eq(flights.active, true))
      .orderBy(asc(flights.origin), asc(flights.destination), asc(flights.depTime)),
    db
      .select()
      .from(people)
      .where(eq(people.active, true))
      .orderBy(asc(people.fullName)),
  ]);

  return json({
    routes: multiCityRoutes(flightRows),
    settings: settingsRow,
    reasons: reasonRows,
    flights: flightRows,
    people: peopleRows,
  });
}
