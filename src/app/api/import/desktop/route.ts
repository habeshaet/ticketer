import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { flights, people, reasons, requests, settings } from "@/db/schema";
import { classifyId, normalizeId } from "@/lib/classify";
import { normaliseTime } from "@/lib/parseFlights";
import { badRequest, getSettingsRow, json, str } from "@/lib/server";
import { daypartOf } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Accepts the desktop app's data file — either `data.json` (Share & backup →
 * "Write data.json for the next build", or the copy beside TicketMailer.exe)
 * or a `ticket_mailer_data.json` backup — and loads its settings, reasons,
 * flights, people and history into this site.
 *
 * Body: { data: <parsed JSON file>, replaceAll?: boolean }
 *   - merge (default): everything is upserted, nothing is deleted; settings
 *     only take over where the file has a non-empty value.
 *   - replace: lists are cleared first and settings mirror the file exactly.
 *     Sent history is never deleted — missing entries are appended.
 */

const SETTINGS_FIELDS = [
  "defaultChargeCode",
  "toEmails",
  "ccEmails",
  "dormToEmails",
  "dormCcEmails",
  "myEmail",
  "signOff",
  "signature",
  "newTicketTemplate",
  "rebookTemplate",
  "newTicketSubject",
  "rebookSubject",
  "dormTemplate",
  "dormReason",
  "dormSubject",
  "theme",
] as const;

const DAYPARTS = ["morning", "afternoon", "evening"];

function slugKey(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "reason";
}

function uniqueKey(wanted: string, taken: Set<string>): string {
  let key = wanted || "reason";
  let suffix = 2;
  while (taken.has(key)) {
    key = `${wanted}_${suffix}`;
    suffix += 1;
  }
  taken.add(key);
  return key;
}

