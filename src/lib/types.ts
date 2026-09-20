export type Kind = "new_ticket" | "rebooking";
export type Daypart = "morning" | "afternoon" | "evening";

export type Person = {
  id: number;
  kind: string;
  staffNo: string;
  fullName: string;
  idNo: string;
  chargeCode: string;
  station: string;
  phone: string;
  note: string;
  active: boolean;
};

export type Flight = {
  id: number;
  flightNo: string;
  origin: string;
  destination: string;
  depTime: string;
  arrTime: string;
  daypart: string;
  days: string;
  active: boolean;
};

export type Reason = {
  id: number;
  key: string;
  label: string;
  purposeLine: string;
  sortOrder: number;
  active: boolean;
};

export type Settings = {
  id: number;
  defaultChargeCode: string;
  toEmails: string;
  ccEmails: string;
  dormToEmails: string;
  dormCcEmails: string;
  myEmail: string;
  theme: string;
  signOff: string;
  signature: string;
  newTicketTemplate: string;
  rebookTemplate: string;
  newTicketSubject: string;
  rebookSubject: string;
  dormTemplate: string;
  dormReason: string;
  dormSubject: string;
};

export type PassengerLine = {
  staffNo: string;
  fullName: string;
  idNo: string;
  ticketNo?: string;
  kind?: string;
};

export type RequestRecord = {
  id: number;
  kind: string;
  reasonKey: string;
  reasonLabel: string;
  origin: string;
  destination: string;
  departureDate: string | null;
  daypart: string;
  chargeCode: string;
  flightNos: string[];
  ticketNumbers: string[];
  passengers: PassengerLine[];
  subject: string;
  body: string;
  createdAt: string;
};

export const DAYPARTS: { value: Daypart; label: string; hint: string }[] = [
  { value: "morning", label: "Morning", hint: "before 12:00" },
  { value: "afternoon", label: "Afternoon", hint: "12:00 – 16:59" },
  { value: "evening", label: "Evening", hint: "17:00 and later" },
];

export const AIRPORTS: Record<string, string> = {
  ADD: "Addis Ababa (Bole)",
  DIR: "Dire Dawa",
  AWA: "Hawassa",
  JIJ: "Jijiga",
  BJR: "Bahir Dar",
  MQX: "Mekelle",
  GDQ: "Gondar",
  JIM: "Jimma",
};

export function daypartOf(depTime: string): Daypart {
  const hour = Number((depTime || "00:00").split(":")[0] ?? 0);
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
