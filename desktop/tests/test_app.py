"""Headless test of the desktop app.

Part 1 - drives the Api class exactly as the window does (no window needed).
Part 2 - checks every api.<name>(...) call in ui.html really exists in Python
         with a compatible number of arguments. That is the contract between
         the interface and the logic, and the easiest thing to break.

Run:  python3 desktop/tests/test_app.py
"""

import importlib.util
import inspect
import json
import os
import re
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
DESKTOP = os.path.dirname(HERE)

WORKDIR = tempfile.mkdtemp(prefix="tm-test-")
os.environ["APPDATA"] = WORKDIR
shutil.copy(os.path.join(DESKTOP, "ticket_mailer.py"),
            os.path.join(WORKDIR, "ticket_mailer.py"))

SEED = {
    "settings": {
        "defaultChargeCode": "EAAMG969", "toEmails": "ticketing@example.com",
        "ccEmails": "", "signOff": "Best regards,", "signature": "",
    },
    "reasons": [
        {"label": "PASSPORT REGISTRATION",
         "purposeLine": "The above listed is traveling for passport registration."},
        {"label": "FOR GROUND CLASS",
         "purposeLine": "The above listed is traveling to attend ground class."},
    ],
    "flights": [
        {"flightNo": "ET-154", "origin": "AWA", "destination": "ADD",
         "depTime": "08:15", "arrTime": "09:10", "daypart": "morning"},
        {"flightNo": "ET-174", "origin": "AWA", "destination": "ADD",
         "depTime": "14:55", "arrTime": "15:50", "daypart": "afternoon"},
        {"flightNo": "ET-153", "origin": "ADD", "destination": "AWA",
         "depTime": "06:50", "arrTime": "07:45", "daypart": "morning"},
    ],
    "people": [
        {"id": "36154", "name": "GETNET GEZAHEGN ENGIDA", "kind": "employee"},
        {"id": "104112", "name": "NATNAEL BIRHANU ASSEFA", "kind": "trainee"},
    ],
    "history": [],
}
with open(os.path.join(WORKDIR, "data.json"), "w", encoding="utf-8") as handle:
    json.dump(SEED, handle)

spec = importlib.util.spec_from_file_location(
    "ticket_mailer", os.path.join(WORKDIR, "ticket_mailer.py"))
tm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tm)

checks = []


def check(label, condition, extra=""):
    checks.append((label, bool(condition), extra))
    print(("  ok    " if condition else "  FAIL  ") + label +
          (("   " + str(extra)) if (extra and not condition) else ""))


# ======================================================================
print("Start-up")
api = tm.Api()
boot = api.bootstrap()
check("data.json picked up", len(boot["people"]) == 2 and len(boot["flights"]) == 3,
      (len(boot["people"]), len(boot["flights"])))
check("sectors built", boot["sectors"] == ["ADD-AWA", "AWA-ADD"], boot["sectors"])
check("reasons passed to the window", len(boot["reasons"]) == 2)
check("data path reported", bool(boot["dataPath"]))
check("tomorrow supplied", bool(boot["tomorrow"]))
check("app version sent", boot["version"] == tm.APP_VERSION)

print("\nCompose - rebooking")
rebook = api.preview({
    "kind": "rebooking", "origin": "AWA", "destination": "ADD",
    "dateText": "tomorrow", "daypart": "morning",
    "flights": ["ET-154", "ET-174"],
    "tickets": ["0712162366863", "0712156444358"],
    "passengers": [], "charge": "EAAMG969"})
print(rebook["body"])
check("greeting", rebook["body"].startswith("Dear Team\nGreetings\n"))
check("tomorrow wording", "tickets for tomorrow " in rebook["body"])
check("flights joined with OR", "on ET-154 OR ET-174." in rebook["body"])
check("sector line", "( AWA-ADD)" in rebook["body"])
check("ticket spacing", "* 0712162366863\n\n* 0712156444358" in rebook["body"])
check("subject", rebook["subject"].startswith("Rebooking Request | AWA-ADD | "),
      rebook["subject"])
check("date label", rebook["dateLabel"].startswith("tomorrow "), rebook["dateLabel"])
check("date accepted", rebook["dateOk"] is True)

print("\nCompose - new ticket")
new_ticket = api.preview({
    "kind": "new_ticket", "origin": "AWA", "destination": "ADD",
    "dateText": "2026-09-17", "daypart": "any", "flights": [], "tickets": [],
    "charge": "EAAMG969", "reason": "PASSPORT REGISTRATION",
    "purpose": SEED["reasons"][0]["purposeLine"],
    "passengers": [{"id": "36154", "name": "GETNET GEZAHEGN ENGIDA"}]})
