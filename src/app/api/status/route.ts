import { sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";
import { json } from "@/lib/server";

export const dynamic = "force-dynamic";

/** Tells the app whether the database is ready, and what to do if it is not. */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return json({
      ready: false,
      step: "env",
      message:
        "DATABASE_URL is not set. In Vercel open Settings → Environment " +
        "Variables, add DATABASE_URL with your Neon connection string, tick " +
        "Production, Preview and Development, then Redeploy.",
    });
  }
  try {
    const result = await db.execute(
      sql`select to_regclass('public.settings') is not null as has_tables`,
    );
    const rows = (result as unknown as { rows?: { has_tables?: boolean }[] }).rows;
    if (!rows?.[0]?.has_tables) {
      return json({
        ready: false,
        step: "setup",
        message:
          "Connected to the database, but the tables have not been created " +
          "yet. Press the button below to run the one-time setup.",
      });
    }
    return json({ ready: true, step: "ready", message: "Everything is ready." });
  } catch (error) {
    return json({
      ready: false,
      step: "connect",
      message:
        "DATABASE_URL is set, but the database could not be reached. " +
        "Check the connection string was copied in full and ends with " +
        "?sslmode=require. Details: " +
        (error instanceof Error ? error.message : String(error)),
    });
  }
}
