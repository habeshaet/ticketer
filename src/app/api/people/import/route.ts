import { sql } from "drizzle-orm";
import { db } from "@/db";
import { people } from "@/db/schema";
import { classifyId, normalizeId } from "@/lib/classify";
import { badRequest, json, str } from "@/lib/server";

export const dynamic = "force-dynamic";

type ParsedRow = {
  staffNo: string;
  fullName: string;
  idNo: string;
  kind: string;
  ruleNote: string;
};

const HEADER_WORDS = ["id", "name", "staff", "full name", "no", "employee", "trainee"];
const HEADER_TOKENS = [
  "id", "id no", "id number", "idno", "name", "full name", "fullname",
  "staff", "staff no", "staff number", "staffno", "type", "kind",
  "category", "no", "s/n", "sn", "remark", "employee/trainee",
];

/** True for a spreadsheet header row such as `ID,NAME,TYPE`. */
function looksLikeHeader(line: string, cells: string[]): boolean {
  if (/\d{4,}/.test(line)) return false;
  const lowered = cells.map((c) => c.trim().toLowerCase()).filter(Boolean);
  if (lowered.length === 0) return false;
  if (lowered.some((cell) => HEADER_TOKENS.includes(cell))) return true;
  return lowered.every((cell) => HEADER_WORDS.some((word) => cell.includes(word)));
}

function splitLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  if (line.includes(",")) return line.split(",").map((c) => c.trim());
  if (line.includes(";")) return line.split(";").map((c) => c.trim());
  // "36154 GETNET GEZAHEGN ENGIDA" -> ["36154", "GETNET GEZAHEGN ENGIDA"]
  const match = line.match(/^\s*([0-9][0-9\-\s]{2,})\s+(.+)$/);
  if (match) return [match[1].replace(/[\s-]/g, ""), match[2].trim()];
  // "GETNET GEZAHEGN ENGIDA 36154"
  const tail = line.match(/^(.+?)\s+([0-9]{4,9})\s*$/);
  if (tail) return [tail[2], tail[1].trim()];
  return [line.trim()];
}

/** Works out which cell is the ID, which is the name, which is a passport. */
export function parseRow(cells: string[], fallbackKind: string): ParsedRow | null {
  let staffNo = "";
  let fullName = "";
  let idNo = "";
  let explicitKind = "";

  cells.forEach((cell) => {
    const value = (cell ?? "").trim();
    if (!value) return;
    const lower = value.toLowerCase();
    if (lower === "trainee" || lower === "trn" || lower === "student") {
      explicitKind = "trainee";
      return;
    }
    if (lower === "employee" || lower === "emp" || lower === "staff") {
      explicitKind = "employee";
      return;
    }
    const digits = normalizeId(value);
    const isNumeric = digits.length > 0 && digits.length === value.replace(/[\s-]/g, "").length;
    if (isNumeric) {
      if (!staffNo && digits.length >= 4 && digits.length <= 6) {
        staffNo = digits;
        return;
      }
      if (!idNo && digits.length >= 7) {
        idNo = digits;
        return;
      }
      if (!staffNo) {
        staffNo = digits;
        return;
      }
      return;
    }
    if (/[a-z]/i.test(value) && value.length > fullName.length) {
      fullName = value;
    }
  });

  if (!fullName) return null;
  const verdict = classifyId(staffNo);
  return {
    staffNo,
    fullName: fullName.toUpperCase().replace(/\s+/g, " "),
    idNo,
    kind: explicitKind || (staffNo ? verdict.kind : fallbackKind),
    ruleNote: verdict.reason,
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  const text = str(body.text);
  if (!text) return badRequest("Paste at least one row");
  const fallbackKind =
    str(body.kind, "employee") === "trainee" ? "trainee" : "employee";
  const defaultChargeCode = str(body.chargeCode);
  const replaceAll = body.replaceAll === true;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return badRequest("Paste at least one row");

  const parsed: ParsedRow[] = [];
  const skipped: string[] = [];

  lines.forEach((line, index) => {
    const cells = splitLine(line);
    if (index === 0 && looksLikeHeader(line, cells)) return;
    const row = parseRow(cells, fallbackKind);
    if (row) parsed.push(row);
    else skipped.push(line);
  });

  if (parsed.length === 0)
    return badRequest(
      "No valid rows found. Each line should contain the ID number and the name, e.g. 36154 GETNET GEZAHEGN ENGIDA",
    );

  if (replaceAll) await db.delete(people);

  // Upsert on the ID number so re-pasting the sheet never duplicates anyone.
  const existing = await db.select({ staffNo: people.staffNo, id: people.id }).from(people);
  const byStaffNo = new Map(existing.filter((r) => r.staffNo).map((r) => [r.staffNo, r.id]));

  let inserted = 0;
  let updated = 0;
  for (const row of parsed) {
    const current = row.staffNo ? byStaffNo.get(row.staffNo) : undefined;
    if (current) {
      await db
        .update(people)
        .set({
          fullName: row.fullName,
          kind: row.kind,
          idNo: row.idNo || sql`${people.idNo}`,
          active: true,
        })
        .where(sql`${people.id} = ${current}`);
      updated += 1;
    } else {
      await db.insert(people).values({
        kind: row.kind,
        staffNo: row.staffNo,
        fullName: row.fullName,
        idNo: row.idNo,
        chargeCode: defaultChargeCode,
        station: "",
        note: "",
        active: true,
      });
      inserted += 1;
    }
  }

  return json(
    {
      inserted,
      updated,
      skipped,
      trainees: parsed.filter((r) => r.kind === "trainee").length,
      employees: parsed.filter((r) => r.kind === "employee").length,
    },
    201,
  );
}
