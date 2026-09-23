"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chip,
  Field,
  SectionTitle,
  Select,
  TextArea,
  TextInput,
  btn,
  btnGhost,
  card,
  inputClass,
} from "@/components/ui";
import {
  addDaysISO,
  buildEmail,
  buildMailto,
  formatTicketDate,
  routeLegs,
  stripSelf,
  todayISO,
  type EmailKind,
  type Leg,
} from "@/lib/email";
import type { Flight, PassengerLine, Person, Reason, Settings } from "@/lib/types";
import { AIRPORTS, DAYPARTS } from "@/lib/types";

type Bootstrap = {
  settings: Settings;
  reasons: Reason[];
  flights: Flight[];
  people: Person[];
  routes: string[];
};

type SelectedPax = PassengerLine & { personId?: number; kind?: string };

const KIND_BUTTONS = [
  {
    value: "new_ticket" as const,
    label: "New ticket",
    // a ticket stub
    path: "M3 8.5V6.5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a2.5 2.5 0 0 0 0 5v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a2.5 2.5 0 0 0 0-5ZM14 6v12",
  },
  {
    value: "rebooking" as const,
    label: "Rebooking",
    // two arrows going round
    path: "M20 11a8 8 0 0 0-13.7-5.3L3 9M3 9V4M3 9h5M4 13a8 8 0 0 0 13.7 5.3L21 15M21 15v5M21 15h-5",
  },
  {
    value: "dormitory" as const,
    label: "Dormitory",
    // a bed
    path: "M3 18v-9M3 13h18v5M21 18v-4a3 3 0 0 0-3-3h-6v2M7.5 9.5a1.5 1.5 0 1 0 0-.01",
  },
];

/** iOS truncates very long mailto: links, so warn before it bites. */
const MAILTO_SAFE_LENGTH = 1800;

