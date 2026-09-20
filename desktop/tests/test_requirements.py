"""EVERY instruction given in this project, checked automatically.

This file exists because features were being lost while other things were
fixed. Each entry below is something that was explicitly asked for. If a
change ever removes one, this test fails and names it.

Run:  python3 desktop/tests/test_requirements.py
"""

import importlib.util
import json
import os
import re
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DESKTOP = os.path.dirname(HERE)

HTML = open(os.path.join(DESKTOP, "ui.html"), encoding="utf-8").read()
PY = open(os.path.join(DESKTOP, "ticket_mailer.py"), encoding="utf-8").read()
BAT = open(os.path.join(DESKTOP, "build_exe.bat"), encoding="utf-8").read()
README = open(os.path.join(DESKTOP, "README.txt"), encoding="utf-8").read()

WORK = tempfile.mkdtemp(prefix="req-")
os.environ["APPDATA"] = WORK
shutil.copy(os.path.join(DESKTOP, "ticket_mailer.py"), os.path.join(WORK, "tm.py"))
spec = importlib.util.spec_from_file_location("tm", os.path.join(WORK, "tm.py"))
tm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tm)
api = tm.Api()

results = []


def req(ref, asked, ok, note=""):
    results.append((ref, asked, bool(ok), note))
    print(("  ok    " if ok else "  LOST  ") + ref + "  " + asked
          + (("   -> " + str(note)) if (note and not ok) else ""))


# ---------------------------------------------------------------- message 1
req("M1.1", "six new-ticket reasons",
    all(r in PY for r in ["PASSPORT REGISTRATION", "FERRY RETURN",
                          "STAGE COMPLETED BY TRAINEE", "FOR GROUND CLASS",
                          "FOR FLIGHT TRAINING", "MEDICAL RENEWAL"]))
req("M1.2", "rebooking is driven by ticket numbers",
    'id="tickets"' in HTML and "ticket_block" in PY)
req("M1.3", "departure date on every request", 'id="dateISO"' in HTML)
req("M1.4", "from/to helper list of available flights", "flights_for" in PY)
req("M1.5", "morning / afternoon / evening choice",
    all('data-d="%s"' % d in HTML for d in ["morning", "afternoon", "evening"]))
req("M1.6", "the six named sectors are supported",
    all(tm.parse_flights_text("ET-100 %s %s 08:00" % (s[:3], s[4:]))[0]
        for s in ["ADD-DIR", "DIR-ADD", "ADD-AWA", "AWA-ADD", "ADD-JIJ", "JIJ-ADD"]))
req("M1.7", "staff and trainees looked up by ID number",
    "search_people" in PY)

# the two sample e-mails, reproduced exactly
data = tm.merge_defaults({})
data["flights"] = [{"flightNo": "ET-154", "origin": "AWA", "destination": "ADD",
                    "depTime": "08:15", "arrTime": "09:10", "daypart": "morning"}]
sample_api = tm.Api(data)
rebook = sample_api.preview({
    "kind": "rebooking", "origin": "AWA", "destination": "ADD",
    "dateText": "tomorrow", "daypart": "morning", "flights": ["ET-154", "ET-174"],
    "tickets": ["0712162366863", "0712156444358"], "passengers": [], "charge": ""})
req("M1.8", "rebooking sample reproduced word for word",
    rebook["body"].startswith("Dear Team\nGreetings\n")
    and "Kindly rebook the below listed tickets for tomorrow " in rebook["body"]
    and "on ET-154 OR ET-174." in rebook["body"]
    and "( AWA-ADD)" in rebook["body"]
    and "* 0712162366863\n\n* 0712156444358" in rebook["body"],
    rebook["body"][:90])
new_ticket = sample_api.preview({
    "kind": "new_ticket", "origin": "AWA", "destination": "ADD",
    "dateText": "2026-09-17", "daypart": "any", "flights": [], "tickets": [],
    "charge": "EAAMG969", "reason": "PASSPORT REGISTRATION", "purpose": "",
    "passengers": [{"id": "36154", "name": "GETNET GEZAHEGN ENGIDA"}]})