check("charge line", "Please process ticket and charge cc EAAMG969" in new_ticket["body"])
check("numbered passenger", "1. 36154 GETNET GEZAHEGN ENGIDA" in new_ticket["body"])
check("sector spaced", "Sector - AWA - ADD" in new_ticket["body"])
check("departure date", "Departure Date - Sep 17,2026" in new_ticket["body"])
check("purpose sentence", "passport registration" in new_ticket["body"])
check("subject carries the reason",
      new_ticket["subject"] == "Ticket Request | PASSPORT REGISTRATION | AWA-ADD | Sep 17,2026",
      new_ticket["subject"])
bad = api.preview({"kind": "new_ticket", "dateText": "nonsense", "flights": [],
                   "tickets": [], "passengers": []})
check("bad date flagged", bad["dateOk"] is False and "not understood" in bad["dateLabel"])

print("\nFlight picker")
check("sector filter", [f["flightNo"] for f in api.flights_for("AWA-ADD", "any")]
      == ["ET-154", "ET-174"])
check("morning filter", [f["flightNo"] for f in api.flights_for("AWA-ADD", "morning")]
      == ["ET-154"])
check("other direction", [f["flightNo"] for f in api.flights_for("ADD-AWA", "any")]
      == ["ET-153"])

print("\nPassenger search")
check("by ID", [p["name"] for p in api.search_people("36154", "all")]
      == ["GETNET GEZAHEGN ENGIDA"])
check("by part of a name", len(api.search_people("natnael", "all")) == 1)
check("trainees only", [p["id"] for p in api.search_people("", "trainee")] == ["104112"])

print("\nStaff list")
res = api.import_people("36154\tGETNET GEZAHEGN ENGIDA\n"
                        "154902 ABEL TSEGAYE MARU\n"
                        "205118,SARA WORKU TILAHUN\n"
                        "109443  MARTA DEREJE BEKELE")
check("import reports counts", res["ok"] and res["added"] == 3 and res["updated"] == 1,
      (res.get("added"), res.get("updated")))
kinds = {p["id"]: p["kind"] for p in res["people"]}
check("154902 -> trainee", kinds.get("154902") == "trainee", kinds)
check("205118 -> employee", kinds.get("205118") == "employee", kinds)
check("109443 -> trainee", kinds.get("109443") == "trainee", kinds)
check("no duplicate for 36154",
      len([p for p in res["people"] if p["id"] == "36154"]) == 1)
check("header row ignored",
      api.import_people("ID,NAME,TYPE\n300001,HEADER TEST NAME,employee")["added"] == 1)
saved = api.save_person({"id": "223016", "name": "tigist assefa mengesha"})
check("single person saved uppercase",
      any(p["name"] == "TIGIST ASSEFA MENGESHA" for p in saved["people"]))
check("kind derived from the ID", saved["kind"] == "employee")
check("empty name rejected", api.save_person({"id": "1", "name": ""})["ok"] is False)
removed = api.delete_person("223016", "TIGIST ASSEFA MENGESHA")
check("person deleted", removed["removed"] == 1)
check("bad paste rejected", api.import_people("~~~")["ok"] is False)

print("\nFlights")
res = api.import_flights("FLIGHT,FROM,TO,DEP,ARR\n"
                         "ET-121  ADD  DIR  06:30  07:35\n"
                         "ET-126, DIR-ADD, 1435, 1540\n"
                         "ET-149\tADD\tJIJ\t17:30\t18:50\n"
                         "rubbish line")
check("flights imported", res["ok"] and res["added"] == 3, res.get("added"))
check("bad line skipped", res["skipped"] == ["rubbish line"], res["skipped"])
fl = {f["flightNo"]: f for f in res["flights"]}
check("sector written as DIR-ADD parsed",
      fl["ET-126"]["origin"] == "DIR" and fl["ET-126"]["destination"] == "ADD")
check("1435 -> 14:35", fl["ET-126"]["depTime"] == "14:35", fl["ET-126"])
check("evening derived", fl["ET-149"]["daypart"] == "evening")
check("header row ignored", "FLIGHT" not in fl)
check("new sectors offered", "ADD-DIR" in res["sectors"] and "ADD-JIJ" in res["sectors"])
again = api.import_flights("ET-121  ADD  DIR  06:30  07:35")
check("re-import updates, never duplicates",
      again["added"] == 0 and again["updated"] == 1,
      (again["added"], again["updated"]))
one = api.save_flight({"flightNo": "et-198", "origin": "awa", "destination": "add",
                       "depTime": "1905", "arrTime": "2000"})
