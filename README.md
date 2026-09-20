# Ticket Mailer

Writes the repetitive ticketing e-mails — **new ticket**, **rebooking** and
**dormitory request** — from your staff, trainee and flight lists, and hands
them to Outlook.

There are two ways to run it:

| | Who it suits | Where it runs |
|---|---|---|
| **Web app** (this repo) | iPad, phone, any browser | Vercel free tier |
| **Desktop app** (`desktop/`) | Windows PCs | A single `TicketMailer.exe` |

Both produce identical e-mails.

---

## Put it on Vercel (free) so iPads can use it

You need two free accounts: **GitHub** and **Vercel**. About 15 minutes.

### 1. Put this folder on GitHub

```bash
cd TicketMailer
git init
git add .
git commit -m "Ticket Mailer"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/ticket-mailer.git
git push -u origin main
```

> `.gitignore` already keeps `.env`, `node_modules` and build output out of the
> repository. **Never commit `.env`** — it holds your database password.

If your staff list is sensitive, make the repository **Private**
(*Settings → General → Danger Zone → Change visibility*). A private repo still
deploys to Vercel normally.

### 2. Create a free database

Vercel's free plan does not include a database, so use **Neon** (free tier):

1. Go to <https://neon.tech> and sign up.
2. Create a project — any name, any region near you.
3. Copy the **connection string**. It looks like
   `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`

### 3. Deploy

1. Go to <https://vercel.com> → **Add New → Project**.
2. Import your GitHub repository.
3. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon string you copied |

4. Click **Deploy** and wait for it to finish.

### 4. Create the tables (once)

Open your Vercel address in a browser. The app notices the tables are missing
and shows a **“Finish the setup”** screen with one button —
**Create the tables now**. Press it and you are done.

(If you prefer a terminal: `curl -X POST https://your-app.vercel.app/api/setup`.)

Running it twice is harmless — it never overwrites data you have entered.

### 5. Set it up for your team

Open the site and go to **Templates**:

- **Ticketing group** — the To and Cc for new tickets and rebooking
- **Dormitory group** — the To and Cc for dormitory requests
- **Your own e-mail** — always stripped from To and Cc so you do not receive
  your own mail

Then load your real people on **Directory** and your real flights on
**Flights**.

### 6. On the iPad

1. Open the Vercel address in **Safari**.
2. Tap the **Share** button → **Add to Home Screen**.
3. It now opens like an app, with its own icon and no browser bars.

Tap **Open in Outlook** to hand the finished mail to the Outlook app. For a
long message use **Copy body** and paste into Outlook instead — iOS truncates
very long `mailto:` links, and the app warns you when that is likely.

---

## If the deployment fails

**`Error: DATABASE_URL is not set` during the build**

The variable is missing, or it was added *after* the last deployment.
Environment variables are only picked up by a **new** build.

1. Vercel → your project → **Settings → Environment Variables**
2. Add `DATABASE_URL` with the Neon string
3. Tick **Production**, **Preview** *and* **Development** — Vercel keeps them
   separate, and a missing tick is the usual cause of this error coming back
4. **Deployments** → the most recent one → the **⋯** menu → **Redeploy**

**`password authentication failed` or `connection refused`**

The string was copied incompletely. Neon shows it in one line — take the whole
thing, including `?sslmode=require` at the end. In Neon use the connection
string **with a password shown**, not the one with `[YOUR-PASSWORD]` as a
placeholder.

**The site loads but says “Connect a database”**

The build succeeded without the variable. Follow the four steps above.

**The site loads but says “Finish the setup”**

Normal on a brand-new database. Press **Create the tables now**.

---

## Who can use it

There is **no login**. Anyone with the address can open it. That is fine for a
link shared inside a team, but keep in mind:

- do not post the address anywhere public
- the staff list and e-mail groups are visible to anyone who opens it
- Vercel gives you a URL that is hard to guess, not a secret

When you want to lock it down, the usual options are Vercel Password
Protection (a paid feature) or a simple shared-password page.

---

## Running it locally

```bash
npm install
cp .env.example .env        # then edit DATABASE_URL
npx drizzle-kit push        # create the tables
npm run dev                 # http://localhost:3000
```

---

## The Windows desktop app

Everything for it is in `desktop/`. It runs offline, stores its data in a file
beside the programme, and needs no database or internet.

```
cd desktop
build_exe.bat          # double-click on Windows
```

`desktop/README.txt` is the full manual. Its tests:

```bash
python3 desktop/tests/test_app.py           # behaviour
python3 desktop/tests/test_requirements.py  # every agreed feature
python3 desktop/ticket_mailer.py --selftest # the e-mail engine
```
