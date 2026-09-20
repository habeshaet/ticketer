import type { PassengerLine } from "./types";

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-09-18" -> "Sep 18,2026" (exact house style, no space after the comma). */
export function formatTicketDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((part) => Number(part));
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d},${y}`;
}

export function todayISO(): string {
  const now = new Date();
  const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const base = new Date(`${iso}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/** "tomorrow Sep 18,2026" / "today Sep 17,2026" / "Sep 22,2026" */
export function datePhrase(iso: string, today = todayISO()): string {
  const pretty = formatTicketDate(iso);
  if (!iso) return pretty;
  const diff = Math.round(
    (new Date(`${iso}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime()) /
      86400000,
  );
  if (diff === 0) return `today ${pretty}`;
  if (diff === 1) return `tomorrow ${pretty}`;
  if (diff === 2) return `${pretty}`;
  return pretty;
}

export const DEFAULT_NEW_TICKET_TEMPLATE = `Dear Team
Greetings!

Please process ticket and charge cc {CHARGE_CODE}

{PASSENGERS}

Sector - {SECTOR_SPACED}
Departure Date - {DATE}
{FLIGHTS_LINE}

{PURPOSE}

{SIGNOFF}`;

export const DEFAULT_REBOOK_TEMPLATE = `Dear Team
Greetings

Kindly rebook the below listed tickets for {DATE_PHRASE}{FLIGHTS_PHRASE}.
( {SECTOR})

{TICKETS}

{SIGNOFF}`;

export const DEFAULT_NEW_TICKET_SUBJECT =
  "Ticket Request | {REASON} | {SECTOR} | {DATE}";
export const DEFAULT_REBOOK_SUBJECT = "Rebooking Request | {SECTOR} | {DATE}";


export const DEFAULT_DORM_TEMPLATE = `Dear Mr. Addis,
Greetings,
This is to kindly request dormitory arrangement planning for the upcoming student arrivals scheduled throughout next week starting from tomorrow. The request is being made in advance to facilitate proper accommodation coordination and avoid any last-minute inconveniences.
The students are listed below.
           Name
{TRAINEES}

Reason: {DORM_REASON}
Your support and coordination in arranging the dormitory accommodations accordingly are highly appreciated.
{SIGNOFF}`;

export const DEFAULT_DORM_REASON =
  "Completion of training at their respective stage's";
export const DEFAULT_DORM_SUBJECT =
  "Dormitory Request | {COUNT} trainee(s) | {DATE}";

/** Routes that connect through a hub, e.g. AWA-ADD-DIR. */
export function multiCityRoutes(
  flights: { origin: string; destination: string }[],
): string[] {
  const sectors = new Set<string>();
  flights.forEach((f) => {
    const a = (f.origin ?? "").trim().toUpperCase();
    const b = (f.destination ?? "").trim().toUpperCase();
    if (a && b && a !== b) sectors.add(`${a}>${b}`);
  });
  const routes = new Set<string>();
  sectors.forEach((first) => {
    const [fa, fb] = first.split(">");
    sectors.forEach((second) => {
      const [sa, sb] = second.split(">");
      if (fb === sa && fa !== sb) routes.add(`${fa}-${fb}-${sb}`);
    });
  });
  return Array.from(routes).sort();
}

export function routeLegs(route: string): string[] {
  const stops = String(route ?? "").toUpperCase().split("-").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) out.push(`${stops[i]}-${stops[i + 1]}`);
  return out;
}

/** "Addis A <addis@et.com>" -> "addis@et.com" */
export function bareAddress(entry: string): string {
  const match = String(entry ?? "").match(/<([^>]+)>/);
  const value = match ? match[1] : String(entry ?? "");
  return value.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}

export function splitAddresses(text: string): string[] {
  return String(text ?? "")
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Remove your own address(es) from a To/Cc line. */
export function stripSelf(text: string, mine: string): string {
  const own = new Set(splitAddresses(mine).map(bareAddress).filter(Boolean));
  if (own.size === 0) return String(text ?? "");
  return splitAddresses(text)
    .filter((entry) => !own.has(bareAddress(entry)))
    .join("; ");
}

/** The numbered student list for a dormitory request. */
export function traineeBlock(people: PassengerLine[]): string {
  return people
    .map((person, index) => {
      const name = String(person.fullName ?? "").toUpperCase().trim();
      const id = String(person.staffNo ?? "").trim();
      const entry = `${index + 1}.  ${name}`;
      return id ? entry.padEnd(46) + id : entry;
    })
    .join("\n");
}

export type EmailKind = "new_ticket" | "rebooking" | "dormitory";
export type Leg = { sector: string; flights: string[] };

export type BuildInput = {
  kind: EmailKind;
  legs?: Leg[];
  dormReason?: string;
  reasonLabel?: string;
  purposeLine?: string;
  origin: string;
  destination: string;
  departureDate: string;
  daypart?: string;
  flightNos: string[];
  ticketNumbers: string[];
  passengers: PassengerLine[];
  chargeCode?: string;
  signOff?: string;
  signature?: string;
  remarks?: string;
  today?: string;
  templates?: {
    newTicket?: string;
    rebook?: string;
    newTicketSubject?: string;
    rebookSubject?: string;
    dorm?: string;
    dormSubject?: string;
  };
};

function passengerBlock(passengers: PassengerLine[]): string {
  return passengers
    .map((p, index) => {
      const bits = [
        `${index + 1}.`,
        p.staffNo?.trim(),
        p.fullName?.trim().toUpperCase(),
        p.idNo?.trim(),
        p.ticketNo?.trim(),
      ].filter((bit) => bit && bit.length > 0);
      return bits.join(" ");
    })
    .join("\n");
}

function ticketBlock(
  ticketNumbers: string[],
  passengers: PassengerLine[],
): string {
  const named = new Map<string, string>();
  passengers.forEach((p) => {
    if (p.ticketNo) named.set(p.ticketNo.trim(), p.fullName.toUpperCase());
  });
  return ticketNumbers
    .map((ticket) => {
      const name = named.get(ticket.trim());
      return name ? `* ${ticket}   ${name}` : `* ${ticket}`;
    })
    .join("\n\n");
}

function tidy(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildEmail(input: BuildInput): { subject: string; body: string } {
  const legs = (input.legs ?? []).filter((leg) => leg && leg.sector);

  let sector: string;
  let sectorSpaced: string;
  let via = "";
  let flightsJoined: string;
  let flightsPhrase: string;
  let flightsLine: string;

  if (legs.length > 0) {
    // multi-city: AWA-ADD-DIR
    const stops: string[] = [];
    legs.forEach((leg) => {
      const [first, second] = String(leg.sector).toUpperCase().split("-");
      if (stops.length === 0 && first) stops.push(first);
      if (second) stops.push(second);
    });
    via = stops.slice(1, -1).join(" / ");
    sector = stops.join("-");
    sectorSpaced = stops.join(" - ");

    const pieces: string[] = [];
    const labelled: string[] = [];
    legs.forEach((leg) => {
      const picked = (leg.flights ?? []).filter(Boolean);
      if (picked.length === 0) return;
      const joined = picked.join(" OR ");
      pieces.push(joined);
      labelled.push(`${String(leg.sector).toUpperCase()}: ${joined}`);
    });
    flightsJoined = pieces.join(" / ");
    flightsPhrase = flightsJoined ? ` on ${flightsJoined}` : "";
    flightsLine = labelled.length ? `Preferred Flight - ${labelled.join(" / ")}` : "";
  } else {
    sector =
      input.origin && input.destination
        ? `${input.origin}-${input.destination}`
        : input.origin || input.destination || "";
    sectorSpaced =
      input.origin && input.destination
        ? `${input.origin} - ${input.destination}`
        : sector;
    const flights = input.flightNos.filter(Boolean);
    flightsJoined = flights.join(" OR ");
    flightsPhrase = flightsJoined ? ` on ${flightsJoined}` : "";
    const daypartLabel = input.daypart ? ` (${input.daypart} flight)` : "";
    flightsLine = flightsJoined
      ? `Preferred Flight - ${flightsJoined}${daypartLabel}`
      : "";
  }
  const prettyDate = formatTicketDate(input.departureDate);
  const signature = [input.signOff, input.signature]
    .filter((v) => v && v.trim().length > 0)
    .join("\n");

  const names = input.passengers
    .map((p) => p.fullName.toUpperCase())
    .join(", ");
  const count = String(
    input.kind === "rebooking"
      ? input.ticketNumbers.length || input.passengers.length
      : input.passengers.length,
  );

  const purpose = (input.purposeLine ?? "")
    .replace(/\{NAMES\}/g, names)
    .replace(/\{COUNT\}/g, count)
    .replace(/\{SECTOR\}/g, sector)
    .replace(/\{DATE\}/g, prettyDate);

  const values: Record<string, string> = {
    CHARGE_CODE: input.chargeCode ?? "",
    PASSENGERS: passengerBlock(input.passengers),
    TICKETS: ticketBlock(input.ticketNumbers, input.passengers),
    SECTOR: sector,
    SECTOR_SPACED: sectorSpaced,
    ORIGIN: input.origin,
    DESTINATION: input.destination,
    DATE: prettyDate,
    DATE_PHRASE: datePhrase(input.departureDate, input.today),
    FLIGHTS: flightsJoined,
    FLIGHTS_PHRASE: flightsPhrase,
    FLIGHTS_LINE: flightsLine,
    DAYPART: legs.length > 0 ? "" : input.daypart ?? "",
    VIA: via,
    TRAINEES: traineeBlock(input.passengers),
    DORM_REASON: input.dormReason ?? "",
    REASON: input.reasonLabel ?? "",
    PURPOSE: purpose,
    NAMES: names,
    COUNT: count,
    REMARKS: input.remarks ?? "",
    SIGNOFF: signature,
  };

  const fill = (template: string) =>
    template.replace(/\{([A-Z_]+)\}/g, (match, key: string) =>
      key in values ? values[key] : match,
    );

  const bodyTemplate =
    input.kind === "dormitory"
      ? input.templates?.dorm || DEFAULT_DORM_TEMPLATE
      : input.kind === "rebooking"
        ? input.templates?.rebook || DEFAULT_REBOOK_TEMPLATE
        : input.templates?.newTicket || DEFAULT_NEW_TICKET_TEMPLATE;
  const subjectTemplate =
    input.kind === "dormitory"
      ? input.templates?.dormSubject || DEFAULT_DORM_SUBJECT
      : input.kind === "rebooking"
        ? input.templates?.rebookSubject || DEFAULT_REBOOK_SUBJECT
        : input.templates?.newTicketSubject || DEFAULT_NEW_TICKET_SUBJECT;

  let body = tidy(fill(bodyTemplate));
  if (input.remarks && !bodyTemplate.includes("{REMARKS}")) {
    const parts = body.split("\n");
    const signatureIndex = signature ? body.lastIndexOf(signature) : -1;
    if (signatureIndex >= 0) {
      body = `${body.slice(0, signatureIndex).trimEnd()}\n\n${input.remarks.trim()}\n\n${body.slice(signatureIndex)}`;
    } else {
      body = `${parts.join("\n")}\n\n${input.remarks.trim()}`;
    }
  }

  const subject = fill(subjectTemplate).replace(/\s*\|\s*\|\s*/g, " | ").trim();
  return { subject, body: tidy(body) };
}