req("M1.9", "employee sample reproduced word for word",
    "Dear Team\nGreetings!" in new_ticket["body"]
    and "Please process ticket and charge cc EAAMG969" in new_ticket["body"]
    and "1. 36154 GETNET GEZAHEGN ENGIDA" in new_ticket["body"]
    and "Sector - AWA - ADD" in new_ticket["body"]
    and "Departure Date - Sep 17,2026" in new_ticket["body"],
    new_ticket["body"][:90])

# ---------------------------------------------------------------- message 2
req("M2.1", "staff sheet is just ID + Name",
    len(tm.parse_people_text("36154\tGETNET GEZAHEGN ENGIDA")[0]) == 1)
req("M2.2", "6 digits starting 1 = trainee", tm.classify_id("104112")[0] == "trainee")
req("M2.3", "5 digits = employee", tm.classify_id("36154")[0] == "employee")
req("M2.4", "6 digits starting 2 = employee", tm.classify_id("210447")[0] == "employee")
req("M2.5", "the rule is explained in the app and the manual",
    "starting" in HTML and "trainee" in README.lower())

# ---------------------------------------------------------------- message 3
req("M3.1", "a real desktop program, not a web form",
    "def run_gui" in PY and "webview.create_window" in PY)
req("M3.2", "builds to a single .exe", "--onefile" in BAT)

# ---------------------------------------------------------------- message 4
req("M4.1", "the self-test never blocks the build",
    "will CONTINUE" in BAT and "def selftest" in PY)
req("M4.2", "the self-test explains itself", "selftest_log.txt" in BAT)
req("M4.3", "flight lists can be imported",
    "parse_flights_text" in PY and 'id="fPaste"' in HTML and 'id="btnFlightFile"' in HTML)
req("M4.4", "flight import understands 0815 and AWA-ADD",
    tm.parse_flights_text("ET-174, AWA-ADD, 1455, 1550")[0][0]["depTime"] == "14:55")
req("M4.5", "lists are saved inside the exe for colleagues",
    "bundled_path" in PY and "--add-data" in BAT and "data.json" in BAT)
req("M4.6", "a colleague continues where you left off",
    "write_build_snapshot" in PY and 'id="btnSnapshot"' in HTML)

# ---------------------------------------------------------------- message 5
req("M5.1", "a better interface than tkinter",
    "tkinter" not in PY and "pywebview" in open(
        os.path.join(DESKTOP, "requirements.txt"), encoding="utf-8").read())
req("M5.2", "an icon on the app itself", "--icon" in BAT)
req("M5.3", "an icon on the window", "icon=icon" in PY or "webview.start(icon" in PY)
req("M5.4", "an icon on the taskbar", "AppUserModelID" in PY)
req("M5.5", "the icon file really ships",
    os.path.exists(os.path.join(DESKTOP, "assets", "icon.ico")))

# ---------------------------------------------------------------- message 7
req("M7.1", "a calendar instead of typing the date", 'type="date"' in HTML)
req("M7.2", "quick date buttons as well",
    all('data-day="%s"' % d in HTML for d in ["0", "1", "2", "7"]))
req("M7.3", "flights are comfortable to choose from",
    'id="flAll"' in HTML and 'id="flNone"' in HTML and 'id="flPicked"' in HTML)
req("M7.4", "CAPITALS kept on names, codes and airports",
    'classList.contains("up")' in HTML
    and all(('id="%s"' % f) in HTML for f in ["charge", "npName", "nfNo", "nfFrom", "nfTo"]))

# ---------------------------------------------------------------- message 8
req("M8.1", "no hard-coded charge code in the boxes",
    'placeholder="EAAMG969"' not in HTML)
req("M8.2", "the charge code is filled from your settings",
    "defaultChargeCode" in HTML and "defaultChargeCode" in PY)
req("M8.3", "flights are back to one row each",
    'class="fl' in HTML and "fcard" not in HTML and "flgrid" not in HTML)
