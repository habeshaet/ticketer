import { sql } from "drizzle-orm";
import { db } from "@/db";
import { runSeed } from "@/db/seed";
import { json } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * One-time setup for a fresh deployment: creates the tables if they are
 * missing and loads the starting lists. Safe to run twice — it never
 * overwrites data that is already there.
 */
export async function POST() {
  try {
    await db.execute(sql`
      create table if not exists people (
        id serial primary key,
        kind text not null default 'employee',
        staff_no text not null default '',
        full_name text not null,
        id_no text not null default '',
        batch text not null default '',
        charge_code text not null default '',
        station text not null default '',
        phone text not null default '',
        note text not null default '',
        active boolean not null default true,
        created_at timestamptz not null default now()
      )`);
    await db.execute(sql`
      create table if not exists flights (
        id serial primary key,
        flight_no text not null,
        origin text not null,
        destination text not null,
        dep_time text not null default '',
        arr_time text not null default '',
        daypart text not null default 'morning',
        days text not null default 'Daily',
        active boolean not null default true
      )`);
    await db.execute(sql`
      create table if not exists reasons (
        id serial primary key,
        key text not null unique,
        label text not null,
        purpose_line text not null default '',
        sort_order integer not null default 0,
        active boolean not null default true
      )`);
    await db.execute(sql`
      create table if not exists settings (
        id integer primary key default 1,
        default_charge_code text not null default 'EAAMG969',
        to_emails text not null default '',
        cc_emails text not null default '',
        sign_off text not null default 'Best regards,',
        signature text not null default '',
        new_ticket_template text not null default '',
        rebook_template text not null default '',
        new_ticket_subject text not null default '',
        rebook_subject text not null default ''
      )`);
    await db.execute(sql`
      create table if not exists requests (
        id serial primary key,
        kind text not null,
        reason_key text not null default '',
        reason_label text not null default '',
        origin text not null default '',
        destination text not null default '',
        departure_date date,
        daypart text not null default '',
        charge_code text not null default '',
        flight_nos jsonb not null,
        ticket_numbers jsonb not null,
        passengers jsonb not null,
        subject text not null default '',
        body text not null default '',
        created_at timestamptz not null default now()
      )`);

    // Columns added after the first release. Running this on an older
    // database upgrades it in place without losing anything.
    const laterColumns = [
      "rebook_to_emails text not null default ''",
      "rebook_cc_emails text not null default ''",
      "dorm_to_emails text not null default ''",
      "dorm_cc_emails text not null default ''",
      "my_email text not null default ''",
      "admin_password text not null default 'admin123'",
      "dorm_template text not null default ''",
      "dorm_reason text not null default ''",
      "dorm_subject text not null default ''",
      "theme text not null default 'ethiopian'",
    ];
    for (const column of laterColumns) {
      await db.execute(
        sql.raw(`alter table settings add column if not exists ${column}`),
      );
    }

    await db.execute(
      sql`alter table people add column if not exists batch text not null default ''`,
    );

    const result = await runSeed({ force: false });
    return json({ ok: true, ...result });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}