export default function ComposePage() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [kind, setKind] = useState<EmailKind>("new_ticket");
  const [trip, setTrip] = useState<"direct" | "multi">("direct");
  const [reasonKey, setReasonKey] = useState("");
  const [sector, setSector] = useState("");
  const [route, setRoute] = useState("");
  const [legFlights, setLegFlights] = useState<string[][]>([]);
  const [daypart, setDaypart] = useState("any");
  const [flightNos, setFlightNos] = useState<string[]>([]);
  const [departureDate, setDepartureDate] = useState("");
  const [chargeCode, setChargeCode] = useState("");
  const [dormReason, setDormReason] = useState("");
  const [passengers, setPassengers] = useState<SelectedPax[]>([]);
  const [ticketsRaw, setTicketsRaw] = useState("");
  const [remarks, setRemarks] = useState("");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [showBatchList, setShowBatchList] = useState(false);
  const [ticketType, setTicketType] = useState<"one-way ticket" | "round-trip ticket">("round-trip ticket");
  const [hasReturn, setHasReturn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [returnDaypart, setReturnDaypart] = useState("any");
  const [returnFlightNos, setReturnFlightNos] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bootstrap")
      .then((res) => res.json())
      .then((payload: Bootstrap) => {
        if (cancelled) return;
        setData(payload);
        setChargeCode(payload.settings.defaultChargeCode);
        setDormReason(payload.settings.dormReason);
        setDepartureDate(addDaysISO(todayISO(), 1));
        if (payload.reasons.length > 0) setReasonKey(payload.reasons[0].key);
        const firstSector = payload.flights[0]
          ? `${payload.flights[0].origin}-${payload.flights[0].destination}`
          : "";
        setSector(firstSector);
        setRoute(payload.routes[0] ?? "");
      })
      .catch(() => setToast("Could not load data. Pull down to refresh."));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const isDorm = kind === "dormitory";
  const isRebook = kind === "rebooking";
  const isMulti = trip === "multi" && !isDorm;

  const sectors = useMemo(() => {
    if (!data) return [] as string[];
    return Array.from(
      new Set(data.flights.map((f) => `${f.origin}-${f.destination}`)),
    ).sort();
  }, [data]);

  const legs: Leg[] = useMemo(() => {
    if (!isMulti) return [];
    return routeLegs(route).map((sec, index) => ({
      sector: sec,
      flights: legFlights[index] ?? [],
    }));
  }, [isMulti, route, legFlights]);

  const [origin, destination] = useMemo(() => {
    const parts = sector.split("-");
    return [parts[0] ?? "", parts[1] ?? ""];
  }, [sector]);

  const returnSector = useMemo(() => {
    if (!origin || !destination) return "";
    return `${destination}-${origin}`;
  }, [origin, destination]);

  const visibleFlights = useMemo(() => {
    if (!data) return [] as Flight[];
    const inSector = data.flights.filter(
      (f) => `${f.origin}-${f.destination}` === sector,
    );
    return daypart === "any"
      ? inSector
      : inSector.filter((f) => f.daypart === daypart);
  }, [data, sector, daypart]);

  const visibleReturnFlights = useMemo(() => {
    if (!data || !returnSector) return [] as Flight[];
    const inSector = data.flights.filter(
      (f) => `${f.origin}-${f.destination}` === returnSector,
    );
    return returnDaypart === "any"
      ? inSector
      : inSector.filter((f) => f.daypart === returnDaypart);
  }, [data, returnSector, returnDaypart]);

  function toggleReturnFlight(no: string) {
    setReturnFlightNos((cur) =>
      cur.includes(no) ? cur.filter((x) => x !== no) : [...cur, no],
    );
  }

  function flightsForLeg(sec: string) {
    if (!data) return [] as Flight[];
    return data.flights
      .filter((f) => `${f.origin}-${f.destination}` === sec)
      .sort((a, b) => a.depTime.localeCompare(b.depTime));
  }

  const ticketNumbers = useMemo(
    () => ticketsRaw.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean),
    [ticketsRaw],
  );

  const activeReason = useMemo(
    () => data?.reasons.find((r) => r.key === reasonKey),
    [data, reasonKey],
  );

  useEffect(() => {
    if (!reasonKey) return;
    const isFerry =
      reasonKey.toLowerCase().includes("ferry") ||
      (activeReason?.label ?? "").toLowerCase().includes("ferry");
    setTicketType(isFerry ? "one-way ticket" : "round-trip ticket");
  }, [reasonKey, activeReason]);

  useEffect(() => {
    if (ticketType === "one-way ticket") {
      setHasReturn(false);
    }
  }, [ticketType]);

  function toggleReturnOption(enable: boolean) {
    setHasReturn(enable);
    if (enable && !returnDate) {
      setReturnDate(addDaysISO(departureDate || todayISO(), 7));
    }
  }

  const availableBatches = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    data.people.forEach((p) => {
      if (p.batch && p.batch.trim()) {
        if (isDorm && p.kind !== "trainee") return;
        set.add(p.batch.trim());
      }
    });
    return Array.from(set).sort();
  }, [data, isDorm]);

  const searchResults = useMemo(() => {
    if (!data) return [] as Person[];
    const q = query.trim().toLowerCase();
    const wanted = isDorm ? "trainee" : kindFilter;
    return data.people
      .filter((p) => (wanted === "all" ? true : p.kind === wanted))
      .filter((p) =>
        batchFilter === "all" ? true : (p.batch || "").trim() === batchFilter,
      )
      .filter((p) =>
        q
          ? `${p.staffNo} ${p.fullName} ${p.idNo} ${p.batch ?? ""}`
              .toLowerCase()
              .includes(q)
          : true,
      )
      .slice(0, 50);
  }, [data, query, kindFilter, isDorm, batchFilter]);

  // switching to dormitory must drop anyone who is not a trainee
  useEffect(() => {
    if (!isDorm) return;
    setPassengers((cur) => cur.filter((p) => p.kind === "trainee"));
  }, [isDorm]);

  const email = useMemo(() => {
    if (!data) return { subject: "", body: "" };
    return buildEmail({
      kind,
      legs: isMulti ? legs : undefined,
      reasonKey: kind === "new_ticket" ? reasonKey : "",
      reasonLabel: kind === "new_ticket" ? activeReason?.label ?? "" : "",
      ticketType: kind === "new_ticket" ? ticketType : undefined,
      returnDate: hasReturn && kind === "new_ticket" && ticketType === "round-trip ticket" ? returnDate : "",
      returnFlightNos: hasReturn && kind === "new_ticket" && ticketType === "round-trip ticket" ? returnFlightNos : [],
      purposeLine: kind === "new_ticket" ? activeReason?.purposeLine ?? "" : "",
      origin: isMulti || isDorm ? "" : origin,
      destination: isMulti || isDorm ? "" : destination,
      departureDate,
      daypart: isMulti || daypart === "any" ? "" : daypart,
      flightNos: isMulti || isDorm ? [] : flightNos,
      ticketNumbers,
      passengers,
      chargeCode: chargeCode.toUpperCase(),
      dormReason,
      signOff: data.settings.signOff,
      signature: data.settings.signature,
      remarks: isDorm ? "" : remarks,
      today: todayISO(),
      templates: {
        newTicket: data.settings.newTicketTemplate,
        rebook: data.settings.rebookTemplate,
        dorm: data.settings.dormTemplate,
        newTicketSubject: data.settings.newTicketSubject,
        rebookSubject: data.settings.rebookSubject,
        dormSubject: data.settings.dormSubject,
      },
    });
  }, [
    data, kind, isMulti, isDorm, legs, reasonKey, activeReason, ticketType, hasReturn, returnDate, returnFlightNos, origin, destination,
    departureDate, daypart, flightNos, ticketNumbers, passengers, chargeCode,
    dormReason, remarks,
  ]);

  const recipients = useMemo(() => {
    const s = data?.settings;
    if (!s) return { to: "", cc: "", label: "Ticketing group" };
    const to = isDorm
      ? s.dormToEmails
      : isRebook
      ? (s.rebookToEmails || s.toEmails)
      : s.toEmails;
    const cc = isDorm
      ? s.dormCcEmails
      : isRebook
      ? (s.rebookCcEmails || s.ccEmails)
      : s.ccEmails;
    return {
      to: stripSelf(to, s.myEmail),
      cc: stripSelf(cc, s.myEmail),
      label: isDorm
        ? "Dormitory group"
        : isRebook
        ? "Rebooking group"
        : "Ticketing group",
    };
  }, [data, isDorm, isRebook]);

  const mailtoHref = useMemo(() => {
    return buildMailto(recipients.to, {
      subject: email.subject,
      body: email.body,
      cc: recipients.cc,
    });
  }, [email, recipients]);

  const mailtoTooLong = mailtoHref.length > MAILTO_SAFE_LENGTH;

  const hasNoNames = isRebook
    ? ticketNumbers.length === 0
    : passengers.length === 0;

  const missingLabel = isDorm
    ? "trainees"
    : isRebook
      ? "ticket numbers"
      : "passengers";

  function handleOpenOutlook(e: React.MouseEvent<HTMLAnchorElement>) {
    if (hasNoNames) {
      const confirmed = window.confirm(
        `Warning: No ${missingLabel} have been added.\n\nDo you want to open Outlook anyway?`
      );
      if (!confirmed) {
        e.preventDefault();
        setToast(`⚠️ Please add ${missingLabel} before sending.`);
        return;
      }
    }
    saveToHistory(true);
  }

  function toggleFlight(no: string) {
    setFlightNos((cur) =>
      cur.includes(no) ? cur.filter((x) => x !== no) : [...cur, no],
    );
  }

  function toggleLegFlight(index: number, no: string) {
    setLegFlights((cur) => {
      const next = [...cur];
      const list = next[index] ? [...next[index]] : [];
      const at = list.indexOf(no);
      if (at >= 0) list.splice(at, 1);
      else list.push(no);
      next[index] = list;
      return next;
    });
  }

  function addPerson(person: Person) {
    if (isDorm && person.kind !== "trainee") {
      setToast("Dormitory requests are for trainees only.");
      return;
    }
    setPassengers((cur) =>
      cur.some((p) => p.personId === person.id)
        ? cur
        : [
            ...cur,
            {
              personId: person.id,
              staffNo: person.staffNo,
              fullName: person.fullName,
              idNo: person.idNo,
              batch: person.batch,
              kind: person.kind,
              ticketNo: "",
            },
          ],
    );
  }

  function addAllInBatch(batchName: string) {
    if (!data) return;
    const matching = data.people.filter(
      (p) =>
        (isDorm ? p.kind === "trainee" : true) &&
        (p.batch || "").trim() === batchName,
    );
    if (matching.length === 0) return;
    setPassengers((cur) => {
      const next = [...cur];
      matching.forEach((person) => {
        if (!next.some((p) => p.personId === person.id)) {
          next.push({
            personId: person.id,
            staffNo: person.staffNo,
            fullName: person.fullName,
            idNo: person.idNo,
            batch: person.batch,
            kind: person.kind,
            ticketNo: "",
          });
        }
      });
      return next;
    });
    setToast(`Added ${matching.length} from ${batchName} ✔`);
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      if (hasNoNames) {
        setToast(`⚠️ ${what} copied, but warning: no ${missingLabel} added!`);
      } else {
        setToast(`${what} copied ✔`);
      }
    } catch {
      setToast("Copy blocked — select the text and copy manually");
    }
  }

  async function saveToHistory(silent = false) {
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          reasonKey: kind === "new_ticket" ? reasonKey : "",
          reasonLabel: kind === "new_ticket" ? activeReason?.label ?? "" : "",
          origin: isMulti ? route.split("-")[0] : origin,
          destination: isMulti ? route.split("-").slice(-1)[0] : destination,
          departureDate,
          daypart: daypart === "any" ? "" : daypart,
          chargeCode,
          flightNos: isMulti
            ? legs.flatMap((l) => l.flights)
            : hasReturn && returnFlightNos.length > 0
            ? [...flightNos, ...returnFlightNos]
            : flightNos,
          ticketNumbers,
          passengers,
          subject: email.subject,
          body: email.body,
        }),
      });
      if (!silent) setToast("Saved to history ✔");
    } catch {
      if (!silent) setToast("Could not save to history");
    }
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1fr)]">
      {/* ---------------- request + trip ---------------- */}
      <section className={`${card} p-4`}>
        <SectionTitle title="Request" step="1" />
        <div className="mb-3 grid grid-cols-3 gap-2">
          {KIND_BUTTONS.map(({ value, label, path }) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-center text-xs font-semibold transition ${
                kind === value
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
                   stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
                   strokeLinejoin="round" aria-hidden="true">
                <path d={path} />
              </svg>
              {label}
            </button>
          ))}
        </div>

        <div
          className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            recipients.to
              ? isDorm
                ? "bg-emerald-50 text-emerald-800"
                : "bg-slate-100 text-slate-600"
              : "bg-amber-50 text-amber-700"
          }`}
          title={
            recipients.to
              ? `To: ${recipients.to}${recipients.cc ? `\nCc: ${recipients.cc}` : ""}`
              : "No address set yet — add one on the Templates page."
          }
        >
          {recipients.to ? "✉" : "⚠"} {recipients.label}
        </div>

        {kind === "new_ticket" ? (
          <div className="space-y-3">
            <Field label="Reason">
              <Select value={reasonKey} onChange={(e) => setReasonKey(e.target.value)}>
                {data.reasons.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs">
              <span className="font-semibold text-slate-600">Ticket type:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setTicketType("round-trip ticket")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    ticketType === "round-trip ticket"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Round-trip
                </button>
                <button
                  type="button"
                  onClick={() => setTicketType("one-way ticket")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    ticketType === "one-way ticket"
                      ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  One-way
                </button>
              </div>
            </div>

            {ticketType === "round-trip ticket" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
                <span className="mb-2 block font-semibold text-slate-700">
                  Select return date &amp; preferred flight?
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleReturnOption(false)}
                    className={`min-h-[38px] rounded-lg px-3 py-1.5 font-semibold transition ${
                      !hasReturn
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-300"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    No (departure only)
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleReturnOption(true)}
                    className={`min-h-[38px] rounded-lg px-3 py-1.5 font-semibold transition ${
                      hasReturn
                        ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-600"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Yes (add return details)
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {isDorm ? (
          <Field label="Reason">
            <TextInput value={dormReason} onChange={(e) => setDormReason(e.target.value)} />
          </Field>
        ) : null}

        <div className="mt-4">
          <SectionTitle title="Departure date" step="2" />
          <input
            type="date"
            className={inputClass}
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip onClick={() => setDepartureDate(todayISO())}>Today</Chip>
            <Chip onClick={() => setDepartureDate(addDaysISO(todayISO(), 1))}>Tomorrow</Chip>
            <Chip onClick={() => setDepartureDate(addDaysISO(todayISO(), 7))}>+1 week</Chip>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            {departureDate ? formatTicketDate(departureDate) : ""}
          </p>
        </div>

        {hasReturn && ticketType === "round-trip ticket" && kind === "new_ticket" ? (
          <div className="mt-4 border-t border-slate-200/80 pt-4">
            <SectionTitle title="Return date" />
            <input
              type="date"
              className={inputClass}
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip onClick={() => setReturnDate(addDaysISO(departureDate || todayISO(), 3))}>
                +3 days
              </Chip>
              <Chip onClick={() => setReturnDate(addDaysISO(departureDate || todayISO(), 7))}>
                +1 week
              </Chip>
              <Chip onClick={() => setReturnDate(addDaysISO(departureDate || todayISO(), 14))}>
                +2 weeks
              </Chip>
            </div>
            <p className="mt-2 text-xs text-emerald-700">
              {returnDate ? formatTicketDate(returnDate) : ""}
            </p>
          </div>
        ) : null}
      </section>

      {/* ---------------- flight + people ---------------- */}
      <section className={`${card} p-4`}>
        {!isDorm ? (
          <>
            <SectionTitle
              title="Flight"
              step="3"
              right={
                <span className="text-xs text-slate-400">
                  {isMulti
                    ? legs.flatMap((l) => l.flights).join(" / ") || "None chosen"
                    : flightNos.join(" OR ") || "None chosen"}
                </span>
              }
            />
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(["direct", "multi"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrip(t)}
                  className={`rounded-lg py-2 text-sm font-semibold transition ${
                    trip === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {t === "direct" ? "Direct" : "Multi-city"}
                </button>
              ))}
            </div>

            {isMulti ? (
              <>
                <Field label="Route">
                  <div className="flex flex-wrap gap-1.5">
                    {data.routes.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        No connecting routes yet.
                      </span>
                    ) : null}
                    {data.routes.map((r) => (
                      <Chip
                        key={r}
                        active={r === route}
                        onClick={() => { setRoute(r); setLegFlights([]); }}
                      >
                        {r}
                      </Chip>
                    ))}
                  </div>
                </Field>
                <p className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Every flight of the day is listed for each leg.
                </p>
                {routeLegs(route).map((sec, index) => (
                  <div key={sec} className="mb-3">
                    <p className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-700">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                        LEG {index + 1}
                      </span>
                      <span className="font-mono">{sec}</span>
                    </p>
                    {flightsForLeg(sec).map((f) => {
                      const on = (legFlights[index] ?? []).includes(f.flightNo);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleLegFlight(index, f.flightNo)}
                          className={`mb-1.5 flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3 text-left text-sm ${
                            on ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <span className={`flex h-5 w-5 items-center justify-center rounded-md border text-[11px] ${
                            on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 text-transparent"
                          }`}>✓</span>
                          <span className="font-mono font-bold">{f.flightNo}</span>
                          <span className="ml-auto text-xs text-slate-500">
                            {f.depTime}{f.arrTime ? ` → ${f.arrTime}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Sector
                    </span>
                    {origin && destination ? (
                      <span className="text-xs font-medium text-emerald-700">
                        {AIRPORTS[origin] ?? origin} → {AIRPORTS[destination] ?? destination}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sectors.map((s) => (
                      <Chip
                        key={s}
                        active={s === sector}
                        onClick={() => {
                          setSector(s);
                          if (s !== sector) setFlightNos([]);
                        }}
                      >
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Time of day
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setDaypart("any")}
                      className={`min-h-[38px] rounded-lg py-1.5 text-xs font-semibold transition ${
                        daypart === "any"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Any
                    </button>
                    {DAYPARTS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setDaypart(p.value)}
                        className={`min-h-[38px] rounded-lg py-1.5 text-xs font-semibold transition ${
                          daypart === p.value
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold uppercase tracking-wider">
                      Available Flights ({visibleFlights.length})
                    </span>
                    <span>{flightNos.length} selected</span>
                  </div>
                  {visibleFlights.map((f) => {
                    const on = flightNos.includes(f.flightNo);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFlight(f.flightNo)}
                        className={`flex min-h-[48px] w-full items-center gap-3.5 rounded-xl border px-3.5 py-2.5 text-left transition ${
                          on
                            ? "border-emerald-500 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition ${
                            on
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {f.flightNo}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {f.days || "Daily"}
                          </span>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {f.daypart}
                          </span>
                          <span className="font-mono text-xs font-medium text-slate-700">
                            {f.depTime}
                            {f.arrTime ? ` → ${f.arrTime}` : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {visibleFlights.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
                      No flights scheduled for this sector in the {daypart} slot.
                    </p>
                  ) : null}
                </div>

                {hasReturn && ticketType === "round-trip ticket" && kind === "new_ticket" && !isMulti ? (
                  <div className="mt-5 border-t border-slate-200/80 pt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Preferred Return Flight
                      </span>
                      {destination && origin ? (
                        <span className="text-xs font-medium text-emerald-700">
                          {AIRPORTS[destination] ?? destination} → {AIRPORTS[origin] ?? origin}
                        </span>
                      ) : null}
                    </div>

                    <div className="mb-3">
                      <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Return time of day
                      </span>
                      <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => setReturnDaypart("any")}
                          className={`min-h-[38px] rounded-lg py-1.5 text-xs font-semibold transition ${
                            returnDaypart === "any"
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Any
                        </button>
                        {DAYPARTS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setReturnDaypart(p.value)}
                            className={`min-h-[38px] rounded-lg py-1.5 text-xs font-semibold transition ${
                              returnDaypart === p.value
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-bold uppercase tracking-wider">
                          Available Return Flights ({visibleReturnFlights.length})
                        </span>
                        <span>{returnFlightNos.length} selected</span>
                      </div>
                      {visibleReturnFlights.map((f) => {
                        const on = returnFlightNos.includes(f.flightNo);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleReturnFlight(f.flightNo)}
                            className={`flex min-h-[48px] w-full items-center gap-3.5 rounded-xl border px-3.5 py-2.5 text-left transition ${
                              on
                                ? "border-emerald-500 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition ${
                                on
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-300 bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-bold text-slate-900">
                                {f.flightNo}
                              </span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {f.days || "Daily"}
                              </span>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                {f.daypart}
                              </span>
                              <span className="font-mono text-xs font-medium text-slate-700">
                                {f.depTime}
                                {f.arrTime ? ` → ${f.arrTime}` : ""}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {visibleReturnFlights.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
                          No return flights scheduled for {returnSector} in the {returnDaypart} slot.
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </>
        ) : null}

        {isRebook ? (
          <div className={isDorm ? "" : "mt-4"}>
            <SectionTitle title="Ticket numbers" step="4"
              right={<span className="text-xs text-slate-400">{ticketNumbers.length}</span>} />
            <TextArea
              rows={4}
              value={ticketsRaw}
              onChange={(e) => setTicketsRaw(e.target.value)}
              placeholder={"0712162366863\n0712156444358"}
              className="mail-preview"
            />
            {ticketNumbers.length === 0 ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <span>⚠️</span>
                <span>No ticket numbers entered yet. Add at least one ticket to rebook.</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {!isRebook ? (
          <div className={isDorm ? "" : "mt-4"}>
            <SectionTitle
              title={isDorm ? "Trainees" : "Passengers"}
              step={isDorm ? "3" : "4"}
              right={<span className="text-xs text-slate-400">{passengers.length} chosen</span>}
            />
            <TextInput
              placeholder="Search ID, name, or batch…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {passengers.length === 0 ? (
              <p className="mt-2 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                <span>⚠️</span>
                <span>No {isDorm ? "trainees" : "passengers"} chosen yet. Search and click to add people to the email.</span>
              </p>
            ) : null}
            {!isDorm ? (
              <div className="mt-2 flex gap-1.5">
                {[["all", "All"], ["employee", "Employees"], ["trainee", "Trainees"]].map(
                  ([v, l]) => (
                    <Chip key={v} active={kindFilter === v} onClick={() => setKindFilter(v)}>{l}</Chip>
                  ),
                )}
              </div>
            ) : null}
            {availableBatches.length > 0 ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                <button
                  type="button"
                  onClick={() => setShowBatchList((prev) => !prev)}
                  className="flex w-full items-center justify-between px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Filter by Batch</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                      {availableBatches.length} batches
                    </span>
                    {batchFilter !== "all" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Selected: {batchFilter}
                      </span>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {showBatchList ? "▲ Hide" : "▼ Expand"}
                  </span>
                </button>
                {showBatchList ? (
                  <div className="border-t border-slate-200 p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip
                        active={batchFilter === "all"}
                        onClick={() => setBatchFilter("all")}
                      >
                        All Batches
                      </Chip>
                      {availableBatches.map((b) => (
                        <Chip
                          key={b}
                          active={batchFilter === b}
                          onClick={() => setBatchFilter(b)}
                        >
                          {b}
                        </Chip>
                      ))}
                    </div>
                    {batchFilter !== "all" ? (
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2">
                        <span className="text-[11px] text-slate-500">
                          Quick add all trainees from batch {batchFilter}
                        </span>
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                          onClick={() => addAllInBatch(batchFilter)}
                        >
                          + Add all in {batchFilter}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPerson(p)}
                  className="flex min-h-[44px] w-full items-center gap-2.5 border-b border-slate-100 px-3 text-left text-sm last:border-0 hover:bg-slate-50"
                >
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    p.kind === "trainee" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"
                  }`}>{p.kind === "trainee" ? "TRN" : "EMP"}</span>
                  {p.batch ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                      {p.batch}
                    </span>
                  ) : null}
                  <span className="w-14 shrink-0 font-mono text-xs text-slate-500">{p.staffNo}</span>
                  <span className="flex-1 truncate">{p.fullName}</span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-lg border border-emerald-600/30 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100">
                    + Add
                  </span>
                </button>
              ))}
              {searchResults.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">Nobody matches.</p>
              ) : null}
            </div>
            <ol className="mt-2 space-y-1.5">
              {passengers.map((p, i) => (
                <li key={`${p.personId}-${i}`}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <span className="text-xs font-bold text-slate-400">{i + 1}</span>
                  <span className="font-mono text-xs text-slate-500">{p.staffNo}</span>
                  <span className="flex-1 truncate">
                    {p.fullName}
                    {p.batch ? (
                      <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                        {p.batch}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-600"
                    onClick={() => setPassengers((c) => c.filter((_, x) => x !== i))}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ol>
            {!isDorm ? (
              <Field label="Extra remark (optional)">
                <TextInput value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Field>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ---------------- the e-mail ---------------- */}
      <section className={`${card} p-4 xl:sticky xl:top-20 xl:h-fit`}>
        <SectionTitle title="The e-mail" step="✓" />
        <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Subject</span>
          <p className="text-sm font-medium">{email.subject}</p>
        </div>
        <textarea
          readOnly
          value={email.body}
          rows={16}
          className="mail-preview w-full rounded-xl border border-slate-200 p-3 text-sm"
        />
        {hasNoNames ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <span className="text-base leading-none">⚠️</span>
            <div>
              <p className="font-bold">No {missingLabel} added</p>
              <p className="mt-0.5 text-amber-800">
                This email currently contains no {isDorm ? "trainee names" : isRebook ? "ticket numbers" : "passenger names"}. Please add {missingLabel} before sending.
              </p>
            </div>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            className={`${btn} col-span-2 min-h-[48px]`}
            href={mailtoHref}
            onClick={handleOpenOutlook}
          >
            ✉ Open in Outlook
          </a>
          <button
            type="button"
            className={`${btnGhost} min-h-[44px]`}
            onClick={() => copy(email.body, "Body")}
          >
            Copy body
          </button>
          <button
            type="button"
            className={`${btnGhost} min-h-[44px]`}
            onClick={() =>
              copy(`Subject: ${email.subject}\n\n${email.body}`, "Subject + body")
            }
          >
            Copy all
          </button>
        </div>
        {mailtoTooLong ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This message is long. On iPad the “Open in Outlook” link can get cut
            short — use <strong>Copy body</strong> and paste into Outlook instead.
          </p>
        ) : null}
        {toast ? (
          <div className="mt-3 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">{toast}</div>
        ) : null}
      </section>
    </div>
  );
}