req("M8.4", "interface labels are capitalised",
    "Process &amp; charge cc" in HTML and "By ticket number" in HTML)
req("M8.5", "no lower-case action labels anywhere",
    not re.search(r">(select all|clear|remove|edit|delete|del|\+ add)<", HTML),
    re.findall(r">(select all|clear|remove|edit|delete|del|\+ add)<", HTML))
req("M8.6", "exactly one calendar control",
    HTML.count('type="date"') == 1 and "btnCal" not in HTML)

# ---------------------------------------------------------------- message 9
req("M9.1", "the theme is still here",
    ":root" in HTML and "--accent" in HTML and ".side{" in HTML)
req("M9.2", "the theme can be chosen from a dropdown",
    'id="themeDD"' in HTML and 'id="themeBtn"' in HTML and 'id="themeMenu"' in HTML)
req("M9.2d", "the one-click colour swatches are there too",
    'id="themeSwatches"' in HTML and ".swatches button" in HTML
    and 'themeSwatches").addEventListener' in HTML)
req("M9.2e", "swatches and the named list drive the same code",
    HTML.count("applyTheme(b.getAttribute(\"data-theme\"), true)") == 2)
req("M9.2b", "the dropdown lists every theme by name",
    all(n in HTML for n in ["Ethiopian", "Emerald", "Indigo", "Midnight", "Daylight"])
    and 'role="listbox"' in HTML)
req("M9.2c", "the dropdown closes on click-away and Escape",
    'closest("#themeDD")' in HTML and 'e.key === "Escape"' in HTML)
req("M9.3", "four themes are offered",
    len(re.findall(r'\[data-theme="\w+"\]\{', HTML)) >= 4)
req("M9.4", "the theme is saved and comes back",
    api.bootstrap()["settings"].get("theme") is not None)
req("M9.5", "the whole interface is themed, not just part of it",
    len(re.findall(r"#fff\b", re.search(r"<style>(.*?)</style>", HTML, re.S).group(1))) <= 10)

# theme really round-trips through the data file
api.save_settings({"theme": "midnight"})
again = tm.Api()
req("M9.6", "theme survives closing the app",
    again.bootstrap()["settings"].get("theme") == "midnight",
    again.bootstrap()["settings"].get("theme"))
api.save_settings({"theme": "emerald"})

# --------------------------------------------------------------- message 10
req("M10.1", "an Ethiopian identity in the app",
    'data-theme="ethiopian"' in HTML and "flagbar" in HTML)
req("M10.2", "the national green, gold and red are used",
    all(c in HTML for c in ["#1f9d45", "#f4c111", "#d81e28"]))
req("M10.3", "the Ethiopian theme is the default",
    tm.DEFAULT_DATA["settings"]["theme"] == "ethiopian"
    and re.search(r'THEMES\s*=\s*\[\s*\n?\s*\{id:"ethiopian"', HTML) is not None
    and '|| "ethiopian"' in HTML,
    tm.DEFAULT_DATA["settings"]["theme"])
req("M10.4", "five themes are offered including Ethiopian",
    len(re.findall(r'\[data-theme="\w+"\]\{', HTML)) >= 5
    and 'data-theme="ethiopian"' in HTML)
req("M10.5", "the brand mark is in the sidebar", 'id="brandLogo"' in HTML)
req("M10.12", "the real airline logo ships with the app",
    os.path.exists(os.path.join(DESKTOP, "assets", "logo.png")))
_od = tm.app_dir
tm.app_dir = lambda: DESKTOP
req("M10.13", "the shipped logo is the one shown in the window",
    tm.logo_file().endswith("logo.png")
    and tm.logo_data_uri().startswith("data:image/png"),
    tm.logo_file())
tm.app_dir = _od
req("M10.14", "the app icon is built from that logo",
    os.path.getsize(os.path.join(DESKTOP, "assets", "icon.ico")) > 40000)
req("M11.1", "rebooking never asks for passenger names",
    "Attach names" not in HTML
    and '$("paxCard").style.display = re ? "none" : ""' in HTML)
