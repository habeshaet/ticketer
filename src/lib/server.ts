import { eq, sql } from "drizzle-orm";
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

export function unauthorized(message = "Admin password required") {
  return Response.json({ error: message }, { status: 401 });
}

let columnsChecked = false;
export async function ensureDatabaseColumns() {
  if (columnsChecked) return;
  try {
    await db.execute(
      sql`alter table people add column if not exists batch text not null default ''`,
    );
    await db.execute(
      sql`alter table settings add column if not exists admin_password text not null default 'admin123'`,
    );
    columnsChecked = true;
  } catch {
    // ignore if table doesn't exist yet (e.g. before initial setup)
  }
}

/** Always returns the single settings row, creating it on first use. */
export async function getSettingsRow(): Promise<Settings> {
  await ensureDatabaseColumns();
  const rows = await db.select().from(settings).where(eq(settings.id, 1));
  if (rows.length > 0) return rows[0] as Settings;
  await db.insert(settings).values(SEED_SETTINGS).onConflictDoNothing();
  const created = await db.select().from(settings).where(eq(settings.id, 1));
  return (created[0] ?? SEED_SETTINGS) as Settings;
}

export async function getAdminPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const s = await getSettingsRow();
    return s.adminPassword || "admin123";
  } catch {
    return "admin123";
  }
}

export async function verifyAdmin(request: Request): Promise<boolean> {
  const expected = await getAdminPassword();
  const header = request.headers.get("x-admin-password") || "";
  return Boolean(header && header === expected);
}

export function str(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

export function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
}
