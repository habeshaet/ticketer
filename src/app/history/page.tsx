"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionTitle, TextInput, btnGhost, card } from "@/components/ui";
import { buildMailto, formatTicketDate } from "@/lib/email";
import type { RequestRecord } from "@/lib/types";

export default function HistoryPage() {
  const [items, setItems] = useState<RequestRecord[]>([]);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (q: string) => {
    const res = await fetch(`/api/requests?q=${encodeURIComponent(q)}`);
    setItems(await res.json());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(query), 250);
    return () => clearTimeout(timer);
  }, [query, load]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied ✔");
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Clipboard blocked");
    }
  }

  async function remove(id: number) {
    await fetch(`/api/requests/${id}`, { method: "DELETE" });
    load(query);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <section className={`${card} p-4`}>
        <SectionTitle
          title="Sent request history"
          right={<span className="text-xs text-slate-400">{items.length} saved</span>}
        />
        <TextInput
          placeholder="Search subject, body, sector…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3 sm:max-w-sm"
        />
        {message ? (
          <div className="mb-3 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">
            {message}
          </div>
        ) : null}
        {items.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            Nothing saved yet. Hit “Save to history” after you generate a mail.
          </p>
        ) : null}
        <div className="space-y-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="flex w-full flex-wrap items-center gap-3 px-3 py-3 text-left"
              >
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                    item.kind === "rebooking"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {item.kind === "rebooking" ? "rebook" : "new ticket"}
                </span>
                <span className="flex-1 text-sm font-semibold text-slate-800">
                  {item.subject || "(no subject)"}
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {item.origin}-{item.destination}
                </span>
                <span className="text-xs text-slate-500">
                  {item.departureDate ? formatTicketDate(item.departureDate) : ""}
                </span>
                <span className="text-xs text-slate-400">
                  {item.kind === "rebooking"
                    ? `${item.ticketNumbers.length} tkt`
                    : `${item.passengers.length} pax`}
                </span>
              </button>
              {openId === item.id ? (
                <div className="border-t border-slate-100 px-3 py-3">
                  <pre className="mail-preview rounded-xl bg-slate-50 p-3 text-sm text-slate-800">
                    {item.body}
                  </pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className={btnGhost}
                      onClick={() => copy(item.body)}
                    >
                      📋 Copy body
                    </button>
                    <button
                      className={btnGhost}
                      onClick={() =>
                        copy(`Subject: ${item.subject}\n\n${item.body}`)
                      }
                    >
                      Copy all
                    </button>
                    <a
                      className={btnGhost}
                      href={buildMailto("", {
                        subject: item.subject,
                        body: item.body,
                      })}
                    >
                      ✉ Open in mail app
                    </a>
                    <button
                      className="ml-auto text-xs font-semibold text-rose-600 hover:underline"
                      onClick={() => remove(item.id)}
                    >
                      delete
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