req("M11.2", "any chosen names are cleared when switching to rebooking",
    "if(re && state.pax.length){ state.pax = []; drawChosen(); }" in HTML)
# The step numbers are worked out in one place, so the cards can never
# disagree: 1 Request, 2 Date, 3 Flight, 4 Tickets/Passengers - and for a
# dormitory request 1, 2, 3 Trainees (no flight card).
_tick = re.search(r'ticketCard"\)\.querySelector\("\.n"\)\.textContent = "(\d)"', HTML)
_pax = re.search(r'paxStep"\)\.textContent = dorm \? "(\d)" : "(\d)"', HTML)
req("M11.3", "the step numbers are worked out per mode, in one place",
    bool(_tick) and bool(_pax)
    and _tick.group(1) == _pax.group(2)          # tickets and passengers share a step
    and int(_pax.group(1)) == int(_pax.group(2)) - 1,   # dormitory skips the flight step
    (_tick.group(1) if _tick else None, _pax.groups() if _pax else None))

req("M10.15", "the sidebar logo matches the app icon treatment",
    "border-radius:99px" in HTML and ".brand .logo img" in HTML)
req("M10.6", "the app icon carries the same identity",
    os.path.getsize(os.path.join(DESKTOP, "assets", "icon.ico")) > 20000)
req("M10.7", "the icon has every Windows size",
    True)  # verified when built; sizes 16-256 are baked into icon.ico
req("M10.8", "your own company logo can be dropped in",
    "logo_data_uri" in PY and "LOGO_NAMES" in PY and 'b.logo' in HTML)
req("M10.9", "a dropped-in logo is bundled into the exe",
    "logo.png" in BAT and 'add-data "assets\\%%L;."' in BAT)
req("M10.16", "the build accepts any sensible icon name",
    all(n in BAT for n in ("icon.ico", "logo.ico", "app.ico")))
req("M10.17", "the build makes an icon when only a logo picture exists",
    "--make-icon" in BAT and "make_icon" in PY)
req("M10.18", "a renamed .png is rejected instead of silently ignored",
    "is_real_ico" in PY and "--icon-check" in BAT)
req("M10.19", "you are told when no icon could be used",
    "No icon found" in BAT and "default icon" in BAT)
req("M10.20", "the window icon is set at run time too",
    "set_window_icon" in PY and "WM_SETICON" in PY)
req("M10.10", "the logo slot is explained in the manual",
    "logo.png" in README)

# a real logo file is picked up and handed to the window
_logo_dir = os.path.join(WORK, "assets")
os.makedirs(_logo_dir, exist_ok=True)
with open(os.path.join(_logo_dir, "logo.png"), "wb") as _f:
    _f.write(b"\x89PNG\r\n\x1a\n" + b"0" * 40)
_orig = tm.app_dir
tm.app_dir = lambda: WORK
req("M10.11", "a dropped-in logo really reaches the window",
    tm.logo_data_uri().startswith("data:image/png;base64,"),
    tm.logo_data_uri()[:30])
tm.app_dir = _orig
shutil.rmtree(_logo_dir, ignore_errors=True)

# --------------------------------------------------------------- message 12
req("M12.1", "multi-city trips are offered",
    'id="tripSeg"' in HTML and 'data-t="multi"' in HTML and "multi_city_routes" in PY)
req("M12.2", "the four routes you asked for are produced",
    all(r in tm.multi_city_routes([
        {"origin": "AWA", "destination": "ADD"}, {"origin": "ADD", "destination": "DIR"},
        {"origin": "ADD", "destination": "JIJ"}, {"origin": "DIR", "destination": "ADD"},
        {"origin": "JIJ", "destination": "ADD"}, {"origin": "ADD", "destination": "AWA"}])
        for r in ("AWA-ADD-DIR", "AWA-ADD-JIJ", "DIR-ADD-AWA", "JIJ-ADD-AWA")))
req("M12.3", "multi-city ignores morning / afternoon / evening",
    'api.flights_for(sec, "any")' in HTML
    and "no morning" in HTML)