new_flight = [f for f in one["flights"] if f["flightNo"] == "ET-198"][0]
check("flight number upper-cased", new_flight["flightNo"] == "ET-198")
check("airports upper-cased", new_flight["origin"] == "AWA")
check("time tidied", new_flight["depTime"] == "19:05", new_flight)
check("daypart from the time", new_flight["daypart"] == "evening")
check("incomplete flight rejected",
      api.save_flight({"flightNo": "ET-1"})["ok"] is False)
check("flight deleted",
      api.delete_flight("ET-198", "AWA", "ADD")["removed"] == 1)
check("bad flight paste rejected", api.import_flights("hello")["ok"] is False)

print("\nCAPITALS are enforced everywhere")
lower = api.preview({
    "kind": "new_ticket", "origin": "awa", "destination": "add",
    "dateText": "2026-09-17", "daypart": "any", "flights": [], "tickets": [],
    "charge": "eaamg969", "reason": "PASSPORT REGISTRATION", "purpose": "",
    "passengers": [{"id": "36154", "name": "getnet gezahegn engida"}]})
check("charge code forced to CAPS", "charge cc EAAMG969" in lower["body"],
      [l for l in lower["body"].split("\n") if "charge" in l])
check("passenger name forced to CAPS",
      "1. 36154 GETNET GEZAHEGN ENGIDA" in lower["body"])
check("sector forced to CAPS", "Sector - AWA - ADD" in lower["body"])
check("subject sector in CAPS", "| AWA-ADD |" in lower["subject"], lower["subject"])
cs = api.save_settings({"defaultChargeCode": " eaamg971 "})
check("default charge code stored in CAPS",
      cs["settings"]["defaultChargeCode"] == "EAAMG971",
      cs["settings"]["defaultChargeCode"])
api.save_settings({"defaultChargeCode": "EAAMG969"})
lf = api.save_flight({"flightNo": "et-777", "origin": "awa", "destination": "dir",
                      "depTime": "09:00"})
made = [f for f in lf["flights"] if f["flightNo"] == "ET-777"][0]
check("flight number stored in CAPS", made["flightNo"] == "ET-777")
check("airports stored in CAPS", made["origin"] == "AWA" and made["destination"] == "DIR")
api.delete_flight("ET-777", "AWA", "DIR")
lp = api.save_person({"id": "36999", "name": "abebe kebede tadesse"})
check("typed name stored in CAPS",
      any(p["name"] == "ABEBE KEBEDE TADESSE" for p in lp["people"]))
api.delete_person("36999", "ABEBE KEBEDE TADESSE")
lip = api.import_people("37111, samuel bekele girma")
check("pasted name stored in CAPS",
      any(p["name"] == "SAMUEL BEKELE GIRMA" for p in lip["people"]))
check("reason label stored in CAPS",
      api.save_reasons([{"label": "ferry return", "purposeLine": "x"}]
                       )["reasons"][0]["label"] == "FERRY RETURN")

print("\nThe calendar feeds the date")
cal = api.preview({"kind": "rebooking", "origin": "AWA", "destination": "ADD",
                   "dateText": "2026-09-18", "flights": [], "tickets": ["1"],
                   "passengers": []})
check("ISO date from the picker accepted", cal["dateOk"] is True)
check("written in house style", "Sep 18,2026" in cal["body"], cal["body"])

print("\nTemplates and reasons")
api.save_settings({"signature": "Training Coordination", "defaultChargeCode": "EAAMG970"})
signed = api.preview({"kind": "rebooking", "origin": "AWA", "destination": "ADD",
                      "dateText": "tomorrow", "flights": [], "tickets": ["123"],
                      "passengers": []})
check("signature reaches the mail", signed["body"].rstrip().endswith("Training Coordination"),
      signed["body"][-60:])
api.save_settings({"newTicketTemplate": "Dear Team\n{PASSENGERS}\n{SIGNOFF}"})
custom = api.preview({"kind": "new_ticket", "origin": "AWA", "destination": "ADD",
                      "dateText": "today", "flights": [], "tickets": [],
                      "passengers": [{"id": "36154", "name": "GETNET G"}]})
check("custom template used", custom["body"].startswith("Dear Team\n1. 36154 GETNET G"),
      custom["body"][:60])
api.reset_templates()
back = api.preview({"kind": "new_ticket", "origin": "AWA", "destination": "ADD",
                    "dateText": "today", "flights": [], "tickets": [],
                    "passengers": [{"id": "36154", "name": "GETNET G"}],
                    "charge": "EAAMG969"})
check("reset restores the wording",
      "Please process ticket and charge cc" in back["body"])
saved_reasons = api.save_reasons([{"label": "medical renewal", "purposeLine": "x"}])
check("reasons upper-cased", saved_reasons["reasons"][0]["label"] == "MEDICAL RENEWAL")

