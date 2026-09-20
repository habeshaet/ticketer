import {
  DEFAULT_DORM_REASON,
  DEFAULT_DORM_SUBJECT,
  DEFAULT_DORM_TEMPLATE,
  DEFAULT_NEW_TICKET_SUBJECT,
  DEFAULT_NEW_TICKET_TEMPLATE,
  DEFAULT_REBOOK_SUBJECT,
  DEFAULT_REBOOK_TEMPLATE,
} from "@/lib/email";

export const SEED_REASONS = [
  {
    key: "passport_registration",
    label: "PASSPORT REGISTRATION",
    purposeLine:
      "The above listed is traveling for passport registration. Kindly confirm the booking and share the ticket number.",
    sortOrder: 10,
  },
  {
    key: "ferry_return",
    label: "FERRY RETURN",
    purposeLine:
      "The above listed is returning back to base after a ferry flight. Kindly process the ticket.",
    sortOrder: 20,
  },
  {
    key: "stage_completed",
    label: "STAGE COMPLETED BY TRAINEE",
    purposeLine:
      "The above listed trainee has completed the training stage and is returning to base.",
    sortOrder: 30,
  },
  {
    key: "ground_class",
    label: "FOR GROUND CLASS",
    purposeLine:
      "The above listed is traveling to attend ground class as per the training schedule.",
    sortOrder: 40,
  },
  {
    key: "flight_training",
    label: "FOR FLIGHT TRAINING",
    purposeLine:
      "The above listed is traveling for flight training as per the training schedule.",
    sortOrder: 50,
  },
  {
    key: "medical_renewal",
    label: "MEDICAL RENEWAL",
    purposeLine:
      "The above listed is traveling for medical renewal. Kindly process the ticket accordingly.",
    sortOrder: 60,
  },
];

type SeedFlight = {
  flightNo: string;
  origin: string;
  destination: string;
  depTime: string;
  arrTime: string;
  daypart: string;
};

export const SEED_FLIGHTS: SeedFlight[] = [
  // ADD <-> AWA
  { flightNo: "ET-153", origin: "ADD", destination: "AWA", depTime: "06:50", arrTime: "07:45", daypart: "morning" },
  { flightNo: "ET-173", origin: "ADD", destination: "AWA", depTime: "13:30", arrTime: "14:25", daypart: "afternoon" },
  { flightNo: "ET-197", origin: "ADD", destination: "AWA", depTime: "17:40", arrTime: "18:35", daypart: "evening" },
  { flightNo: "ET-154", origin: "AWA", destination: "ADD", depTime: "08:15", arrTime: "09:10", daypart: "morning" },
  { flightNo: "ET-174", origin: "AWA", destination: "ADD", depTime: "14:55", arrTime: "15:50", daypart: "afternoon" },
  { flightNo: "ET-198", origin: "AWA", destination: "ADD", depTime: "19:05", arrTime: "20:00", daypart: "evening" },
  // ADD <-> DIR
  { flightNo: "ET-121", origin: "ADD", destination: "DIR", depTime: "06:30", arrTime: "07:35", daypart: "morning" },
  { flightNo: "ET-125", origin: "ADD", destination: "DIR", depTime: "12:40", arrTime: "13:45", daypart: "afternoon" },
  { flightNo: "ET-129", origin: "ADD", destination: "DIR", depTime: "18:20", arrTime: "19:25", daypart: "evening" },
  { flightNo: "ET-122", origin: "DIR", destination: "ADD", depTime: "08:20", arrTime: "09:25", daypart: "morning" },
  { flightNo: "ET-126", origin: "DIR", destination: "ADD", depTime: "14:35", arrTime: "15:40", daypart: "afternoon" },
  { flightNo: "ET-130", origin: "DIR", destination: "ADD", depTime: "20:10", arrTime: "21:15", daypart: "evening" },
  // ADD <-> JIJ
  { flightNo: "ET-141", origin: "ADD", destination: "JIJ", depTime: "07:10", arrTime: "08:30", daypart: "morning" },
  { flightNo: "ET-145", origin: "ADD", destination: "JIJ", depTime: "13:10", arrTime: "14:30", daypart: "afternoon" },
  { flightNo: "ET-149", origin: "ADD", destination: "JIJ", depTime: "17:30", arrTime: "18:50", daypart: "evening" },
  { flightNo: "ET-142", origin: "JIJ", destination: "ADD", depTime: "09:15", arrTime: "10:35", daypart: "morning" },
  { flightNo: "ET-146", origin: "JIJ", destination: "ADD", depTime: "15:15", arrTime: "16:35", daypart: "afternoon" },
  { flightNo: "ET-150", origin: "JIJ", destination: "ADD", depTime: "19:30", arrTime: "20:50", daypart: "evening" },
];

