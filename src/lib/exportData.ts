import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { flights, people, reasons } from "@/db/schema";
import { getSettingsRow } from "./server";

export type ExportPayload = {
  generatedAt: string;
  settings: {
    defaultChargeCode: string;
    toEmails: string;
    ccEmails: string;
    rebookToEmails?: string;
    rebookCcEmails?: string;
    dormToEmails?: string;
    dormCcEmails?: string;
    signOff: string;
    signature: string;
    newTicketTemplate: string;
    rebookTemplate: string;
    newTicketSubject: string;
    rebookSubject: string;
  };
  reasons: { key: string; label: string; purposeLine: string }[];
  flights: {
    flightNo: string;
    origin: string;
    destination: string;
    depTime: string;
    arrTime: string;
    daypart: string;
  }[];
  people: {
    kind: string;
    staffNo: string;
    fullName: string;
    idNo: string;
    chargeCode: string;
    station: string;
  }[];
};

export async function loadExportPayload(): Promise<ExportPayload> {
  const [settingsRow, reasonRows, flightRows, peopleRows] = await Promise.all([
    getSettingsRow(),
    db
      .select()
      .from(reasons)
      .where(eq(reasons.active, true))
      .orderBy(asc(reasons.sortOrder)),
    db
      .select()
      .from(flights)
      .where(eq(flights.active, true))
      .orderBy(asc(flights.origin), asc(flights.destination), asc(flights.depTime)),
    db
      .select()
      .from(people)
      .where(eq(people.active, true))
      .orderBy(asc(people.fullName)),
  ]);

  return {
    generatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    settings: {
      defaultChargeCode: settingsRow.defaultChargeCode,
      toEmails: settingsRow.toEmails,
      ccEmails: settingsRow.ccEmails,
      rebookToEmails: settingsRow.rebookToEmails ?? "",
      rebookCcEmails: settingsRow.rebookCcEmails ?? "",
      dormToEmails: settingsRow.dormToEmails ?? "",
      dormCcEmails: settingsRow.dormCcEmails ?? "",
      signOff: settingsRow.signOff,
      signature: settingsRow.signature,
      newTicketTemplate: settingsRow.newTicketTemplate,
      rebookTemplate: settingsRow.rebookTemplate,
      newTicketSubject: settingsRow.newTicketSubject,
      rebookSubject: settingsRow.rebookSubject,
    },
    reasons: reasonRows.map((r) => ({
      key: r.key,
      label: r.label,
      purposeLine: r.purposeLine,
    })),
    flights: flightRows.map((f) => ({
      flightNo: f.flightNo,
      origin: f.origin,
      destination: f.destination,
      depTime: f.depTime,
      arrTime: f.arrTime,
      daypart: f.daypart,
    })),
    people: peopleRows.map((p) => ({
      kind: p.kind,
      staffNo: p.staffNo,
      fullName: p.fullName,
      idNo: p.idNo,
      chargeCode: p.chargeCode,
      station: p.station,
    })),
  };
}