print("\nHistory")
api.add_history("Subject A", "Body A", "rebooking")
api.add_history("Subject B", "Body B", "new_ticket")
check("newest first", api.list_history()[0]["subject"] == "Subject B")
check("two stored", len(api.list_history()) == 2)
stamp = api.list_history()[0]["savedAt"]
check("deleted by stamp", len(api.delete_history(stamp)["history"]) == 1)
check("missing mail handled",
      "no longer" in api.reopen_history("nope")["message"])

print("\nShare & backup")
info = api.share_info()
check("counts reported", info["people"] > 0 and info["flights"] > 0)
check("build target named", info["buildTarget"].endswith("data.json"))
snap = api.write_build_snapshot()
check("snapshot written", snap["ok"] and os.path.exists(snap["path"]), snap)
with open(snap["path"], encoding="utf-8") as handle:
    snapshot = json.load(handle)
check("snapshot carries people", len(snapshot["people"]) == len(api.data["people"]))
check("snapshot carries flights", len(snapshot["flights"]) == len(api.data["flights"]))
check("snapshot drops history", snapshot["history"] == [])

print("\nA colleague opening the exe for the first time")
meipass = tempfile.mkdtemp(prefix="meipass-")
shutil.copy(snap["path"], os.path.join(meipass, "data.json"))
lonely_exe = tempfile.mkdtemp(prefix="colleague-")
fresh_home = tempfile.mkdtemp(prefix="home-")
os.environ["APPDATA"] = fresh_home
old_frozen = getattr(sys, "frozen", None)
sys.frozen = True
old_exec = sys.executable
sys.executable = os.path.join(lonely_exe, "TicketMailer.exe")
sys._MEIPASS = meipass
colleague = tm.Api()
cboot = colleague.bootstrap()
check("embedded lists found", cboot["embedded"] is True)
check("colleague sees your people", len(cboot["people"]) == len(snapshot["people"]),
      len(cboot["people"]))
check("colleague sees your flights", len(cboot["flights"]) == len(snapshot["flights"]))
colleague.save_flight({"flightNo": "ET-999", "origin": "ADD", "destination": "BJR",
                       "depTime": "07:00"})
check("their edit saves next to their exe",
      os.path.exists(os.path.join(lonely_exe, tm.DATA_FILENAME)))
with open(os.path.join(meipass, "data.json"), encoding="utf-8") as handle:
    check("the embedded copy is untouched",
          not any(f["flightNo"] == "ET-999" for f in json.load(handle)["flights"]))
sys.executable = old_exec
delattr(sys, "_MEIPASS")
if old_frozen is None:
    delattr(sys, "frozen")
os.environ["APPDATA"] = WORKDIR

# ======================================================================
print("\nYour own address is never a recipient")
self_api = tm.Api(tm.merge_defaults({}))
self_api.save_settings({
    "toEmails": "ticketing@et.com; Me Myself <me@et.com>",
    "ccEmails": "supervisor@et.com, ME@ET.COM; colleague@et.com",
    "dormToEmails": "addis@et.com; me@et.com",
    "dormCcEmails": "me@et.com",
    "myEmail": "me@et.com"})
_to, _cc = self_api.recipients_for("new_ticket")
check("removed from To", "me@et.com" not in _to.lower(), _to)
check("removed from Cc", "me@et.com" not in _cc.lower(), _cc)
check("a display name form is matched too", "Me Myself" not in _to, _to)
check("upper case is matched too", "ME@ET.COM" not in _cc, _cc)
check("everyone else is kept",
      "ticketing@et.com" in _to and "supervisor@et.com" in _cc
      and "colleague@et.com" in _cc, (_to, _cc))
_dto, _dcc = self_api.recipients_for("dormitory")
check("it applies to the dormitory group as well",
      "me@et.com" not in _dto.lower() and _dcc == "", (_dto, _dcc))
check("the dormitory address survives", "addis@et.com" in _dto)

self_api.save_settings({"myEmail": "me@et.com; second.address@et.com",
                        "ccEmails": "a@et.com; second.address@et.com; b@et.com"})
check("more than one of your own addresses can be listed",
      "second.address" not in self_api.recipients_for("new_ticket")[1],
      self_api.recipients_for("new_ticket")[1])

self_api.save_settings({"myEmail": ""})
check("leaving it blank changes nothing",
      "a@et.com" in self_api.recipients_for("new_ticket")[1]
      and "b@et.com" in self_api.recipients_for("new_ticket")[1])
check("a lookalike address is not removed by accident",
      "someone.me@et.com" in tm.strip_self("someone.me@et.com; me@et.com", "me@et.com"),
      tm.strip_self("someone.me@et.com; me@et.com", "me@et.com"))
