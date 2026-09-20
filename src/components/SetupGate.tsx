"use client";

import { useEffect, useState } from "react";
import { btn, btnGhost, card } from "@/components/uiServer";

type Status = {
  ready: boolean;
  step: "env" | "setup" | "connect" | "ready";
  message: string;
};

/**
 * Shown instead of the app when the database is not usable yet, so a fresh
 * deployment explains itself rather than throwing a stack trace.
 */
export function SetupGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function refresh() {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      setStatus(await res.json());
    } catch {
      setStatus({
        ready: false,
        step: "connect",
        message: "The site could not be reached. Try reloading the page.",
      });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runSetup() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const payload = await res.json();
      if (payload.ok) {
        setNote(
          `Done — ${payload.people} people and ${payload.flights} flights loaded.`,
        );
        await refresh();
      } else {
        setNote(payload.error ?? "Setup failed.");
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error));
    }
    setBusy(false);
  }

  if (status === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-slate-500">
        Checking…
      </div>
    );
  }

  if (status.ready) return <>{children}</>;

  const envStep = status.step === "env";

  return (
    <div className="mx-auto max-w-2xl py-6">
      <section className={`${card} p-6`}>
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
          One more step
        </span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {envStep ? "Connect a database" : "Finish the setup"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{status.message}</p>

        {envStep ? (
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            <li>
              <strong>1.</strong> Create a free database at{" "}
              <a
                className="font-semibold text-emerald-700 underline"
                href="https://neon.tech"
                target="_blank"
                rel="noreferrer"
              >
                neon.tech
              </a>{" "}
              and copy its connection string.
            </li>
            <li>
              <strong>2.</strong> In Vercel open your project →{" "}
              <strong>Settings → Environment Variables</strong>.
            </li>
            <li>
              <strong>3.</strong> Add <code className="rounded bg-slate-100 px-1">DATABASE_URL</code>{" "}
              with that string. Tick <strong>Production</strong>,{" "}
              <strong>Preview</strong> and <strong>Development</strong>.
            </li>
            <li>
              <strong>4.</strong> Go to <strong>Deployments</strong> → the latest
              one → <strong>Redeploy</strong>. Environment variables are only
              picked up by a new deployment.
            </li>
          </ol>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              className={btn}
              onClick={runSetup}
              disabled={busy}
            >
              {busy ? "Setting up…" : "Create the tables now"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Creates the tables and loads the starting lists. Safe to press
              twice — it never overwrites anything you have entered.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button type="button" className={btnGhost} onClick={refresh}>
            Check again
          </button>
          {note ? <span className="text-sm text-slate-600">{note}</span> : null}
        </div>
      </section>
    </div>
  );
}