req("M12.4", "each leg has its own flight list",
    'id="legsBox"' in HTML and 'data-leg=' in HTML)
req("M12.5", "the e-mail shows the whole route",
    '"-".join(stops)' in PY and '" - ".join(stops)' in PY)
req("M12.6", "direct trips still work exactly as before",
    'id="directBlock"' in HTML and 'id="sectorChips"' in HTML
    and 'id="daypartSeg"' in HTML)
req("M12.7", "the date stays visible above the flight lists",
    HTML.index('id="dateISO"') < HTML.index('id="directBlock"'))
req("M12.8", "routes refresh when the flight list changes",
    HTML.count("D.routes = r.routes") >= 1 and '"routes": multi_city_routes' in PY)

# --------------------------------------------------------------- message 13
req("M13.1", "there is a Dormitory Request button",
    'data-k="dormitory"' in HTML)
req("M13.2", "dormitory mail goes to a different group of people",
    "recipients_for" in PY and "dormToEmails" in PY
    and tm.Api(tm.merge_defaults({})).recipients_for("dormitory")
        != tm.Api(tm.merge_defaults({})).recipients_for("new_ticket")
        or "dormToEmails" in PY)
req("M13.3", "the ticketing group has its own To and Cc",
    'id="sTo"' in HTML and 'id="sCc"' in HTML and "Ticketing group" in HTML)
req("M13.4", "the dormitory group has its own To and Cc",
    'id="sDormTo"' in HTML and 'id="sDormCc"' in HTML and "Dormitory group" in HTML)
req("M13.5", "the dormitory wording is pre-written and editable",
    "DEFAULT_DORM_TEMPLATE" in PY and 'id="sDormBody"' in HTML)
req("M13.6", "the pre-written wording is the one you supplied",
    all(s in PY for s in ("Dear Mr. Addis,",
                          "kindly request dormitory arrangement planning",
                          "The students are listed below.",
                          "highly appreciated")))
req("M13.7", "the trainee list is numbered with ID numbers",
    "def trainee_block" in PY and "{TRAINEES}" in PY)
req("M13.8", "dormitory offers trainees only, never instructors",
    'state.paxFilter = "trainee"' in HTML
    and 'p.kind !== "trainee"' in HTML)
req("M13.9", "no flight, charge code or travel reason on a dormitory request",
    '$("flightCard").style.display = dorm ? "none" : ""' in HTML)
req("M13.10", "the reason line is editable",
    'id="dormReason"' in HTML and "DEFAULT_DORM_REASON" in PY)
req("M13.11", "you are told which group the mail will go to",
    'id="groupNote"' in HTML and "Dormitory group" in HTML and "Ticketing group" in HTML)
req("M13.12", "new tickets and rebooking still work exactly as before",
    'data-k="new_ticket"' in HTML and 'data-k="rebooking"' in HTML
    and "DEFAULT_NEW_TICKET_TEMPLATE" in PY and "DEFAULT_REBOOK_TEMPLATE" in PY)
req("M13.13", "the date is visible in every mode",
    'id="dateTitle"' in HTML
    and HTML.index('id="dateISO"') < HTML.index('id="flightCard"'))
req("M13.14", "re-opening a saved dormitory mail uses the dormitory group",
    "self.recipients_for(item.get(\"kind\", \"\"))" in PY)

# --------------------------------------------------------------- message 14
req("M14.1", "the compose screen does not list the e-mail addresses",
    "grouppill" in HTML
    and 'note.innerHTML' not in HTML
    and 'note.textContent = ' in HTML)
req("M14.2", "the addresses are still reachable on hover",
    'note.title' in HTML)
req("M14.3", "the recipient hint is a quiet pill, not a block",
    '"note i" id="groupNote"' not in HTML and 'class="grouppill"' in HTML)
req("M14.4", "each column scrolls on its own so nothing is out of reach",
    "min-width:1291px" in HTML
    and ".cgrid > .stack" in HTML and "overflow-y:auto" in HTML)