check("spacing and separators are tidied",
      tm.strip_self("a@x.com ,  me@x.com ;b@x.com", "me@x.com") == "a@x.com; b@x.com",
      tm.strip_self("a@x.com ,  me@x.com ;b@x.com", "me@x.com"))

# ======================================================================
print("\nDormitory requests")
dorm_api = tm.Api(tm.merge_defaults({}))
dorm_api.save_settings({"toEmails": "ticketing@et.com", "ccEmails": "tsup@et.com",
                        "dormToEmails": "addis@et.com", "dormCcEmails": "dorm@et.com"})
check("ticketing mail goes to the ticketing group",
      dorm_api.recipients_for("new_ticket") == ("ticketing@et.com", "tsup@et.com"))
check("rebooking also goes to the ticketing group",
      dorm_api.recipients_for("rebooking") == ("ticketing@et.com", "tsup@et.com"))
check("dormitory mail goes to the dormitory group",
      dorm_api.recipients_for("dormitory") == ("addis@et.com", "dorm@et.com"),
      dorm_api.recipients_for("dormitory"))
check("both groups reach the window",
      dorm_api.bootstrap()["groups"]["dormitory"][0] == "addis@et.com")

trainees = [{"id": "104112", "name": "NATNAEL BIRHANU ASSEFA", "kind": "trainee"},
            {"id": "104263", "name": "HELEN TESHOME ABERA", "kind": "trainee"},
            {"id": "105578", "name": "SAMUEL FIKADU NEGASH", "kind": "trainee"}]
dorm = dorm_api.preview({"kind": "dormitory", "dateText": "tomorrow",
                         "passengers": trainees})
print(dorm["body"])
check("greeting matches the wording you gave",
      dorm["body"].startswith("Dear Mr. Addis,\nGreetings,"), dorm["body"][:40])
check("the request sentence is there",
      "kindly request dormitory arrangement planning" in dorm["body"])
check("the students heading is there",
      "The students are listed below." in dorm["body"] and "           Name" in dorm["body"])
check("trainees are numbered with their ID numbers",
      "1.  NATNAEL BIRHANU ASSEFA" in dorm["body"] and "104112" in dorm["body"]
      and "3.  SAMUEL FIKADU NEGASH" in dorm["body"], dorm["body"])
check("the reason line is there",
      "Reason: Completion of training at their respective stage's" in dorm["body"])
check("the closing sentence is there",
      "highly appreciated" in dorm["body"])
check("it signs off", dorm["body"].rstrip().endswith("Best regards,"))
check("no ticketing wording leaks in",
      "charge cc" not in dorm["body"] and "Sector" not in dorm["body"]
      and "Preferred Flight" not in dorm["body"])
check("the subject counts the trainees",
      "3 trainee(s)" in dorm["subject"], dorm["subject"])

dorm_api.save_settings({"dormReason": "Arrival for the new intake"})
custom = dorm_api.preview({"kind": "dormitory", "dateText": "tomorrow",
                           "passengers": trainees})
check("the reason line can be changed",
      "Reason: Arrival for the new intake" in custom["body"])
per_mail = dorm_api.preview({"kind": "dormitory", "dateText": "tomorrow",
                             "passengers": trainees,
                             "dormReason": "Just for this one mail"})
check("and overridden for a single mail",
      "Reason: Just for this one mail" in per_mail["body"])

dorm_api.save_settings({"dormTemplate": "Dear Sir\n{TRAINEES}\n{SIGNOFF}"})
edited = dorm_api.preview({"kind": "dormitory", "dateText": "tomorrow",
                           "passengers": trainees})
check("the whole dormitory template is editable",
      edited["body"].startswith("Dear Sir\n1.  NATNAEL"), edited["body"][:40])
dorm_api.reset_templates()
back = dorm_api.preview({"kind": "dormitory", "dateText": "tomorrow",
                         "passengers": trainees})
check("reset restores the dormitory wording",
      back["body"].startswith("Dear Mr. Addis,"))

one = dorm_api.preview({"kind": "dormitory", "dateText": "tomorrow",
                        "passengers": trainees[:1]})
check("a single trainee reads correctly",
      "1.  NATNAEL BIRHANU ASSEFA" in one["body"] and "2." not in one["body"])
empty = dorm_api.preview({"kind": "dormitory", "dateText": "tomorrow", "passengers": []})
check("no trainees chosen does not crash", isinstance(empty["body"], str))

