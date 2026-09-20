import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const MISSING_URL_MESSAGE =
  "DATABASE_URL is not set. On Vercel: Project > Settings > " +
  "Environment Variables > add DATABASE_URL (your Neon connection string), " +
  "tick all three environments, then Redeploy.";

const globalForDb = globalThis as typeof globalThis & {
  __ticketMailerPool?: Pool;
  __ticketMailerDb?: NodePgDatabase;
};

function makePool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error(MISSING_URL_MESSAGE);

  // Hosted Postgres (Neon, Supabase, Vercel Postgres) needs TLS. Their
  // certificates are signed by a CA Node does not ship, so verification is
  // relaxed - the connection is still encrypted.
  const needsSsl =
    /sslmode=require|\.neon\.tech|\.supabase\.|\.vercel-storage\.com|amazonaws\.com/i.test(
      databaseUrl,
    );

  return new Pool({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    // serverless: keep the pool small and let idle sockets go
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  if (!globalForDb.__ticketMailerPool) {
    globalForDb.__ticketMailerPool = makePool();
  }
  return globalForDb.__ticketMailerPool;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * The database client.
 *
 * Built lazily: nothing connects, and nothing throws, until a query actually
 * runs. That matters because `next build` imports every route to work out
 * what it can pre-render - if this threw on import, the whole build would
 * fail on a fresh deployment that has no DATABASE_URL yet.
 */
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, property, receiver) {
    if (!globalForDb.__ticketMailerDb) {
      globalForDb.__ticketMailerDb = drizzle(getPool());
    }
    return Reflect.get(globalForDb.__ticketMailerDb, property, receiver);
  },
});

/** Kept for the seed script, which closes the pool when it finishes. */
export const pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    return Reflect.get(getPool(), property, receiver);
  },
});
