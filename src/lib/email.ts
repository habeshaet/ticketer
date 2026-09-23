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

/** "2026-09-18" -> "Sep 18, 2026" (space after the comma). */
export function formatTicketDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map((part) => Number(part));
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
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

Please process {TICKET_TYPE} and charge cc {CHARGE_CODE}

{PASSENGERS}

Sector - {SECTOR_SPACED}
Departure Date - {DATE}
{FLIGHTS_LINE}
{RETURN_DETAILS}

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

/**
 * Build a mailto: link the way mail apps actually expect it (RFC 6068).
 *
 * Never use URLSearchParams for this: it encodes spaces as `+`, which desktop
 * Outlook tolerates but phone mail apps show literally ("Dear+Team").
 * encodeURIComponent writes %20, which every client decodes — the desktop app
 * already does it this way (quote_via=quote).
 */
export function buildMailto(
  to: string,
  opts: { subject?: string; body?: string; cc?: string } = {},
): string {
  // comma-separated, one address after another; @ stays readable like desktop
  const encodeLine = (line: string) =>
    splitAddresses(line)
      .map((entry) => encodeURIComponent(entry).replace(/%40/g, "@"))
      .join(",");
  const parts: string[] = [];
  if (opts.subject) parts.push(`subject=${encodeURIComponent(opts.subject)}`);
  if (opts.body) parts.push(`body=${encodeURIComponent(opts.body)}`);
  const ccJoined = opts.cc ? splitAddresses(opts.cc).join(",") : "";
  if (ccJoined) parts.push(`cc=${encodeURIComponent(ccJoined)}`);
  const query = parts.length > 0 ? `?${parts.join("&")}` : "";
  return `mailto:${encodeLine(to)}${query}`;
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
  reasonKey?: string;
  reasonLabel?: string;
  ticketType?: string;
  returnDate?: string;
  returnFlightNos?: string[];
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

  const isFerry =
    (input.reasonKey ?? "").toLowerCase().includes("ferry") ||
    (input.reasonLabel ?? "").toLowerCase().includes("ferry") ||
    (input.purposeLine ?? "").toLowerCase().includes("ferry");

  const ticketType = input.ticketType
    ? input.ticketType
    : isFerry
    ? "one-way ticket"
    : "round-trip ticket";

  const tripType = isFerry ? "one-way" : "round-trip";

  const prettyReturnDate = input.returnDate ? formatTicketDate(input.returnDate) : "";
  const returnFlights = (input.returnFlightNos ?? []).filter(Boolean);
  const returnFlightsJoined = returnFlights.join(" OR ");
  const returnFlightsLine = returnFlightsJoined
    ? `Preferred Return Flight - ${returnFlightsJoined}`
    : "";

  let returnDetails = "";
  if (prettyReturnDate && returnFlightsLine) {
    returnDetails = `Return Date - ${prettyReturnDate}\n${returnFlightsLine}`;
  } else if (prettyReturnDate) {
    returnDetails = `Return Date - ${prettyReturnDate}`;
  } else if (returnFlightsLine) {
    returnDetails = returnFlightsLine;
  }

  const values: Record<string, string> = {
    CHARGE_CODE: input.chargeCode ?? "",
    TICKET_TYPE: ticketType,
    TRIP_TYPE: tripType,
    RETURN_DATE: prettyReturnDate,
    RETURN_FLIGHTS: returnFlightsJoined,
    RETURN_FLIGHTS_LINE: returnFlightsLine,
    RETURN_DETAILS: returnDetails,
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

  let bodyTemplate =
    input.kind === "dormitory"
      ? input.templates?.dorm || DEFAULT_DORM_TEMPLATE
      : input.kind === "rebooking"
        ? input.templates?.rebook || DEFAULT_REBOOK_TEMPLATE
        : input.templates?.newTicket || DEFAULT_NEW_TICKET_TEMPLATE;

  if (input.kind === "new_ticket") {
    bodyTemplate = bodyTemplate.replace(
      /(?:Please\s+)?process\s+(?:(?:one-way|one way|two-way|two way|2-way|round-trip|round trip|roundtrip)\s+)?ticket/gi,
      (match) => {
        const hasPlease = /^please\s+/i.test(match);
        return hasPlease ? `Please process ${ticketType}` : `process ${ticketType}`;
      },
    );

    if (
      returnDetails &&
      !bodyTemplate.includes("{RETURN_DETAILS}") &&
      !bodyTemplate.includes("{RETURN_DATE}")
    ) {
      if (bodyTemplate.includes("{FLIGHTS_LINE}")) {
        bodyTemplate = bodyTemplate.replace(
          "{FLIGHTS_LINE}",
          `{FLIGHTS_LINE}\n${returnDetails}`,
        );
      } else if (bodyTemplate.includes("{DATE}")) {
        bodyTemplate = bodyTemplate.replace(
          "{DATE}",
          `{DATE}\n${returnDetails}`,
        );
      } else {
        const lines = bodyTemplate.split("\n");
        let idx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (/^(?:Preferred Flight|Departure Date)/i.test(lines[i])) {
            idx = i;
          }
        }
        if (idx >= 0) {
          const usesColon = /:\s*/.test(lines[idx]);
          const adapted = usesColon
            ? returnDetails.replace(/ - /g, ": ")
            : returnDetails;
          lines.splice(idx + 1, 0, adapted);
          bodyTemplate = lines.join("\n");
        }
      }
    }
  }
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
