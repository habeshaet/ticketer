import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { SEED_SETTINGS } from "@/db/seedData";
import type { Settings } from "./types";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

/** Always returns the single settings row, creating it on first use. */
export async function getSettingsRow(): Promise<Settings> {
  const rows = await db.select().from(settings).where(eq(settings.id, 1));
  if (rows.length > 0) return rows[0] as Settings;
  await db.insert(settings).values(SEED_SETTINGS).onConflictDoNothing();
  const created = await db.select().from(settings).where(eq(settings.id, 1));
  return (created[0] ?? SEED_SETTINGS) as Settings;
}

export function str(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

export function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
}