function cleanName(value: unknown): string {
  return str(value).toUpperCase().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Invalid JSON body");
  // forgiving: accept { data } or the file contents posted directly
  const raw = (
    body.data && typeof body.data === "object" ? body.data : body
  ) as Record<string, unknown>;
  const replaceAll = body.replaceAll === true || raw.replaceAll === true;

  const rawSettings =
    raw.settings && typeof raw.settings === "object"
      ? (raw.settings as Record<string, unknown>)
      : null;
  const rawReasons = Array.isArray(raw.reasons) ? raw.reasons : [];
  const rawFlights = Array.isArray(raw.flights) ? raw.flights : [];
  const rawPeople = Array.isArray(raw.people) ? raw.people : [];
  const rawHistory = Array.isArray(raw.history) ? raw.history : [];

  if (!rawSettings && rawReasons.length === 0 && rawFlights.length === 0 && rawPeople.length === 0) {
    return badRequest(
      "That file does not look like Ticket Mailer data — expected settings, reasons, flights or people.",
    );
  }

  await getSettingsRow();

  // ---------------- settings ----------------
  let settingsUpdated = 0;
  if (rawSettings) {
    const patch: Record<string, string> = {};
    for (const field of SETTINGS_FIELDS) {
      if (!(field in rawSettings)) continue;
      let value = str(rawSettings[field]);
      if (field === "defaultChargeCode") value = value.toUpperCase();
      if (field === "theme" && !value) value = "ethiopian";
      // merge must never wipe a value the file simply never had
      if (!replaceAll && !value) continue;
      patch[field] = value;
    }
    if (Object.keys(patch).length > 0) {
      await db.update(settings).set(patch).where(eq(settings.id, 1));
      settingsUpdated = Object.keys(patch).length;
    }
  }

  // ---------------- reasons ----------------
  let reasonsInserted = 0;
  let reasonsUpdated = 0;
  const cleanReasons = rawReasons
    .map((r) => {
      const row = (r ?? {}) as Record<string, unknown>;
      return { label: cleanName(row.label), purposeLine: str(row.purposeLine) };
    })
    .filter((r) => r.label.length > 0);
  if (cleanReasons.length > 0) {
    if (replaceAll) {
      await db.delete(reasons);
      const taken = new Set<string>();
      let order = 10;
      for (const row of cleanReasons) {
        await db.insert(reasons).values({
          key: uniqueKey(slugKey(row.label), taken),
          label: row.label,
          purposeLine: row.purposeLine,
          sortOrder: order,
          active: true,
        });
        order += 10;
        reasonsInserted += 1;
      }
    } else {
      const existing = await db.select().from(reasons);
      const byLabel = new Map(existing.map((r) => [r.label.toUpperCase(), r]));
      const taken = new Set(existing.map((r) => r.key));
      let order = existing.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 10;
      for (const row of cleanReasons) {
        const current = byLabel.get(row.label);
        if (current) {
          await db
            .update(reasons)
            .set({ purposeLine: row.purposeLine, active: true })
            .where(eq(reasons.id, current.id));
          reasonsUpdated += 1;
        } else {
          const inserted = await db
            .insert(reasons)
            .values({
              key: uniqueKey(slugKey(row.label), taken),
              label: row.label,
              purposeLine: row.purposeLine,
              sortOrder: order,
              active: true,
            })
            .returning();
          order += 10;
          reasonsInserted += 1;
          if (inserted[0]) byLabel.set(row.label, inserted[0]);
        }
      }
    }
  }

  // ---------------- flights ----------------
  let flightsInserted = 0;
  let flightsUpdated = 0;
  const cleanFlights = rawFlights
    .map((f) => {
      const row = (f ?? {}) as Record<string, unknown>;
      const flightNo = str(row.flightNo).toUpperCase().replace(/\s/g, "");
      const origin = str(row.origin).toUpperCase();
      const destination = str(row.destination).toUpperCase();
      const depTime = normaliseTime(str(row.depTime)) || str(row.depTime);
      const arrTime = normaliseTime(str(row.arrTime)) || str(row.arrTime);
      const daypartRaw = str(row.daypart).toLowerCase();
      return {
        flightNo,
        origin,
        destination,
        depTime,
        arrTime,
        daypart: DAYPARTS.includes(daypartRaw) ? daypartRaw : daypartOf(depTime),
      };
    })
    .filter((f) => f.flightNo && f.origin && f.destination);
  if (cleanFlights.length > 0) {
    if (replaceAll) {
      await db.delete(flights);
      for (const flight of cleanFlights) {
        await db.insert(flights).values({ ...flight, days: "Daily", active: true });
        flightsInserted += 1;
      }
    } else {
      for (const flight of cleanFlights) {
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
          flightsUpdated += 1;
        } else {
          await db.insert(flights).values({ ...flight, days: "Daily", active: true });
          flightsInserted += 1;
        }
      }
    }
  }

  // ---------------- people ----------------
  let peopleInserted = 0;
  let peopleUpdated = 0;
  const skippedPeople: string[] = [];
  const cleanPeople = [] as { staffNo: string; fullName: string; kind: string }[];
  for (const p of rawPeople) {
    const row = (p ?? {}) as Record<string, unknown>;
    // desktop writes { id, name, kind }; accept the web's names too
    const staffNo = normalizeId(str(row.id ?? row.staffNo));
    const fullName = cleanName(row.name ?? row.fullName);
    if (!fullName) {
      skippedPeople.push(str(row.id ?? row.staffNo) || "(blank row)");
      continue;
    }
    const kindRaw = str(row.kind).toLowerCase();
    cleanPeople.push({
      staffNo,
      fullName,
      kind:
        kindRaw === "employee" || kindRaw === "trainee"
          ? kindRaw
          : classifyId(staffNo).kind,
    });
  }
  if (cleanPeople.length > 0) {
    if (replaceAll) {
      await db.delete(people);
      for (const person of cleanPeople) {
        await db.insert(people).values({
          kind: person.kind,
          staffNo: person.staffNo,
          fullName: person.fullName,
          idNo: "",
          chargeCode: "",
          station: "",
          note: "",
          active: true,
        });
        peopleInserted += 1;
      }
    } else {
      const existing = await db.select().from(people);
      const byStaffNo = new Map(
        existing.filter((r) => r.staffNo).map((r) => [r.staffNo, r]),
      );
      const byName = new Map(existing.map((r) => [r.fullName.toUpperCase(), r]));
      for (const person of cleanPeople) {
        const current = person.staffNo
          ? byStaffNo.get(person.staffNo)
          : byName.get(person.fullName);
        if (current) {
          await db
            .update(people)
            .set({ fullName: person.fullName, kind: person.kind, active: true })
            .where(eq(people.id, current.id));
          peopleUpdated += 1;
        } else {
          const [inserted] = await db
            .insert(people)
            .values({
              kind: person.kind,
              staffNo: person.staffNo,
              fullName: person.fullName,
              idNo: "",
              chargeCode: "",
              station: "",
              note: "",
              active: true,
            })
            .returning();
          peopleInserted += 1;
          if (inserted) {
            if (inserted.staffNo) byStaffNo.set(inserted.staffNo, inserted);
            byName.set(inserted.fullName.toUpperCase(), inserted);
          }
        }
      }
    }
  }

  // ---------------- history (append only, never deleted) ----------------
  let historyImported = 0;
  const cleanHistory = rawHistory
    .map((h) => {
      const row = (h ?? {}) as Record<string, unknown>;
      return {
        kind: str(row.kind) || "new_ticket",
        subject: str(row.subject),
        body: str(row.body),
        savedAt: str(row.savedAt),
      };
    })
    .filter((h) => h.body.length > 0)
    .slice(0, 200);
  if (cleanHistory.length > 0) {
    const existing = await db
      .select({ subject: requests.subject, body: requests.body })
      .from(requests);
    const seen = new Set(existing.map((r) => `${r.subject}\n${r.body}`));
    for (const entry of cleanHistory) {
      if (seen.has(`${entry.subject}\n${entry.body}`)) continue;
      const when = entry.savedAt ? new Date(entry.savedAt) : null;
      await db.insert(requests).values({
        kind: entry.kind,
        reasonKey: "",
        reasonLabel: "",
        origin: "",
        destination: "",
        departureDate: null,
        daypart: "",
        chargeCode: "",
        flightNos: [],
        ticketNumbers: [],
        passengers: [],
        subject: entry.subject,
        body: entry.body,
        ...(when && !Number.isNaN(when.getTime()) ? { createdAt: when } : {}),
      });
      seen.add(`${entry.subject}\n${entry.body}`);
      historyImported += 1;
    }
  }

  return json(
    {
      replaceAll,
      settings: { updated: settingsUpdated },
      reasons: { inserted: reasonsInserted, updated: reasonsUpdated },
      flights: { inserted: flightsInserted, updated: flightsUpdated },
      people: {
        inserted: peopleInserted,
        updated: peopleUpdated,
        skipped: skippedPeople,
      },
      history: { imported: historyImported },
    },
    201,
  );
}
