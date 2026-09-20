"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Field,
  SectionTitle,
  Select,
  TextInput,
  btn,
  btnGhost,
  card,
  inputClass,
} from "@/components/ui";
import { AIRPORTS, DAYPARTS, daypartOf } from "@/lib/types";
import type { Flight } from "@/lib/types";

const EMPTY = {
  flightNo: "",
  origin: "ADD",
  destination: "AWA",
  depTime: "",
  arrTime: "",
  daypart: "morning",
  days: "Daily",
};

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<Flight | null>(null);
  const [message, setMessage] = useState("");
  const [importText, setImportText] = useState("");
  const [replaceAll, setReplaceAll] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    updated: number;
    skipped: string[];
    sectors: string[];
  } | null>(null);

  async function runImport() {
    setImportResult(null);
    const res = await fetch("/api/flights/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: importText, replaceAll }),
    });
    const payload = await res.json();
    if (res.ok) {
      setImportText("");
      setImportResult(payload);
      load();
    } else {
      setMessage(payload.error ?? "Import failed");
    }
  }

  async function load() {
    const res = await fetch("/api/flights");
    setFlights(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Flight[]>();
    flights.forEach((flight) => {
      const key = `${flight.origin}-${flight.destination}`;
      map.set(key, [...(map.get(key) ?? []), flight]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [flights]);

  async function addFlight() {
    if (!form.flightNo.trim()) {
      setMessage("Flight number is required");
      return;
    }
    const res = await fetch("/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        daypart: form.daypart || daypartOf(form.depTime),
      }),
    });
    if (res.ok) {
      setForm({ ...EMPTY, origin: form.origin, destination: form.destination });
      setMessage("Flight added ✔");
      load();
    } else {
      setMessage("Could not add this flight");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch(`/api/flights/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    setMessage("Saved ✔");
    load();
  }

  async function toggleActive(flight: Flight) {
    await fetch(`/api/flights/${flight.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !flight.active }),
    });
    load();
  }

  async function removeFlight(id: number) {
    await fetch(`/api/flights/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className={`${card} p-4`}>
        <SectionTitle
          title="Flight helper list"
          right={
            <span className="text-xs text-slate-400">
              {flights.length} flights · {grouped.length} sectors
            </span>
          }
        />
        <p className="mb-4 text-xs text-slate-500">
          These are the options offered when you pick a sector and a time of day
          on the compose screen. Morning = before 12:00, afternoon = 12:00–16:59,
          evening = 17:00 and later.
        </p>
        <div className="space-y-5">
          {grouped.map(([sector, rows]) => (
            <div key={sector}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                <span className="rounded-lg bg-slate-900 px-2 py-0.5 font-mono text-xs text-white">
                  {sector}
                </span>
                <span className="text-xs font-normal text-slate-500">
                  {AIRPORTS[sector.split("-")[0]] ?? sector.split("-")[0]} →{" "}
                  {AIRPORTS[sector.split("-")[1]] ?? sector.split("-")[1]}
                </span>
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((flight) =>
                  editing?.id === flight.id && editing ? (
                    <div
                      key={flight.id}
                      className="space-y-2 rounded-xl border border-emerald-300 bg-emerald-50/40 p-3"
                    >
                      <TextInput
                        value={editing.flightNo}
                        onChange={(e) =>
                          setEditing({ ...editing, flightNo: e.target.value })
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <TextInput
                          value={editing.depTime}
                          placeholder="06:50"
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              depTime: e.target.value,
                              daypart: daypartOf(e.target.value),
                            })
                          }
                        />
                        <TextInput
                          value={editing.arrTime}
                          placeholder="07:45"
                          onChange={(e) =>
                            setEditing({ ...editing, arrTime: e.target.value })
                          }
                        />
                      </div>
                      <Select
                        value={editing.daypart}
                        onChange={(e) =>
                          setEditing({ ...editing, daypart: e.target.value })
                        }
                      >
                        {DAYPARTS.map((part) => (
                          <option key={part.value} value={part.value}>
                            {part.label}
                          </option>
                        ))}
                      </Select>
                      <div className="flex gap-2">
                        <button className={btn} onClick={saveEdit}>
                          Save
                        </button>
                        <button
                          className={btnGhost}
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={flight.id}
                      className={`rounded-xl border p-3 ${
                        flight.active
                          ? "border-slate-200 bg-white"
                          : "border-dashed border-slate-300 bg-slate-50 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {flight.flightNo}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                          {flight.daypart}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        dep {flight.depTime || "—"}
                        {flight.arrTime ? ` · arr ${flight.arrTime}` : ""} ·{" "}
                        {flight.days}
                      </p>
                      <div className="mt-2 flex gap-3 text-xs">
                        <button
                          className="font-semibold text-emerald-700 hover:underline"
                          onClick={() => setEditing(flight)}
                        >
                          edit
                        </button>
                        <button
                          className="font-semibold text-slate-600 hover:underline"
                          onClick={() => toggleActive(flight)}
                        >
                          {flight.active ? "hide" : "show"}
                        </button>
                        <button
                          className="font-semibold text-rose-600 hover:underline"
                          onClick={() => removeFlight(flight.id)}
                        >
                          delete
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${card} h-fit p-4`}>
        <SectionTitle title="Add a flight" />
        <div className="grid gap-2">
          <Field label="Flight number">
            <TextInput
              value={form.flightNo}
              onChange={(e) =>
                setForm({ ...form, flightNo: e.target.value.toUpperCase() })
              }
              placeholder="ET-154"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <TextInput
                value={form.origin}
                onChange={(e) =>
                  setForm({ ...form, origin: e.target.value.toUpperCase() })
                }
                placeholder="AWA"
              />
            </Field>
            <Field label="To">
              <TextInput
                value={form.destination}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value.toUpperCase() })
                }
                placeholder="ADD"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Departure">
              <TextInput
                value={form.depTime}
                onChange={(e) =>
                  setForm({
                    ...form,
                    depTime: e.target.value,
                    daypart: daypartOf(e.target.value),
                  })
                }
                placeholder="08:15"
              />
            </Field>
            <Field label="Arrival">
              <TextInput
                value={form.arrTime}
                onChange={(e) => setForm({ ...form, arrTime: e.target.value })}
                placeholder="09:10"
              />
            </Field>
          </div>
          <Field label="Time of day">
            <Select
              value={form.daypart}
              onChange={(e) => setForm({ ...form, daypart: e.target.value })}
            >
              {DAYPARTS.map((part) => (
                <option key={part.value} value={part.value}>
                  {part.label} ({part.hint})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Operating days">
            <TextInput
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              placeholder="Daily"
            />
          </Field>
          <button className={btn} onClick={addFlight}>
            Add flight
          </button>
          {message ? (
            <p className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
              {message}
            </p>
          ) : null}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <SectionTitle title="Import a flight list" />
          <p className="mb-2 text-xs text-slate-500">
            Paste from Excel — one flight per line. Times may be{" "}
            <code className="rounded bg-slate-100 px-1">08:15</code> or{" "}
            <code className="rounded bg-slate-100 px-1">0815</code>, and the
            sector can be two columns or{" "}
            <code className="rounded bg-slate-100 px-1">AWA-ADD</code>.
          </p>
          <textarea
            rows={6}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"ET-154  AWA  ADD  08:15  09:10\nET-174, AWA-ADD, 1455, 1550"}
            className={`${inputClass} mail-preview`}
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Replace the whole flight list
          </label>
          <button className={`${btn} mt-2 w-full`} onClick={runImport}>
            Import flights
          </button>
          {importResult ? (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold">
                {importResult.inserted} added · {importResult.updated} updated
              </p>
              <p>Sectors: {importResult.sectors.join(", ")}</p>
              {importResult.skipped.length > 0 ? (
                <p className="mt-1 text-amber-700">
                  Skipped {importResult.skipped.length} line(s):{" "}
                  {importResult.skipped.slice(0, 2).join(" | ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
