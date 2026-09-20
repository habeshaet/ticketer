import { sql } from "drizzle-orm";
import { db } from "@/db";
import { flights, people } from "@/db/schema";
import { card } from "@/components/uiServer";

export const dynamic = "force-dynamic";

async function counts() {
  const [p] = await db.select({ n: sql<number>`count(*)::int` }).from(people);
  const [f] = await db.select({ n: sql<number>`count(*)::int` }).from(flights);
  return { people: p?.n ?? 0, flights: f?.n ?? 0 };
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <div className="mt-1 space-y-2 text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">
      {children}
    </code>
  );
}

export default async function ToolsPage() {
  const { people: peopleCount, flights: flightCount } = await counts();

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-12">
      <section className={`${card} overflow-hidden`}>
        <div className="bg-slate-900 p-6 text-white">
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
            Windows desktop app
          </span>
          <h1 className="mt-3 text-2xl font-bold">TicketMailer.exe</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            A real program that runs on your PC — no browser, no login, no
            internet. Ethiopian green, gold and red throughout, its own app
            icon, and a live preview as you type; it writes the new-ticket and
            rebooking e-mails and hands them straight to Outlook. Staff,
            flights, reasons and wording are all editable inside the app.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href="/api/export/desktop"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-400"
            >
              ⬇ Download TicketMailer.zip
            </a>
            <span className="text-xs text-slate-400">
              includes your {peopleCount} people and {flightCount} flights ·
              builds to a single .exe
            </span>
          </div>
        </div>
        <div className="grid gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["ticket_mailer.py", "the program"],
            ["ui.html", "the interface"],
            ["assets/icon.ico", "the app icon"],
            ["assets/logo.png", "the airline logo"],
            ["build_exe.bat", "double-click to build"],
            ["data.json", "your lists & wording"],
            ["README.txt", "the full manual"],
          ].map(([name, what]) => (
            <div key={name} className="bg-white px-4 py-3">
              <p className="font-mono text-xs font-bold text-slate-800">{name}</p>
              <p className="text-[11px] text-slate-500">{what}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Make the .exe — once, about 5 minutes
        </h2>
        <div className="space-y-5">
          <Step n="1" title="Unzip it somewhere sensible">
            <p>
              Right-click <Code>TicketMailer.zip</Code> → <strong>Extract
              All…</strong> → choose something like <Code>C:\TicketMailer</Code>.
              Avoid building inside Downloads or OneDrive.
            </p>
          </Step>
          <Step n="2" title="Install Python (skip if you already have it)">
            <p>
              Get it from{" "}
              <a
                className="font-semibold text-emerald-700 underline"
                href="https://www.python.org/downloads/"
                target="_blank"
                rel="noreferrer"
              >
                python.org/downloads
              </a>
              . On the very first installer screen{" "}
              <strong>tick “Add python.exe to PATH”</strong>, then click Install
              Now.
            </p>
            <p className="text-xs text-slate-500">
              Python is only needed to <em>build</em> the exe. The finished exe
              runs on PCs with no Python at all.
            </p>
          </Step>
          <Step n="3" title="Double-click build_exe.bat">
            <p>
              A green console window checks Python, installs PyInstaller and
              pywin32, runs a self-test on the code, then builds. It takes 1–3
              minutes and opens the <Code>dist</Code> folder when it is done.
            </p>
            <pre className="mail-preview rounded-xl bg-slate-900 p-3 text-xs text-emerald-200">
{`[1/5] Found Python 3.12.4
[2/5] Installing the window toolkit (pywebview)... done
[3/5] Installing the build tool and Outlook support... done
[4/5] Checking the program... all good
[5/5] Building TicketMailer.exe - this takes 1-3 minutes...
       using your app icon
       your staff + flight lists will be baked INSIDE the exe
DONE!  C:\\TicketMailer\\dist\\TicketMailer.exe`}
            </pre>
          </Step>
          <Step n="4" title="Copy the dist folder anywhere">
            <p>
              <Code>dist</Code> contains <Code>TicketMailer.exe</Code> and{" "}
              <Code>data.json</Code>. Copy the folder to your work PC, a shared
              drive or a USB stick. Right-click the exe →{" "}
              <strong>Send to → Desktop (create shortcut)</strong> — the
              shortcut, the window and the taskbar all carry the app icon.
            </p>
          </Step>
        </div>
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <strong>Your lists travel inside the exe.</strong> The build embeds{" "}
            <Code>data.json</Code> with <Code>--add-data</Code>, so a single{" "}
            <Code>TicketMailer.exe</Code> already contains your staff, flights,
            reasons and wording — a colleague opens it and continues where you
            left off.
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <strong>The self-test no longer stops the build.</strong> If it
            reports anything, the batch prints the reason on screen, writes{" "}
            <Code>selftest_log.txt</Code> and <em>carries on building</em>. You
            can run it yourself any time with{" "}
            <Code>python ticket_mailer.py --selftest</Code>.
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>If you cannot install PyInstaller</strong> (locked-down PC),
            the app still runs directly with{" "}
            <Code>pip install pywebview</Code> then{" "}
            <Code>python ticket_mailer.py</Code> — identical in every way, it
            just needs Python on that machine.
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <strong>What draws the window?</strong> The interface is real
            HTML/CSS rendered by the <strong>Edge WebView2</strong> runtime that
            ships with Windows 10 and 11 — so the app looks modern and the exe
            stays small. On the rare PC without it, install the free{" "}
            <a
              className="font-semibold text-emerald-700 underline"
              href="https://developer.microsoft.com/microsoft-edge/webview2/"
              target="_blank"
              rel="noreferrer"
            >
              Evergreen runtime
            </a>{" "}
            once.
          </div>
        </div>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-1 text-lg font-bold text-slate-900">
          Using the app day to day
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          A side menu with six pages. You will spend almost all your time on
          the first one. Each column scrolls on its own, so a long flight list
          never pushes the e-mail or the Send button off the screen. The <strong>theme picker</strong> sits in the title
          bar: click a colour circle to switch instantly, or click the name to
          drop down the full list with descriptions — Ethiopian (the default),
          Emerald, Indigo, Midnight (dark) and Daylight (light). Your choice is
          saved.
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="text-sm font-bold text-emerald-800">
              Compose — three columns, live preview
            </h3>
            <ol className="mt-2 grid gap-1.5 text-xs text-slate-700 sm:grid-cols-2">
              <li>
                <strong>1. Type</strong> — New ticket, Rebooking or{" "}
                <strong>Dormitory</strong>. A panel shows which group of people
                the mail will go to.
              </li>
              <li>
                <strong>2. Sector</strong> — AWA-ADD, ADD-DIR, JIJ-ADD…
              </li>
              <li>
                <strong>3. Time of day</strong> — Any / Morning / Afternoon /
                Evening filters the flight box below it.
              </li>
              <li>
                <strong>4. Flights</strong> — listed one per line with times;
                tick one or two to get <Code>ET-154 OR ET-174</Code>.
              </li>
              <li>
                <strong>Multi-city</strong> — switch the Flight box to{" "}
                <em>Multi-city</em> for trips through a connection like{" "}
                <Code>AWA-ADD-DIR</Code>. Each leg gets its own list showing{" "}
                <strong>every flight of the day</strong> (no time-of-day
                filter). Routes build themselves from your flight list.
              </li>
              <li>
                <strong>5. Date</strong> — a real <strong>calendar
                picker</strong>, plus one-click Today / Tomorrow / +2 days /
                +1 week. The line underneath confirms “tomorrow Sep 18,2026”.
              </li>
              <li>
                <strong>6. Charge cc</strong> — filled in automatically from
                your saved code, and only asked for on a new ticket.
              </li>
              <li>
                <strong>6. Reason</strong> — your six reasons, for new tickets.
              </li>
              <li>
                <strong>7. Passengers</strong> — type an ID or name, press Enter.
                (New tickets only — rebooking asks for nothing but the ticket
                numbers.)
              </li>
              <li>
                <strong>8. Send</strong> — <em>Open in Outlook</em>, Copy body,
                Copy all, Save .txt, Keep in history.
              </li>
            </ol>
            <p className="mt-2 text-xs text-emerald-900">
              Names, flight numbers, airports and the charge code are{" "}
              <strong>forced to CAPITALS as you type</strong>. The message opens
              in Outlook on screen — <strong>you</strong> press Send. Nothing
              ever leaves automatically.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">Staff list tab</h3>
              <p className="mt-1 text-xs text-slate-600">
                Paste the <strong>ID + Name</strong> columns from Excel and press
                Import. Tab, comma or a single space all work, in either order.
                Re-pasting updates instead of duplicating. Import/Export CSV too.
              </p>
              <div className="mt-2 rounded-lg bg-slate-900 p-2 text-[11px] text-slate-200">
                <div>
                  <span className="font-mono text-sky-300">1xxxxx</span> → trainee
                </div>
                <div>
                  <span className="font-mono text-amber-300">xxxxx</span> ·{" "}
                  <span className="font-mono text-amber-300">2xxxxx</span> →
                  employee
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Dormitory requests
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                A third request type with its <strong>own recipients</strong> —
                set a Ticketing group and a Dormitory group (To and Cc each) on
                the Templates page and they never mix. The compose screen shows
                only the group <em>name</em>, not the addresses. The dormitory
                wording is pre-written and editable, and the list shows{" "}
                <strong>trainees only</strong>, so an instructor can’t be added
                by mistake.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">Flights tab</h3>
              <p className="mt-1 text-xs text-slate-600">
                Paste a whole flight list from Excel — the airports can be two
                columns or <Code>AWA-ADD</Code>, times can be{" "}
                <Code>08:15</Code> or <Code>0815</Code>, and the time of day is
                derived from the departure. Header rows are ignored and
                re-importing updates instead of duplicating. CSV import/export
                too.
              </p>
              <pre className="mail-preview mt-2 rounded-lg bg-slate-900 p-2 text-[11px] text-slate-200">
{`ET-154  AWA  ADD  08:15  09:10
ET-174, AWA-ADD, 1455, 1550`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">
            What it produces (rebooking)
          </h3>
          <pre className="mail-preview mt-2 rounded-lg bg-white p-3 text-xs text-slate-800">
{`Dear Team
Greetings

Kindly rebook the below listed tickets for tomorrow Sep 18,2026 on ET-154 OR ET-174.
( AWA-ADD)

* 0712162366863

* 0712156444358

Best regards,`}
          </pre>
        </div>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-1 text-lg font-bold text-slate-900">
          Giving the app to colleagues
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Everything you change saves instantly to{" "}
          <Code>ticket_mailer_data.json</Code> — beside the exe when that folder
          is writable, otherwise{" "}
          <Code>C:\Users\you\AppData\Roaming\TicketMailer</Code>. The{" "}
          <strong>Share &amp; backup</strong> tab always shows the exact path.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <span className="text-[11px] font-bold uppercase text-slate-500">
              Choice 1 — send the folder
            </span>
            <h3 className="mt-1 text-sm font-bold text-slate-900">
              Nothing to rebuild
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Send <Code>TicketMailer.exe</Code> plus the{" "}
              <Code>ticket_mailer_data.json</Code> next to it. They drop both in
              one folder, open the exe, and your staff, flights and wording are
              all there.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-4">
            <span className="text-[11px] font-bold uppercase text-emerald-700">
              Choice 2 — one single file
            </span>
            <h3 className="mt-1 text-sm font-bold text-slate-900">
              Bake the lists inside the exe
            </h3>
            <ol className="mt-1 space-y-1 text-sm text-slate-700">
              <li>
                1. In the app: <strong>Share &amp; backup</strong> →{" "}
                <em>Write data.json for the next build</em>
              </li>
              <li>
                2. Run <Code>build_exe.bat</Code> again
              </li>
              <li>
                3. Send just <Code>TicketMailer.exe</Code> — it carries
                everything inside itself
              </li>
            </ol>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li>
            <strong>Their edits stay theirs</strong> — a colleague's changes save
            on their own PC and never overwrite yours.
          </li>
          <li>
            <strong>Backup / restore:</strong> Share &amp; backup → Export backup
            writes one file with staff, flights, reasons, wording and history.
          </li>
          <li>
            <strong>Refresh from this site:</strong> update the Directory or
            Flights pages, then download{" "}
            <a
              className="font-semibold text-emerald-700 underline"
              href="/api/export/desktop-file?name=data.json"
            >
              data.json
            </a>{" "}
            and drop it beside the exe (delete{" "}
            <Code>ticket_mailer_data.json</Code> first so it re-seeds).
          </li>
        </ul>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Branding — using your official logo
        </h2>
        <p className="text-sm text-slate-600">
          The <strong>Ethiopian Airlines logo ships inside the app</strong>. It
          appears in the sidebar, and the same mark is used for the{" "}
          <Code>.exe</Code> file, the window and the taskbar icon.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>
            <strong>Using a different logo:</strong> replace{" "}
            <Code>assets\logo.png</Code> (or .jpg / .svg) and restart — it
            appears in the sidebar, and <Code>build_exe.bat</Code> bakes it into
            the exe so colleagues get it too. Square, around 512×512, works best.
          </li>
          <li>
            <strong>Your own logo on the exe icon:</strong> put a real{" "}
            <Code>.ico</Code> in the assets folder — <Code>icon.ico</Code>,{" "}
            <Code>logo.ico</Code> and <Code>app.ico</Code> are all accepted —
            then rebuild. If you only have a square{" "}
            <Code>logo.png</Code>, <Code>build_exe.bat</Code> now{" "}
            <strong>makes the .ico for you</strong>.
          </li>
          <li>
            <strong>A renamed picture will not work:</strong>{" "}
            <Code>logo.png</Code> saved as <Code>logo.ico</Code> is still a PNG.
            The build detects this and says so rather than silently using the
            default icon. Check any time with{" "}
            <Code>python ticket_mailer.py --icon-check</Code>.
          </li>
          <li>
            <strong>Getting your own mail back in your inbox?</strong> Put your
            address in <Code>Your own e-mail</Code> on the Templates page — it
            is then stripped from To and Cc every time. (A copy in{" "}
            <em>Sent</em> is normal and unaffected.)
          </li>
          <li>
            <strong>Old icon still showing?</strong> Windows caches icons — the
            build refreshes the cache automatically; otherwise press F5 in the{" "}
            <Code>dist</Code> folder or sign out and back in.
          </li>
        </ul>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-3 text-lg font-bold text-slate-900">Troubleshooting</h2>
        <dl className="space-y-3 text-sm">
          {[
            [
              "“Windows protected your PC” when I start the exe",
              "Click More info → Run anyway. It appears because the file is not code-signed — it is your own build.",
            ],
            [
              "build_exe.bat says Python was not found",
              "Python is missing or was installed without “Add python.exe to PATH”. Re-run the Python installer, choose Modify, and tick that box.",
            ],
            [
              "The exe opens and closes immediately",
              "Run it from a Command Prompt so the error stays visible. Usually the data file is corrupt — delete ticket_mailer_data.json and restart; it rebuilds from data.json.",
            ],
            [
              "“Open in Outlook” opens a browser instead",
              "pywin32 was not installed during the build. Run python -m pip install pywin32 and build again. The mail still works either way.",
            ],
            [
              "Antivirus quarantines the exe",
              "A known false positive with PyInstaller builds. Ask IT to allow the file, or just run python ticket_mailer.py.",
            ],
            [
              "I need different wording",
              "Templates tab inside the app — no rebuild needed. Only edits to ticket_mailer.py require running build_exe.bat again.",
            ],
          ].map(([question, answer]) => (
            <div key={question}>
              <dt className="font-semibold text-slate-900">{question}</dt>
              <dd className="text-slate-600">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={`${card} p-6`}>
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          Individual files &amp; other formats
        </h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["ticket_mailer.py", "/api/export/desktop-file?name=ticket_mailer.py"],
            ["ui.html", "/api/export/desktop-file?name=ui.html"],
            ["build_exe.bat", "/api/export/desktop-file?name=build_exe.bat"],
            ["data.json", "/api/export/desktop-file?name=data.json"],
            ["README.txt", "/api/export/desktop-file?name=README.txt"],
            ["requirements.txt", "/api/export/desktop-file?name=requirements.txt"],
            ["Staff list CSV", "/api/export/people-csv"],
            ["Outlook VBA macro (.bas)", "/api/export/vba"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
            >
              ⬇ {label}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
