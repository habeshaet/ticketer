import { sql } from "drizzle-orm";
import { db } from "./index";
import { flights, people, reasons, settings } from "./schema";
import {
  SEED_FLIGHTS,
  SEED_PEOPLE,
  SEED_REASONS,
  SEED_SETTINGS,
} from "./seedData";

async function tableCount(table: typeof people | typeof flights) {
  const rows = await db.select({ value: sql<number>`count(*)::int` }).from(table);
  return rows[0]?.value ?? 0;
}

export async function runSeed(options: { force?: boolean } = {}) {
  const force = options.force === true;

  await db.insert(settings).values(SEED_SETTINGS).onConflictDoNothing();
  await db.insert(reasons).values(SEED_REASONS).onConflictDoNothing();

  const flightCount = await tableCount(flights);
  if (force || flightCount === 0) {
    if (force) await db.delete(flights);
    await db.insert(flights).values(SEED_FLIGHTS);
  }

  const peopleCount = await tableCount(people);
  if (force || peopleCount === 0) {
    if (force) await db.delete(people);
    await db.insert(people).values(SEED_PEOPLE);
  }

  return {
    flights: await tableCount(flights),
    people: await tableCount(people),
  };
}