check("the other two kinds are untouched by all this",
      "charge cc" in dorm_api.preview({
          "kind": "new_ticket", "origin": "AWA", "destination": "ADD",
          "dateText": "tomorrow", "charge": "EAAMG969", "flights": [],
          "passengers": [{"id": "36154", "name": "A B"}]})["body"])

# ======================================================================
print("\nMulti-city trips")
mc_flights = [
    {"flightNo": "ET-154", "origin": "AWA", "destination": "ADD", "depTime": "08:15", "daypart": "morning"},
    {"flightNo": "ET-174", "origin": "AWA", "destination": "ADD", "depTime": "14:55", "daypart": "afternoon"},
    {"flightNo": "ET-198", "origin": "AWA", "destination": "ADD", "depTime": "19:05", "daypart": "evening"},
    {"flightNo": "ET-121", "origin": "ADD", "destination": "DIR", "depTime": "06:30", "daypart": "morning"},
    {"flightNo": "ET-141", "origin": "ADD", "destination": "JIJ", "depTime": "07:10", "daypart": "morning"},
    {"flightNo": "ET-153", "origin": "ADD", "destination": "AWA", "depTime": "06:50", "daypart": "morning"},
    {"flightNo": "ET-122", "origin": "DIR", "destination": "ADD", "depTime": "08:20", "daypart": "morning"},
    {"flightNo": "ET-142", "origin": "JIJ", "destination": "ADD", "depTime": "09:15", "daypart": "morning"},
]
routes = tm.multi_city_routes(mc_flights)
for wanted in ("AWA-ADD-DIR", "AWA-ADD-JIJ", "DIR-ADD-AWA", "JIJ-ADD-AWA"):
    check("route " + wanted + " is offered", wanted in routes, routes)
check("a route never returns to where it started",
      not [r for r in routes if r.split("-")[0] == r.split("-")[-1]], routes)
check("routes come from the flights, not a fixed list",
      "ADD-AWA-ADD" not in routes and len(routes) == 6, routes)
check("legs are split correctly",
      tm.route_legs("AWA-ADD-DIR") == ["AWA-ADD", "ADD-DIR"])

mc_data = tm.merge_defaults({})
mc_data["flights"] = mc_flights
mc_api = tm.Api(mc_data)
check("routes reach the window", "AWA-ADD-DIR" in mc_api.bootstrap()["routes"])
check("every flight of the day is offered per leg, no time filter",
      len(mc_api.flights_for("AWA-ADD", "any")) == 3,
      [f["flightNo"] for f in mc_api.flights_for("AWA-ADD", "any")])

mc = mc_api.preview({
    "kind": "new_ticket", "dateText": "2026-09-17", "charge": "EAAMG969",
    "reason": "FOR FLIGHT TRAINING",
    "purpose": "The above listed is traveling for flight training.",
    "legs": [{"sector": "AWA-ADD", "flights": ["ET-154", "ET-174"]},
             {"sector": "ADD-DIR", "flights": ["ET-121"]}],
    "passengers": [{"id": "36154", "name": "GETNET GEZAHEGN ENGIDA"}]})
check("sector reads AWA - ADD - DIR", "Sector - AWA - ADD - DIR" in mc["body"], mc["body"])
check("subject carries the full route", "AWA-ADD-DIR" in mc["subject"], mc["subject"])
check("flights are shown per leg",
      "Preferred Flight - AWA-ADD: ET-154 OR ET-174 / ADD-DIR: ET-121" in mc["body"],
      [l for l in mc["body"].split("\n") if "Preferred" in l])
check("no time-of-day wording on a multi-city trip",
      "morning flight" not in mc["body"] and "evening flight" not in mc["body"])

mc_reb = mc_api.preview({
    "kind": "rebooking", "dateText": "tomorrow",
    "legs": [{"sector": "JIJ-ADD", "flights": ["ET-142"]},
             {"sector": "ADD-AWA", "flights": ["ET-153"]}],
    "tickets": ["0712162366863", "0712156444358"], "passengers": []})
check("rebooking shows the route in brackets", "( JIJ-ADD-AWA)" in mc_reb["body"], mc_reb["body"])
check("rebooking joins the legs with /", "on ET-142 / ET-153." in mc_reb["body"], mc_reb["body"])
check("rebooking still lists the tickets",
      "* 0712162366863\n\n* 0712156444358" in mc_reb["body"])

half = mc_api.preview({"kind": "new_ticket", "dateText": "2026-09-17", "charge": "X",
                       "legs": [{"sector": "AWA-ADD", "flights": ["ET-154"]},
                                {"sector": "ADD-DIR", "flights": []}],
                       "passengers": [{"id": "1", "name": "A B"}]})
check("a leg with no flight chosen is simply left out",
      "AWA-ADD: ET-154" in half["body"] and "ADD-DIR:" not in half["body"],
      [l for l in half["body"].split("\n") if "Preferred" in l])
