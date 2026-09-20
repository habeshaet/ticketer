"use client";

import { useEffect, useState } from "react";
import {
  Field,
  SectionTitle,
  TextArea,
  TextInput,
  btn,
  btnGhost,
  card,
} from "@/components/ui";
import type { Reason, Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [newReason, setNewReason] = useState({ label: "", purposeLine: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const [settingsRes, reasonsRes] = await Promise.all([
      fetch("/api/settings"),
      fetch("/api/reasons"),
    ]);
    setSettings(await settingsRes.json());
    setReasons(await reasonsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function flash(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2400);
  }

  async function save(reset = false) {
    if (!settings) return;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, reset }),
    });
    if (res.ok) {
      setSettings(await res.json());
      flash(reset ? "Templates reset to the house style ✔" : "Saved ✔");
    } else {
      flash("Could not save");
    }
  }

  async function saveReason(reason: Reason) {
    await fetch("/api/reasons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reason),
    });
    flash("Reason saved ✔");
  }

  async function addReason() {
    if (!newReason.label.trim()) return;
    const res = await fetch("/api/reasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newReason, sortOrder: reasons.length * 10 + 10 }),
    });
    if (res.ok) {
      setNewReason({ label: "", purposeLine: "" });
      load();
      flash("Reason added ✔");
    }
  }

  async function removeReason(id: number) {
    await fetch(`/api/reasons?id=${id}`, { method: "DELETE" });
    load();
  }

  async function loadSampleData() {
    await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    flash("Sample flights & directory loaded ✔");
  }

  if (!settings) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-slate-500">
        Loading templates…
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={`${card} p-4`}>
        <SectionTitle title="Defaults" />
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Default charge cc">
              <TextInput
                value={settings.defaultChargeCode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultChargeCode: e.target.value.toUpperCase(),
                  })
                }
              />
            </Field>
            <Field label="Sign off">
              <TextInput
                value={settings.signOff}
                onChange={(e) =>
                  setSettings({ ...settings, signOff: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Signature (your name / department)">
            <TextArea
              rows={3}
              value={settings.signature}
              onChange={(e) =>
                setSettings({ ...settings, signature: e.target.value })
              }
              placeholder={"Abebe K.\nTraining Coordination"}
            />
          </Field>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Ticketing group — new tickets &amp; rebooking
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Send to">
                <TextInput
                  value={settings.toEmails}
                  onChange={(e) => setSettings({ ...settings, toEmails: e.target.value })}
                  placeholder="ticketing@example.com"
                />
              </Field>
              <Field label="Cc">
                <TextInput
                  value={settings.ccEmails}
                  onChange={(e) => setSettings({ ...settings, ccEmails: e.target.value })}
                  placeholder="supervisor@example.com"
                />
              </Field>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
              Dormitory group — dormitory requests only
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Send to">
                <TextInput
                  value={settings.dormToEmails}
                  onChange={(e) => setSettings({ ...settings, dormToEmails: e.target.value })}
                  placeholder="dormitory@example.com"
                />
              </Field>
              <Field label="Cc">
                <TextInput
                  value={settings.dormCcEmails}
                  onChange={(e) => setSettings({ ...settings, dormCcEmails: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <Field
            label="Your own e-mail"
            hint="Always removed from To and Cc, so you never get your own mail back."
          >
            <TextInput
              value={settings.myEmail}
              onChange={(e) => setSettings({ ...settings, myEmail: e.target.value })}
              placeholder="you@ethiopianairlines.com"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => save(false)}>
              Save settings
            </button>
            <button className={btnGhost} onClick={() => save(true)}>
              Reset templates to default
            </button>
            <button className={btnGhost} onClick={loadSampleData}>
              Load sample flights &amp; staff
            </button>
          </div>
          {message ? (
            <p className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
              {message}
            </p>
          ) : null}
        </div>
      </section>

      <section className={`${card} p-4`}>
        <SectionTitle title="Reasons for a new ticket" />
        <p className="mb-3 text-xs text-slate-500">
          The sentence is dropped into the mail through the{" "}
          <code className="rounded bg-slate-100 px-1">{"{PURPOSE}"}</code>{" "}
          placeholder. You may use {"{NAMES}"}, {"{COUNT}"}, {"{SECTOR}"} and{" "}
          {"{DATE}"} inside it.
        </p>
        <div className="space-y-2">
          {reasons.map((reason, index) => (
            <div
              key={reason.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <TextInput
                  value={reason.label}
                  onChange={(e) =>
                    setReasons((current) =>
                      current.map((r, i) =>
                        i === index
                          ? { ...r, label: e.target.value.toUpperCase() }
                          : r,
                      ),
                    )
                  }
                />
                <button
                  className="text-xs font-semibold text-emerald-700 hover:underline"
                  onClick={() => saveReason(reason)}
                >
                  save
                </button>
                <button
                  className="text-xs font-semibold text-rose-600 hover:underline"
                  onClick={() => removeReason(reason.id)}
                >
                  delete
                </button>
              </div>
              <TextArea
                rows={2}
                className="mt-2"
                value={reason.purposeLine}
                onChange={(e) =>
                  setReasons((current) =>
                    current.map((r, i) =>
                      i === index ? { ...r, purposeLine: e.target.value } : r,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-dashed border-slate-300 p-3">
          <Field label="New reason">
            <TextInput
              value={newReason.label}
              onChange={(e) =>
                setNewReason({ ...newReason, label: e.target.value.toUpperCase() })
              }
              placeholder="SIMULATOR TRAINING"
            />
          </Field>
          <TextArea
            rows={2}
            className="mt-2"
            value={newReason.purposeLine}
            onChange={(e) =>
              setNewReason({ ...newReason, purposeLine: e.target.value })
            }
            placeholder="The above listed is traveling for simulator training."
          />
          <button className={`${btn} mt-2`} onClick={addReason}>
            Add reason
          </button>
        </div>
      </section>

      <section className={`${card} p-4`}>
        <SectionTitle title="New ticket template" />
        <Field label="Subject">
          <TextInput
            value={settings.newTicketSubject}
            onChange={(e) =>
              setSettings({ ...settings, newTicketSubject: e.target.value })
            }
          />
        </Field>
        <TextArea
          rows={16}
          className="mail-preview mt-2"
          value={settings.newTicketTemplate}
          onChange={(e) =>
            setSettings({ ...settings, newTicketTemplate: e.target.value })
          }
        />
        <button className={`${btn} mt-2`} onClick={() => save(false)}>
          Save
        </button>
      </section>

      <section className={`${card} p-4`}>
        <SectionTitle title="Dormitory template" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject">
            <TextInput
              value={settings.dormSubject}
              onChange={(e) => setSettings({ ...settings, dormSubject: e.target.value })}
            />
          </Field>
          <Field label="Reason line">
            <TextInput
              value={settings.dormReason}
              onChange={(e) => setSettings({ ...settings, dormReason: e.target.value })}
            />
          </Field>
        </div>
        <TextArea
          rows={14}
          className="mail-preview mt-2"
          value={settings.dormTemplate}
          onChange={(e) => setSettings({ ...settings, dormTemplate: e.target.value })}
        />
        <p className="mt-1 text-xs text-slate-500">
          {"{TRAINEES}"} becomes the numbered student list with ID numbers.
        </p>
        <button className={`${btn} mt-2`} onClick={() => save(false)}>Save</button>
      </section>

      <section className={`${card} p-4`}>
        <SectionTitle title="Rebooking template" />
        <Field label="Subject">
          <TextInput
            value={settings.rebookSubject}
            onChange={(e) =>
              setSettings({ ...settings, rebookSubject: e.target.value })
            }
          />
        </Field>
        <TextArea
          rows={16}
          className="mail-preview mt-2"
          value={settings.rebookTemplate}
          onChange={(e) =>
            setSettings({ ...settings, rebookTemplate: e.target.value })
          }
        />
        <button className={`${btn} mt-2`} onClick={() => save(false)}>
          Save
        </button>
      </section>
    </div>
  );
}
