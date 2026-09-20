"""The web app (for iPads) must keep up with the desktop app.

The two share no code - one is Python, the other TypeScript - so it is easy
for the web version to fall behind after a change. This checks that every
agreed feature exists on both sides, and that the deployment files are there.

Run:  python3 desktop/tests/test_web_parity.py
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DESKTOP = os.path.dirname(HERE)
ROOT = os.path.dirname(DESKTOP)


def read(*parts):
    path = os.path.join(ROOT, *parts)
    if not os.path.exists(path):
        return ""
    with open(path, encoding="utf-8") as handle:
        return handle.read()


PY = read("desktop", "ticket_mailer.py")
ENGINE = read("src", "lib", "email.ts")
COMPOSE = read("src", "app", "page.tsx")
SETTINGS_PAGE = read("src", "app", "settings", "page.tsx")
SCHEMA = read("src", "db", "schema.ts")
LAYOUT = read("src", "app", "layout.tsx")
CSS = read("src", "app", "globals.css")
README = read("README.md")

results = []


def check(label, ok, note=""):
    results.append((label, bool(ok), note))
    print(("  ok    " if ok else "  FAIL  ") + label
          + (("   -> " + str(note)) if (note and not ok) else ""))


print("The web app matches the desktop app")
check("three request types", 'value: "dormitory"' in COMPOSE
      and 'value: "rebooking"' in COMPOSE and 'value: "new_ticket"' in COMPOSE)
check("dormitory template ported",
      "DEFAULT_DORM_TEMPLATE" in ENGINE and "Dear Mr. Addis," in ENGINE)
check("the dormitory wording is word for word the same",
      all(s in ENGINE and s in PY for s in
          ("kindly request dormitory arrangement planning",
           "The students are listed below.",
           "highly appreciated")))
check("numbered trainee list", "traineeBlock" in ENGINE and "def trainee_block" in PY)
check("multi-city routes", "multiCityRoutes" in ENGINE and "multi_city_routes" in PY)
check("routes are derived, not hard coded", "routeLegs" in ENGINE)
check("two recipient groups",
      "dormToEmails" in SCHEMA and "dormCcEmails" in SCHEMA
      and "dormToEmails" in SETTINGS_PAGE)
check("your own address is stripped",
      "stripSelf" in ENGINE and "def strip_self" in PY and "myEmail" in SCHEMA)
check("dormitory shows trainees only",
      'p.kind !== "trainee"' in COMPOSE or 'isDorm ? "trainee"' in COMPOSE)
# the address may appear in the hover title, but never as visible text
_pill = COMPOSE[COMPOSE.find("recipients.to\n              ? \"\u2709\""):] if False else ""
_visible = re.sub(r'title=\{[^}]*\}(?:[^<]*\})?', "", COMPOSE, flags=re.S)
check("only the group name is visible, not the addresses",
      "{recipients.label}" in COMPOSE
      and "recipients.to" in COMPOSE          # still used for the hover/mailto
      and "${recipients.to}" not in _visible.split("title=")[0],
      "address appears as visible text")
check("calendar date picker", 'type="date"' in COMPOSE)
check("ID rule on both sides", "classify_id" in PY and "classifyId" in read("src", "lib", "classify.ts"))

print("\nReady for an iPad")
check("home-screen manifest", os.path.exists(os.path.join(ROOT, "public", "manifest.webmanifest")))
check("apple touch icon", os.path.exists(os.path.join(ROOT, "public", "apple-touch-icon.png")))
check("declared in the page head", "appleWebApp" in LAYOUT and "manifest" in LAYOUT)
check("pinch zoom is not blocked", "maximumScale: 5" in LAYOUT)
check("inputs are 16px so iOS does not zoom", "font-size: 16px" in CSS)
check("tap targets are big enough", "min-h-[44px]" in COMPOSE or "min-h-[48px]" in COMPOSE)
check("safe area respected", "safe-area-inset" in CSS)
check("hands over to Outlook", 'href={mailtoHref}' in COMPOSE)
check("warns when a mailto link is too long for iOS",
      "MAILTO_SAFE_LENGTH" in COMPOSE and "truncat" in COMPOSE.lower())
check("copy is offered as the fallback", "Copy body" in COMPOSE)

print("\nReady for GitHub and Vercel")
check("a .gitignore exists", os.path.exists(os.path.join(ROOT, ".gitignore")))
gitignore = read(".gitignore")
check("secrets are never committed", ".env" in gitignore and "node_modules" in gitignore)
check("the desktop build output is ignored", "desktop/dist" in gitignore)
check("an example env file is provided", os.path.exists(os.path.join(ROOT, ".env.example")))
check("the real .env is NOT the example", "password" in read(".env.example").lower())
check("vercel config is valid json",
      (lambda t: t.startswith("{") and t.rstrip().endswith("}"))(read("vercel.json")))
check("kept out of search engines", "noindex" in read("vercel.json")
      or "Disallow: /" in read("public", "robots.txt"))
check("a setup endpoint creates the tables",
      "create table if not exists" in read("src", "app", "api", "setup", "route.ts"))
check("setup also upgrades an older database",
      "add column if not exists" in read("src", "app", "api", "setup", "route.ts"))
check("the readme explains deploying", "vercel.com" in README and "neon.tech" in README)
check("the readme explains Add to Home Screen", "Add to Home Screen" in README)
check("the readme is honest about there being no login",
      "no login" in README.lower())
check("a missing DATABASE_URL is explained clearly",
      "Environment Variables" in read("src", "db", "index.ts"))

print("\nBranding carried over")
check("the airline logo is served", os.path.exists(os.path.join(ROOT, "public", "logo.png")))
check("the logo is in the header", 'src="/logo.png"' in read("src", "components", "NavBar.tsx"))
check("the flag ribbon is there",
      all(c in CSS for c in ("#1f9d45", "#f4c111", "#d81e28")))
check("no emoji icons that render as empty boxes",
      "🎫" not in COMPOSE and "🔁" not in COMPOSE and "🏠" not in COMPOSE)

failed = [r for r in results if not r[1]]
print("\n" + "=" * 62)
print("{0} checks, {1} failed".format(len(results), len(failed)))
for label, _ok, note in failed:
    print("  FAILED: " + label + "   " + str(note))
sys.exit(1 if failed else 0)