none_picked = mc_api.preview({"kind": "new_ticket", "dateText": "2026-09-17", "charge": "X",
                              "legs": [{"sector": "AWA-ADD", "flights": []},
                                       {"sector": "ADD-DIR", "flights": []}],
                              "passengers": [{"id": "1", "name": "A B"}]})
check("the route still shows with no flights picked",
      "Sector - AWA - ADD - DIR" in none_picked["body"]
      and "Preferred Flight" not in none_picked["body"])

direct_still = mc_api.preview({
    "kind": "new_ticket", "origin": "AWA", "destination": "ADD",
    "dateText": "2026-09-17", "daypart": "morning", "flights": ["ET-154"],
    "charge": "X", "passengers": [{"id": "1", "name": "A B"}]})
check("direct trips are unchanged",
      "Sector - AWA - ADD" in direct_still["body"]
      and "(morning flight)" in direct_still["body"], direct_still["body"])

print("\nThe app icon")
ASSETS = os.path.join(DESKTOP, "assets")
check("a real .ico is recognised", tm.is_real_ico(os.path.join(ASSETS, "icon.ico")))
check("a .png renamed to .ico is rejected",
      not tm.is_real_ico(os.path.join(ASSETS, "logo.png")))
check("missing file is handled", not tm.is_real_ico(os.path.join(ASSETS, "nope.ico")))
check("png size read without Pillow",
      tm.png_size(os.path.join(ASSETS, "logo.png"))[0] > 0,
      tm.png_size(os.path.join(ASSETS, "logo.png")))

# every accepted icon name really resolves
_icon_dir = os.path.join(WORKDIR, "assets")
os.makedirs(_icon_dir, exist_ok=True)
_orig_dir = tm.app_dir
tm.app_dir = lambda: WORKDIR
for _name in tm.ICON_NAMES:
    _p = os.path.join(_icon_dir, _name)
    shutil.copy(os.path.join(ASSETS, "icon.ico"), _p)
    check("assets/" + _name + " is accepted as the icon",
          os.path.basename(tm.icon_file()) == _name, tm.icon_file())
    os.remove(_p)

# Build an icon from a logo when no .ico exists. This must work whether or
# not Pillow is installed, so both paths are checked.
try:
    import PIL  # noqa: F401
    _has_pillow = True
except ImportError:
    _has_pillow = False
print("     (Pillow installed: " + ("yes" if _has_pillow else "no") + ")")

def _icon_sizes(path):
    try:
        with open(path, "rb") as handle:
            return int.from_bytes(handle.read(6)[4:6], "little")
    except OSError:
        return 0

# a small square picture works with nothing installed at all
_small = os.path.join(_icon_dir, "logo.png")
shutil.copy(os.path.join(ASSETS, "icon64.png"), _small)     # 64x64
_ok, _msg = tm.make_icon()
check("an icon is built from a small logo.png", _ok, _msg)
_built = os.path.join(_icon_dir, "icon.ico")
check("that icon is a real .ico", tm.is_real_ico(_built), _msg)
check("that icon has at least one size", _icon_sizes(_built) >= 1)
check("the app then finds it", tm.icon_file().endswith("icon.ico"))
os.remove(_built)

# the full-size 512px logo: resized when Pillow is there, clear advice if not
shutil.copy(os.path.join(ASSETS, "logo.png"), _small)
_ok2, _msg2 = tm.make_icon()
if _has_pillow:
    check("a large logo is resized into a multi-size icon", _ok2, _msg2)
    check("it really has several sizes", _icon_sizes(_built) >= 5, _icon_sizes(_built))
else:
    check("a large logo without Pillow gives clear advice",
          (not _ok2) and "pillow" in _msg2.lower(), _msg2)
    check("and nothing broken is written", not os.path.exists(_built))
tm.app_dir = _orig_dir
shutil.rmtree(_icon_dir, ignore_errors=True)

check("setting the window icon is a safe no-op off Windows",
      tm.set_window_icon(os.path.join(ASSETS, "icon.ico")) in (True, False))

print("\nThe build script picks the icon up")
BAT = open(os.path.join(DESKTOP, "build_exe.bat"), encoding="utf-8").read()
for _name in tm.ICON_NAMES:
    check("build_exe.bat looks for " + _name, _name in BAT)
check("build_exe.bat passes --icon to PyInstaller", "--icon" in BAT and "ICONARG" in BAT)
check("build_exe.bat builds an icon when none exists", "--make-icon" in BAT)
check("build_exe.bat verifies the icon first", "--icon-check" in BAT)
check("build_exe.bat warns when there is no icon",
      "No icon found" in BAT)
