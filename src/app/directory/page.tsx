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
} from "@/components/ui";
import { classifyId, normalizeId } from "@/lib/classify";
import type { Person } from "@/lib/types";

type ImportResult = {
  inserted: number;
  updated: number;
  employees: number;
  trainees: number;
  skipped: string[];
};

function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
        kind === "trainee"
          ? "bg-sky-100 text-sky-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {kind === "trainee" ? "trainee" : "employee"}
    </span>
  );
}

export default function DirectoryPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [form, setForm] = useState({ staffNo: "", fullName: "", idNo: "" });
  const [editing, setEditing] = useState<Person | null>(null);
  const [importText, setImportText] = useState("");
  const [replaceAll, setReplaceAll] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/people");
    setPeople(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      employees: people.filter((p) => p.kind === "employee").length,
      trainees: people.filter((p) => p.kind === "trainee").length,
    }),
    [people],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => (kindFilter === "all" ? true : p.kind === kindFilter))
      .filter((p) =>
        q ? `${p.staffNo} ${p.fullName} ${p.idNo}`.toLowerCase().includes(q) : true,
      );
  }, [people, query, kindFilter]);

  const verdict = useMemo(() => classifyId(form.staffNo), [form.staffNo]);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function addPerson() {
    if (!form.fullName.trim()) {
      flash("Type the name first");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, staffNo: normalizeId(form.staffNo) }),
    });
    setBusy(false);
    if (res.ok) {
      setForm({ staffNo: "", fullName: "", idNo: "" });
      flash("Added ✔");
      load();
    } else {
      flash("Could not add this person");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    await fetch(`/api/people/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setBusy(false);
    setEditing(null);
    flash("Saved ✔");
    load();
  }

  async function removePerson(id: number) {
    await fetch(`/api/people/${id}`, { method: "DELETE" });
    load();
  }

  async function runImport() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/people/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: importText, replaceAll }),
    });
    const payload = await res.json();
    setBusy(false);
    if (res.ok) {
      setImportText("");
      setResult(payload as ImportResult);
      flash(`Imported ✔ ${payload.inserted} new, ${payload.updated} updated`);
      load();
    } else {
      flash(payload.error ?? "Import failed");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className={`${card} p-4`}>
        <SectionTitle
          title="Employees & trainees"
          right={
            <span className="text-xs text-slate-500">
              {counts.employees} employees · {counts.trainees} trainees
            </span>
          }
        />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TextInput
            placeholder="Search by ID number or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-sm"
          />
          {[
            { value: "all", label: "All" },
            { value: "employee", label: "Employees" },
            { value: "trainee", label: "Trainees" },
          ].map((option) => (
            <Chip
              key={option.value}
              active={kindFilter === option.value}
              onClick={() => setKindFilter(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Type (from ID)</th>
                <th className="py-2 pr-2">Passport / doc</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => {
                if (editing?.id === person.id && editing) {
                  return (
                    <tr key={person.id} className="border-b border-slate-100 bg-emerald-50/40">
                      <td className="py-1 pr-2">
                        <TextInput
                          value={editing.staffNo}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              staffNo: e.target.value,
                              kind: classifyId(e.target.value).kind,
                            })
                          }
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <TextInput
                          value={editing.fullName}
                          onChange={(e) =>
                            setEditing({ ...editing, fullName: e.target.value })
                          }
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <Select
                          value={editing.kind}
                          onChange={(e) =>
                            setEditing({ ...editing, kind: e.target.value })
                          }
                        >
                          <option value="employee">employee</option>
                          <option value="trainee">trainee</option>
                        </Select>
                      </td>
                      <td className="py-1 pr-2">
                        <TextInput
                          value={editing.idNo}
                          onChange={(e) =>
                            setEditing({ ...editing, idNo: e.target.value })
                          }
                        />
                      </td>
                      <td className="py-1">
                        <div className="flex gap-1">
                          <button className={btn} onClick={saveEdit} disabled={busy}>
                            Save
                          </button>
                          <button className={btnGhost} onClick={() => setEditing(null)}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const ruleMatch = classifyId(person.staffNo);
                return (
                  <tr key={person.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-2 font-mono text-xs font-semibold text-slate-700">
                      {person.staffNo || "—"}
                    </td>
                    <td className="py-2 pr-2 font-medium">{person.fullName}</td>
                    <td className="py-2 pr-2">
                      <KindBadge kind={person.kind} />
                      {!ruleMatch.confident && person.staffNo ? (
                        <span
                          className="ml-1 text-[10px] text-amber-600"
                          title={ruleMatch.reason}
                        >
                          ⚠ manual
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 font-mono text-xs text-slate-500">
                      {person.idNo || "—"}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        className="mr-2 text-xs font-semibold text-emerald-700 hover:underline"
                        onClick={() => setEditing(person)}
                      >
                        edit
                      </button>
                      <button
                        className="text-xs font-semibold text-rose-600 hover:underline"
                        onClick={() => removePerson(person.id)}
                      >
                        delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No one matches that search.
            </p>
          ) : null}
        </div>
      </section>

      <div className="space-y-4">
        <section className={`${card} p-4`}>
          <SectionTitle title="Paste your sheet (ID + Name)" />
          <p className="mb-2 text-xs text-slate-500">
            Copy the two columns straight from Excel. Tabs, commas or a single
            space all work — and the type is decided by the ID:
          </p>
          <ul className="mb-3 space-y-1 rounded-xl bg-slate-900 p-3 text-[11px] text-slate-200">
            <li>
              <span className="font-mono text-sky-300">1xxxxx</span> · 6 digits
              starting with 1 → <strong>trainee</strong>
            </li>
            <li>
              <span className="font-mono text-amber-300">xxxxx</span> · 5 digits →{" "}
              <strong>employee</strong>
            </li>
            <li>
              <span className="font-mono text-amber-300">2xxxxx</span> · 6 digits
              starting with 2 → <strong>employee</strong>
            </li>
          </ul>
          <TextArea
            rows={8}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={
              "36154\tGETNET GEZAHEGN ENGIDA\n104112\tNATNAEL BIRHANU ASSEFA\n210447\tMEKDES GIRMA WOLDE"
            }
            className="mail-preview"
          />
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Replace the whole directory with this paste
          </label>
          <button className={`${btn} mt-2 w-full`} onClick={runImport} disabled={busy}>
            {busy ? "Importing…" : "Import list"}
          </button>
          <p className="mt-1 text-[11px] text-slate-400">
            Pasting again never duplicates — rows with the same ID are updated.
          </p>
          {result ? (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold">
                {result.inserted} added · {result.updated} updated
              </p>
              <p>
                {result.employees} employees · {result.trainees} trainees detected
              </p>
              {result.skipped.length > 0 ? (
                <p className="mt-1 text-amber-700">
                  Skipped {result.skipped.length} line(s) with no readable name:{" "}
                  {result.skipped.slice(0, 3).join(" | ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className={`${card} p-4`}>
          <SectionTitle title="Add one person" />
          <div className="grid gap-2">
            <Field label="ID number">
              <TextInput
                value={form.staffNo}
                onChange={(e) => setForm({ ...form, staffNo: e.target.value })}
                placeholder="36154"
              />
            </Field>
            {form.staffNo ? (
              <p
                className={`-mt-1 text-xs ${
                  verdict.confident ? "text-emerald-700" : "text-amber-600"
                }`}
              >
                {verdict.confident ? "✔" : "⚠"} {verdict.reason}
              </p>
            ) : null}
            <Field label="Full name">
              <TextInput
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="GETNET GEZAHEGN ENGIDA"
              />
            </Field>
            <Field
              label="Passport / document no (optional)"
              hint="Only add it when the ticketing team asks for it — it is printed after the name."
            >
              <TextInput
                value={form.idNo}
                onChange={(e) => setForm({ ...form, idNo: e.target.value })}
                placeholder="100529955"
              />
            </Field>
            <button className={btn} onClick={addPerson} disabled={busy}>
              Add to directory
            </button>
          </div>
        </section>

        <section className={`${card} p-4`}>
          <SectionTitle title="Send the list to the macro" />
          <p className="text-xs text-slate-500">
            Save this file in your Windows <strong>Documents</strong> folder and
            the Outlook macro will read it automatically every time it runs — no
            need to re-import the .bas after a staff change.
          </p>
          <a
            href="/api/export/people-csv"
            className={`${btnGhost} mt-2 w-full justify-center`}
          >
            ⬇ TicketMailerPeople.csv
          </a>
        </section>

        {message ? (
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
