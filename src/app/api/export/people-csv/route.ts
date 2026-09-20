import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";

export const dynamic = "force-dynamic";

/**
 * The CSV the Outlook macro can read at run time
 * (Documents\TicketMailerPeople.csv) so the staff list can be refreshed
 * without re-importing the .bas module.
 */
export async function GET() {
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.active, true))
    .orderBy(asc(people.staffNo));

  const lines = ["ID,NAME"];
  rows.forEach((person) => {
    const name = person.fullName.replace(/[",]/g, " ").trim();
    lines.push(`${person.staffNo},${name}`);
  });

  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="TicketMailerPeople.csv"',
    },
  });
}