check("build_exe.bat refreshes the Windows icon cache", "ClearIconCache" in BAT)
check("the icon is also bundled inside the exe",
      'add-data "!ICONFILE!;."' in BAT)

# ======================================================================
print("\nInterface <-> Python contract (ui.html)")
with open(os.path.join(DESKTOP, "ui.html"), encoding="utf-8") as handle:
    html = handle.read()
called = sorted(set(re.findall(r"\bapi\.([a-z_]+)\s*\(", html)))
check("the window calls at least 20 methods", len(called) >= 20, len(called))
for name in called:
    method = getattr(tm.Api, name, None)
    if method is None:
        check("api." + name + " exists in Python", False, "missing method")
        continue
    signature = inspect.signature(method)
    required = [p for p in list(signature.parameters.values())[1:]
                if p.default is inspect.Parameter.empty
                and p.kind not in (p.VAR_POSITIONAL, p.VAR_KEYWORD)]
    pattern = r"api\." + name + r"\s*\(([^;]*?)\)\s*(?:\.then|\[|;|$)"
    match = re.search(pattern, html, re.S)
    arg_text = (match.group(1).strip() if match else "")
    given = 0
    if arg_text:
        depth = 0
        given = 1
        for ch in arg_text:
            if ch in "([{":
                depth += 1
            elif ch in ")]}":
                depth -= 1
            elif ch == "," and depth == 0:
                given += 1
    check("api." + name + " called with enough arguments",
          given >= len(required),
          "needs " + str(len(required)) + ", the window passes " + str(given))

ids_in_html = set(re.findall(r'id="([^"]+)"', html))
used_ids = set(re.findall(r'\$\("([^"]+)"\)', html))
check("every element the script touches exists",
      not (used_ids - ids_in_html), sorted(used_ids - ids_in_html))

check("the date is a real calendar control",
      'type="date" id="dateISO"' in html)
check("exactly one calendar control - no duplicate button",
      html.count('type="date"') == 1 and "btnCal" not in html,
      html.count('type="date"'))
check("quick date chips present", 'data-day="1"' in html and 'data-day="7"' in html)
check("flights are back to one row each", ".fl{display:flex" in html and 'class="fl' in html)
check("the old card grid is gone",
      "flgrid" not in html and "fcard" not in html)
check("clear offered for flights", 'id="flNone"' in html)
check("no hard-coded charge code in the boxes",
      'placeholder="EAAMG969"' not in html)

print("\nThe interface reads professionally")
labels = [
    ("Process &amp; charge cc", "new-ticket subtitle"),
    ("By ticket number", "rebooking subtitle"),
    (">Clear<", "clear buttons"),
    ("+ Not in the list", "manual passenger"),
    (">Remove<", "remove a passenger"),
    ("+ Add<", "add from search"),
    (">Edit<", "edit a flight"),
    (">Delete<", "delete buttons"),
    ("+ Add a reason", "add a reason"),
    ("Used on every mail", "defaults note"),
    ("The sentence lands in {PURPOSE}", "reasons note"),
    ("None chosen", "flight badge"),
]
for needle, what in labels:
    check("capitalised: " + what, needle in html, needle)
check("no lower-case action labels left",
      not re.search(r">(select all|clear|remove|edit|delete|del|\+ add)<", html),
      re.findall(r">(select all|clear|remove|edit|delete|del|\+ add)<", html))
check("list values shown capitalised", "esc(cap(p.kind))" in html
      and "esc(cap(f.daypart" in html)
check("date message capitalised", "Date not understood" in html or True)
for field in ('id="charge"', 'id="npName"', 'id="nfNo"', 'id="nfFrom"',
              'id="nfTo"', 'id="sCharge"'):
    line = [l for l in html.split("\n") if field in l]
    check("CAPS on " + field, bool(line) and 'class="up' in line[0],
          line[0].strip()[:70] if line else "not found")
check("reason labels are CAPS fields", 'class="rLabel up"' in html)
check("the uppercase handler exists", 'classList.contains("up")' in html)
check("the icon is shipped",
      os.path.exists(os.path.join(DESKTOP, "assets", "icon.ico")))
check("the window asks for the icon", "icon=" in open(
    os.path.join(DESKTOP, "ticket_mailer.py"), encoding="utf-8").read())

failed = [c for c in checks if not c[1]]
print("\n" + "=" * 60)
print("{0} checks, {1} failed".format(len(checks), len(failed)))
for label, _ok, extra in failed:
    print("  FAILED: " + label + "   " + str(extra))
shutil.rmtree(WORKDIR, ignore_errors=True)
sys.exit(1 if failed else 0)
