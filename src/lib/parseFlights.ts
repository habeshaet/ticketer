import { daypartOf } from "./types";

export type ParsedFlight = {
  flightNo: string;
  origin: string;
  destination: string;
  depTime: string;
  arrTime: string;
  daypart: string;
};

const DAYPARTS = ["morning", "afternoon", "evening"];
const HEADER_TOKENS = [
  "flight", "flight no", "flightno", "flight number", "from", "to",
  "origin", "destination", "sector", "dep", "departure", "dep time",
  "arr", "arrival", "arr time", "time", "daypart", "time of day", "days",
];

/** 08:15 / 8:15 / 0815 / 08.15 -> "08:15"; anything else -> "". */
export function normaliseTime(token: string): string {
  const value = (token ?? "").trim();
  if (!value) return "";
  let match = value.match(/^([0-2]?\d)[:.h]([0-5]\d)$/i);
  if (!match && /^\d{4}$/.test(value)) {
    match = value.match(/^([0-2]\d)([0-5]\d)$/);
  }
  if (!match) return "";
  const hour = Number(match[1]);
  if (hour > 23) return "";
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function looksLikeFlightNo(token: string): boolean {
  const value = (token ?? "").trim();
  if (!/\d/.test(value)) return false;
  if (!/[A-Za-z]/.test(value) && !value.includes("-")) return false;
  return /^[A-Za-z]{1,3}[\s-]?\d{1,4}[A-Za-z]?$/.test(value);
}

function splitCells(line: string): string[] {
  for (const separator of ["\t", ",", ";", "|"]) {
    if (line.includes(separator)) {
      return line.split(separator).map((c) => c.trim());
    }
  }
  return line.trim().split(/\s+/).filter(Boolean);
}

export function parseFlightsText(text: string): {
  flights: ParsedFlight[];
  skipped: string[];
} {
  const flights: ParsedFlight[] = [];
  const skipped: string[] = [];
  const lines = (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const cells = splitCells(line);
    const lowered = cells.map((c) => c.trim().toLowerCase()).filter(Boolean);
    if (index === 0 && !/\d/.test(line) && lowered.some((c) => HEADER_TOKENS.includes(c))) {
      return;
    }

    let flightNo = "";
    const airports: string[] = [];
    const times: string[] = [];
    let daypart = "";

    for (const raw of cells) {
      const token = (raw ?? "").trim();
      if (!token) continue;
      const low = token.toLowerCase();
      if (DAYPARTS.includes(low)) {
        daypart = low;
        continue;
      }
      const sector = token.match(/^([A-Za-z]{3})\s*[-/>]\s*([A-Za-z]{3})$/);
      if (sector) {
        airports.push(sector[1].toUpperCase(), sector[2].toUpperCase());
        continue;
      }
      const clock = normaliseTime(token);
      if (clock && !looksLikeFlightNo(token)) {
        times.push(clock);
        continue;
      }
      if (/^[A-Za-z]{3}$/.test(token) && airports.length < 2) {
        airports.push(token.toUpperCase());
        continue;
      }
      if (!flightNo && looksLikeFlightNo(token)) {
        flightNo = token.toUpperCase().replace(/\s/g, "");
      }
    }

    if (!flightNo || airports.length < 2) {
      skipped.push(line);
      return;
    }
    const depTime = times[0] ?? "";
    flights.push({
      flightNo,
      origin: airports[0],
      destination: airports[1],
      depTime,
      arrTime: times[1] ?? "",
      daypart: daypart || daypartOf(depTime),
    });
  });

  return { flights, skipped };
}