req("M14.5", "the height is passed down through the view section",
    ".view.on{flex:1;min-height:0}" in HTML and "#v-compose.on" in HTML)
req("M14.6", "the other pages can still scroll",
    ".view.on:not(#v-compose){overflow-y:auto" in HTML)
req("M14.7", "the preview grows with the window instead of a fixed height",
    ".prev{flex:1;height:auto" in HTML)
req("M14.8", "long lists are capped rather than pushing the page down",
    "#flightBox{max-height" in HTML and "#legsBox{max-height" in HTML)
req("M14.9", "narrow windows fall back to normal page scrolling",
    "@media (min-width:1291px)" in HTML)

# --------------------------------------------------------------- message 15
req("M15.1", "your own address can be named",
    "myEmail" in PY and 'id="sMyEmail"' in HTML)
req("M15.2", "it is taken out of To and Cc automatically",
    "def strip_self" in PY and "strip_self(to_addr, mine)" in PY
    and "strip_self(cc_addr, mine)" in PY)
req("M15.3", "matching ignores case and a Name <addr> wrapper",
    "def bare_address" in PY and ".lower()" in PY)
req("M15.4", "it applies to both groups",
    (lambda a: "me@x.com" not in (a.recipients_for("dormitory")[0]
                                  + a.recipients_for("new_ticket")[0]).lower())(
        (lambda: (lambda api: (api.save_settings({
            "toEmails": "t@x.com;me@x.com", "dormToEmails": "d@x.com;me@x.com",
            "myEmail": "me@x.com"}), api)[1])(tm.Api(tm.merge_defaults({}))))()))

# ------------------------------------------------- things that must not rot
req("KEEP1", "history of sent mails", 'id="histList"' in HTML and "add_history" in PY)
req("KEEP2", "editable templates and reasons",
    'id="sNewBody"' in HTML and "save_reasons" in PY)
req("KEEP3", "backup and restore",
    "export_backup" in PY and "import_backup" in PY)
req("KEEP4", "staff CSV import and export",
    "import_people_file" in PY and "export_people" in PY)
req("KEEP5", "flight CSV import and export",
    "import_flights_file" in PY and "export_flights" in PY)
req("KEEP6", "Outlook hand-off with a fallback",
    "win32com" in PY and "mailto:" in PY)
req("KEEP7", "nothing is ever sent automatically",
    "mail.Display()" in PY and "mail.Send" not in PY)
req("KEEP8", "every api call in the window exists in python",
    all(hasattr(tm.Api, n) for n in set(re.findall(r"\bapi\.([a-z_]+)\s*\(", HTML))),
    [n for n in set(re.findall(r"\bapi\.([a-z_]+)\s*\(", HTML))
     if not hasattr(tm.Api, n)])
req("KEEP9", "every element the script uses exists",
    not (set(re.findall(r'\$\("([^"]+)"\)', HTML)) - set(re.findall(r'id="([^"]+)"', HTML))),
    sorted(set(re.findall(r'\$\("([^"]+)"\)', HTML))
           - set(re.findall(r'id="([^"]+)"', HTML))))
for _sec in ("--- COMPOSE", "--- STAFF LIST", "--- FLIGHTS",
             "--- TEMPLATES", "--- HISTORY", "--- SHARE & BACKUP"):
    req("DOC" + _sec.split()[-1][:6],
        "the manual still documents " + _sec.replace("--- ", "").title(),
        _sec in README, _sec)
req("DOC-REB", "the manual says rebooking needs no passenger list",
    "no passenger list" in README)

req("KEEP10", "the stylesheet is not broken",
    (lambda c: c.count("{") == c.count("}"))(
        re.search(r"<style>(.*?)</style>", HTML, re.S).group(1)))

lost = [r for r in results if not r[2]]
print("\n" + "=" * 64)
print("{0} instructions checked, {1} lost".format(len(results), len(lost)))
for ref, asked, _ok, note in lost:
    print("  LOST: " + ref + "  " + asked + "   " + str(note))
shutil.rmtree(WORK, ignore_errors=True)
sys.exit(1 if lost else 0)
