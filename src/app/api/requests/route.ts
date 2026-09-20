import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { requests } from "@/db/schema";
import { badRequest, json, str, strArray } from "@/lib/server";
import type { PassengerLine } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 60) || 60, 200);

  const rows = q
    ? await db
        .select()
        .from(requests)
        .where(
          or(
            ilike(requests.subject, `%${q}%`),
            ilike(requests.body, `%${q}%`),
            ilike(requests.origin, `%${q}%`),
            ilike(requests.destination, `%${q}%`),
          ),
        )
        .orderBy(desc(requests.createdAt))
        .limit(limit)
    : await db
        .select()
        .from(requests)
        .orderBy(desc(requests.createdAt))
        .limit(limit);

  return json(rows);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  const kind = str(body.kind) === "rebooking" ? "rebooking" : "new_ticket";
  const departureDate = str(body.departureDate);

  const passengers: PassengerLine[] = Array.isArray(body.passengers)
    ? body.passengers.map((p: Record<string, unknown>) => ({
        staffNo: str(p.staffNo),
        fullName: str(p.fullName),
        idNo: str(p.idNo),
        ticketNo: str(p.ticketNo),
        kind: str(p.kind),
      }))
    : [];

  const [row] = await db
    .insert(requests)
    .values({
      kind,
      reasonKey: str(body.reasonKey),
      reasonLabel: str(body.reasonLabel),
      origin: str(body.origin).toUpperCase(),
      destination: str(body.destination).toUpperCase(),
      departureDate: departureDate || null,
      daypart: str(body.daypart),
      chargeCode: str(body.chargeCode),
      flightNos: strArray(body.flightNos),
      ticketNumbers: strArray(body.ticketNumbers),
      passengers,
      subject: str(body.subject),
      body: String(body.body ?? ""),
    })
    .returning();

  return json(row, 201);
}