type SeedPerson = {
  kind: string;
  staffNo: string;
  fullName: string;
  idNo: string;
  chargeCode: string;
  station: string;
  note: string;
};

/**
 * IDs follow the house rule:
 *   6 digits starting with 1 -> trainee
 *   5 digits, or 6 digits starting with 2 -> employee
 */
export const SEED_PEOPLE: SeedPerson[] = [
  { kind: "employee", staffNo: "36154", fullName: "GETNET GEZAHEGN ENGIDA", idNo: "100529955", chargeCode: "EAAMG969", station: "AWA", note: "" },
  { kind: "employee", staffNo: "36210", fullName: "ABEBE TADESSE BEKELE", idNo: "", chargeCode: "EAAMG969", station: "ADD", note: "" },
  { kind: "employee", staffNo: "36288", fullName: "SELAMAWIT HAILU TESFAYE", idNo: "", chargeCode: "EAAMG969", station: "ADD", note: "" },
  { kind: "employee", staffNo: "38402", fullName: "YONAS ALEMAYEHU DEMISSIE", idNo: "", chargeCode: "EAAMG969", station: "DIR", note: "" },
  { kind: "employee", staffNo: "210447", fullName: "MEKDES GIRMA WOLDE", idNo: "", chargeCode: "EAAMG969", station: "AWA", note: "" },
  { kind: "employee", staffNo: "214980", fullName: "DAWIT SOLOMON KEBEDE", idNo: "", chargeCode: "EAAMG969", station: "JIJ", note: "" },
  { kind: "employee", staffNo: "223016", fullName: "TIGIST ASSEFA MENGESHA", idNo: "", chargeCode: "EAAMG969", station: "ADD", note: "" },
  { kind: "trainee", staffNo: "104112", fullName: "NATNAEL BIRHANU ASSEFA", idNo: "", chargeCode: "EAAMG969", station: "AWA", note: "" },
  { kind: "trainee", staffNo: "104263", fullName: "HELEN TESHOME ABERA", idNo: "", chargeCode: "EAAMG969", station: "AWA", note: "" },
  { kind: "trainee", staffNo: "105578", fullName: "SAMUEL FIKADU NEGASH", idNo: "", chargeCode: "EAAMG969", station: "DIR", note: "" },
  { kind: "trainee", staffNo: "106190", fullName: "BETELHEM MULUGETA AYELE", idNo: "", chargeCode: "EAAMG969", station: "ADD", note: "" },
  { kind: "trainee", staffNo: "107341", fullName: "KALEB ASRAT GEBREMARIAM", idNo: "", chargeCode: "EAAMG969", station: "JIJ", note: "" },
  { kind: "trainee", staffNo: "108825", fullName: "RAHEL BEKELE DESTA", idNo: "", chargeCode: "EAAMG969", station: "AWA", note: "" },
];

export const SEED_SETTINGS = {
  id: 1,
  defaultChargeCode: "EAAMG969",
  toEmails: "",
  ccEmails: "",
  dormToEmails: "",
  dormCcEmails: "",
  myEmail: "",
  theme: "ethiopian",
  signOff: "Best regards,",
  signature: "",
  newTicketTemplate: DEFAULT_NEW_TICKET_TEMPLATE,
  rebookTemplate: DEFAULT_REBOOK_TEMPLATE,
  newTicketSubject: DEFAULT_NEW_TICKET_SUBJECT,
  rebookSubject: DEFAULT_REBOOK_SUBJECT,
  dormTemplate: DEFAULT_DORM_TEMPLATE,
  dormReason: DEFAULT_DORM_REASON,
  dormSubject: DEFAULT_DORM_SUBJECT,
};
