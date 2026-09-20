"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SectionTitle, TextArea, btn, card } from "@/components/ui";

type Preview = {
  people: number;
  flights: number;
  reasons: number;
  history: number;
  hasSettings: boolean;
  generatedAt: string;
};

type ImportResult = {
  replaceAll: boolean;
  settings: { updated: number };
  reasons: { inserted: number; updated: number };
  flights: { inserted: number; updated: number };
  people: { inserted: number; updated: number; skipped: string[] };
  history: { imported: number };
};

function summarise(raw: unknown): Preview | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const settings = data.settings;
  const reasons = Array.isArray(data.reasons) ? data.reasons : [];
  const flights = Array.isArray(data.flights) ? data.flights : [];
  const people = Array.isArray(data.people) ? data.people : [];
  const history = Array.isArray(data.history) ? data.history : [];
  const hasSettings = Boolean(settings && typeof settings === "object");
  if (!hasSettings && reasons.length === 0 && flights.length === 0 && people.length === 0) {
    return null;
  }
  return {
    people: people.length,
    flights: flights.length,
    reasons: reasons.length,
    history: history.length,
    hasSettings,
    generatedAt: typeof data.generatedAt === "string" ? data.generatedAt : "",
  };
}

export function DesktopImportCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [paste, setPaste] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  function readText(text: string, name: string) {
    setError("");
    setResult(null);
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      setPayload(null);
      setPreview(null);
      setFileName("");
      setError("That file is not valid JSON — did you pick data.json?");
      return;
    }
    const summary = summarise(raw);
    if (!summary) {
      setPayload(null);
      setPreview(null);
      setFileName("");
      setError(
        "That file does not look like Ticket Mailer data — expected settings, reasons, flights or people.",
      );
      return;
    }
    setPayload(raw as Record<string, unknown>);
    setPreview(summary);
    setFileName(name);
  }

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    readText(await file.text(), file.name);
  }

  async function runImport() {
    if (!payload || busy) return;
    if (mode === "replace") {
      const ok = window.confirm(
        "Replace EVERYTHING on this site — directory, flights, reasons and wording — with this file? This cannot be undone.",
      );
      if (!ok) return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/import/desktop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload, replaceAll: mode === "replace" }),
      });
      const answer = await res.json();
      if (!res.ok) {
        setError(answer.error ?? "Import failed");
      } else {
        setResult(answer as ImportResult);
      }
    } catch {
      setError("Could not reach the server — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="import" className={`${card} scroll-mt-24 p-6`}>
      <SectionTitle
        title="Moving from the desktop app? Bring your data with you"
        right={<span className="text-xs text-slate-400">data.json → this site</span>}
      />
      <p className="mb-3 text-sm text-slate-600">
        On your PC, open TicketMailer → <strong>Share &amp; backup</strong> →{" "}
        <em>Export backup</em> (or grab <strong>data.json</strong> from beside{" "}
        <strong>TicketMailer.exe</strong>), send the file to your phone or iPad,
        then pick it below. Staff, flights, reasons, wording and history all
        move across in one go.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => onFilePicked(e.target.files?.[0])}
        />
        <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
          📂 Choose data.json / backup file
        </button>
        {fileName ? (
          <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
            {fileName}
          </span>
        ) : null}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-emerald-700 hover:underline">
          No file picker? Paste the file contents instead
        </summary>
        <TextArea
          rows={4}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder='{"settings": {…}, "people": […]}'
          className="mail-preview mt-2 font-mono text-xs"
        />
        <button
          type="button"
          className={`${btn} mt-2`}
          onClick={() => paste.trim() && readText(paste, "pasted text")}
        >
          Read pasted text
        </button>
      </details>

      {preview ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">
            {preview.people} people · {preview.flights} flights · {preview.reasons} reasons
            {preview.hasSettings ? " · settings ✔" : ""}
            {preview.history > 0 ? ` · ${preview.history} history entries` : ""}
          </p>
          {preview.generatedAt ? (
            <p className="mt-0.5 font-mono text-[11px] text-slate-500">
              file written {preview.generatedAt}
            </p>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-xl border p-3 text-sm ${
                mode === "merge"
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className="flex items-center gap-2 font-bold text-slate-900">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "merge"}
                  onChange={() => setMode("merge")}
                  className="h-4 w-4"
                />
                Merge — recommended
              </span>
              <span className="mt-1 block text-xs text-slate-600">
                Adds what is new, updates what matches (same ID, same flight,
                same reason). Nothing on this site is deleted.
              </span>
            </label>
            <label
              className={`cursor-pointer rounded-xl border p-3 text-sm ${
                mode === "replace"
                  ? "border-rose-400 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <span className="flex items-center gap-2 font-bold text-slate-900">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                  className="h-4 w-4"
                />
                Replace everything
              </span>
              <span className="mt-1 block text-xs text-slate-600">
                Clears this site&apos;s directory, flights, reasons and wording
                first, so it mirrors the file exactly. Sent history is kept.
              </span>
            </label>
          </div>

          <button
            type="button"
            className={`${btn} mt-3 w-full justify-center sm:w-auto`}
            onClick={runImport}
            disabled={busy}
          >
            {busy ? "Importing…" : `Import ${preview.people + preview.flights + preview.reasons} records`}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">
            Imported ✔ {result.replaceAll ? "(replaced everything)" : "(merged)"}
          </p>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            <li>
              Directory: {result.people.inserted} added · {result.people.updated} updated
              {result.people.skipped.length > 0
                ? ` · ${result.people.skipped.length} skipped (no name)`
                : ""}
            </li>
            <li>
              Flights: {result.flights.inserted} added · {result.flights.updated} updated
            </li>
            <li>
              Reasons: {result.reasons.inserted} added · {result.reasons.updated} updated
            </li>
            <li>Settings &amp; wording: {result.settings.updated} fields taken over</li>
            {result.history.imported > 0 ? (
              <li>History: {result.history.imported} past mails restored</li>
            ) : null}
          </ul>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold">
            <Link href="/directory" className="underline">Check the directory →</Link>
            <Link href="/flights" className="underline">Check the flights →</Link>
            <Link href="/" className="underline">Compose a mail →</Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}
