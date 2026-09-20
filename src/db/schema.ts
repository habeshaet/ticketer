import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Employees + trainees directory (looked up by ID / staff number / name). */
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull().default("employee"), // employee | trainee
  staffNo: text("staff_no").notNull().default(""),
  fullName: text("full_name").notNull(),
  idNo: text("id_no").notNull().default(""), // passport / national ID number
  batch: text("batch").notNull().default(""), // training batch e.g. Batch 12, B-24
  chargeCode: text("charge_code").notNull().default(""),
  station: text("station").notNull().default(""),
  phone: text("phone").notNull().default(""),
  note: text("note").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Helper list of available flights per sector. */
export const flights = pgTable("flights", {
  id: serial("id").primaryKey(),
  flightNo: text("flight_no").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  depTime: text("dep_time").notNull().default(""), // HH:MM (24h)
  arrTime: text("arr_time").notNull().default(""),
  daypart: text("daypart").notNull().default("morning"), // morning | afternoon | evening
  days: text("days").notNull().default("Daily"),
  active: boolean("active").notNull().default(true),
});

/** Reasons for a NEW ticket request (each carries the sentence used in the mail). */
export const reasons = pgTable("reasons", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  purposeLine: text("purpose_line").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

/** Single-row settings + editable mail templates. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  defaultChargeCode: text("default_charge_code").notNull().default("EAAMG969"),
  // ticketing group - new tickets and rebooking
  toEmails: text("to_emails").notNull().default(""),
  ccEmails: text("cc_emails").notNull().default(""),
  // dormitory group - dormitory requests only
  dormToEmails: text("dorm_to_emails").notNull().default(""),
  dormCcEmails: text("dorm_cc_emails").notNull().default(""),
  // your own address, always stripped from To and Cc
  myEmail: text("my_email").notNull().default(""),
  adminPassword: text("admin_password").notNull().default("admin123"),
  signOff: text("sign_off").notNull().default("Best regards,"),
  signature: text("signature").notNull().default(""),
  newTicketTemplate: text("new_ticket_template").notNull().default(""),
  rebookTemplate: text("rebook_template").notNull().default(""),
  dormTemplate: text("dorm_template").notNull().default(""),
  dormReason: text("dorm_reason").notNull().default(""),
  dormSubject: text("dorm_subject").notNull().default(""),
  theme: text("theme").notNull().default("ethiopian"),
  newTicketSubject: text("new_ticket_subject").notNull().default(""),
  rebookSubject: text("rebook_subject").notNull().default(""),
});

/** Every generated mail is logged so it can be re-used / re-copied. */
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // new_ticket | rebooking
  reasonKey: text("reason_key").notNull().default(""),
  reasonLabel: text("reason_label").notNull().default(""),
  origin: text("origin").notNull().default(""),
  destination: text("destination").notNull().default(""),
  departureDate: date("departure_date"),
  daypart: text("daypart").notNull().default(""),
  chargeCode: text("charge_code").notNull().default(""),
  flightNos: jsonb("flight_nos").$type<string[]>().notNull(),
  ticketNumbers: jsonb("ticket_numbers").$type<string[]>().notNull(),
  passengers: jsonb("passengers")
    .$type<
      {
        staffNo: string;
        fullName: string;
        idNo: string;
        ticketNo?: string;
        kind?: string;
      }[]
    >()
    .notNull(),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
