#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TICKET MAILER - desktop edition
================================
Writes your ticketing e-mails (new ticket / rebooking) and hands them to
Outlook.  Everything lives on your own PC: the staff list, the flight list,
the reasons and the wording are stored in a small data file next to the
program, and you can edit all of it from inside the app.

Run from source :  python ticket_mailer.py
Build the .exe  :  double-click build_exe.bat   (or see README.txt)

Standard library only, so no "pip install" is required to run it.
pywin32 is used when present to talk to Outlook directly; without it the
app falls back to your default mail client.
"""

import base64
import csv
import datetime
import json
import os
import re
import subprocess
import sys
import urllib.parse
import webbrowser

APP_NAME = "Ticket Mailer"
APP_VERSION = "4.2"
DATA_FILENAME = "ticket_mailer_data.json"
NL = chr(10)

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

DAYPARTS = ["morning", "afternoon", "evening"]

DEFAULT_NEW_TICKET_TEMPLATE = (
    "Dear Team" + NL +
    "Greetings!" + NL + NL +
    "Please process ticket and charge cc {CHARGE_CODE}" + NL + NL +
    "{PASSENGERS}" + NL + NL +
    "Sector - {SECTOR_SPACED}" + NL +
    "Departure Date - {DATE}" + NL +
    "{FLIGHTS_LINE}" + NL + NL +
    "{PURPOSE}" + NL + NL +
    "{SIGNOFF}"
)

DEFAULT_REBOOK_TEMPLATE = (
    "Dear Team" + NL +
    "Greetings" + NL + NL +
    "Kindly rebook the below listed tickets for {DATE_PHRASE}{FLIGHTS_PHRASE}." + NL +
    "( {SECTOR})" + NL + NL +
    "{TICKETS}" + NL + NL +
    "{SIGNOFF}"
)

DEFAULT_DORM_TEMPLATE = (
    "Dear Mr. Addis," + NL +
    "Greetings," + NL +
    "This is to kindly request dormitory arrangement planning for the upcoming "
    "student arrivals scheduled throughout next week starting from tomorrow. "
    "The request is being made in advance to facilitate proper accommodation "
    "coordination and avoid any last-minute inconveniences." + NL +
    "The students are listed below." + NL +
    "           Name" + NL +
    "{TRAINEES}" + NL + NL +
    "Reason: {DORM_REASON}" + NL +
    "Your support and coordination in arranging the dormitory accommodations "
    "accordingly are highly appreciated." + NL +
    "{SIGNOFF}"
)

DEFAULT_DORM_REASON = "Completion of training at their respective stage's"


DEFAULT_DATA = {
    "settings": {
        "theme": "ethiopian",
        "defaultChargeCode": "EAAMG969",
        # the ticketing group - new tickets and rebooking go here
        "toEmails": "",
        "ccEmails": "",
        # the dormitory group - dormitory requests go here instead
        "dormToEmails": "",
        "dormCcEmails": "",
        # your own address(es) - always taken out of To and Cc so you do not
        # get your own mail back in your inbox
        "myEmail": "",
        "signOff": "Best regards,",
        "signature": "",
        "newTicketTemplate": DEFAULT_NEW_TICKET_TEMPLATE,
        "rebookTemplate": DEFAULT_REBOOK_TEMPLATE,
        "dormTemplate": DEFAULT_DORM_TEMPLATE,
        "dormReason": DEFAULT_DORM_REASON,
        "newTicketSubject": "Ticket Request | {REASON} | {SECTOR} | {DATE}",
        "rebookSubject": "Rebooking Request | {SECTOR} | {DATE}",
        "dormSubject": "Dormitory Request | {COUNT} trainee(s) | {DATE}",
    },
    "reasons": [
        {"label": "PASSPORT REGISTRATION",
         "purposeLine": "The above listed is traveling for passport registration."},
        {"label": "FERRY RETURN",
         "purposeLine": "The above listed is returning back to base after a ferry flight."},
        {"label": "STAGE COMPLETED BY TRAINEE",
         "purposeLine": "The above listed trainee has completed the training stage and is returning to base."},
        {"label": "FOR GROUND CLASS",
         "purposeLine": "The above listed is traveling to attend ground class as per the training schedule."},
        {"label": "FOR FLIGHT TRAINING",
         "purposeLine": "The above listed is traveling for flight training as per the training schedule."},
        {"label": "MEDICAL RENEWAL",
         "purposeLine": "The above listed is traveling for medical renewal."},
    ],
    "flights": [],
    "people": [],
    "history": [],
}


# ----------------------------------------------------------------------
#  WHERE THE DATA FILE LIVES
# ----------------------------------------------------------------------
def app_dir():
    """Folder of the .exe (frozen) or of this script."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def bundled_path(name):
    """A file baked INSIDE the .exe by PyInstaller (--add-data), if present."""
    base = getattr(sys, "_MEIPASS", None)
    if base:
        candidate = os.path.join(base, name)
        if os.path.exists(candidate):
            return candidate
    return ""


def user_dir():
    base = os.environ.get("APPDATA") or os.path.expanduser("~")
    folder = os.path.join(base, "TicketMailer")
    try:
        os.makedirs(folder, exist_ok=True)
    except OSError:
        return app_dir()
    return folder


def can_write(folder):
    probe = os.path.join(folder, ".ticketmailer_write_test")
    try:
        with open(probe, "w", encoding="utf-8") as handle:
            handle.write("x")
        os.remove(probe)
        return True
    except OSError:
        return False


def seed_path():
    """data.json shipped beside the program, or baked inside the .exe."""
    local = os.path.join(app_dir(), "data.json")
    if os.path.exists(local):
        return local
    return bundled_path("data.json")


def data_path():
    """Where your edits get saved.

    Next to the program when that folder is writable (so the whole folder can
    be copied around); otherwise the user's AppData folder.
    """
    local = os.path.join(app_dir(), DATA_FILENAME)
    if os.path.exists(local):
        return local
    roaming = os.path.join(user_dir(), DATA_FILENAME)
    if os.path.exists(roaming):
        return roaming
    if can_write(app_dir()):
        return local
    return roaming


def load_data():
    """Your saved file wins; otherwise start from the shipped/embedded snapshot."""
    candidates = [
        os.path.join(app_dir(), DATA_FILENAME),
        os.path.join(user_dir(), DATA_FILENAME),
        os.path.join(app_dir(), "data.json"),
        bundled_path("data.json"),
    ]
    for path in candidates:
        if path and os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as handle:
                    raw = json.load(handle)
                return merge_defaults(raw)
            except (OSError, ValueError):
                continue
    return merge_defaults({})


def merge_defaults(raw):
    data = json.loads(json.dumps(DEFAULT_DATA))
    for key in ("reasons", "flights", "people", "history"):
        if isinstance(raw.get(key), list) and raw.get(key):
            data[key] = raw[key]
    if isinstance(raw.get("settings"), dict):
        data["settings"].update(
            {k: v for k, v in raw["settings"].items() if isinstance(v, str)})
    data["people"] = [normalise_person(p) for p in data["people"]]
    return data


def save_data(data):
    path = data_path()
    try:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=1, ensure_ascii=False)
        return path
    except OSError as error:
        raise RuntimeError("Could not save to " + str(path) + ": " + str(error))


# ----------------------------------------------------------------------
#  THE ID RULE
#     6 digits starting with 1 -> trainee
#     5 digits                 -> employee
#     6 digits starting with 2 -> employee
# ----------------------------------------------------------------------
def only_digits(value):
    return re.sub(r"[^0-9]", "", value or "")


def classify_id(value):
    """Returns (kind, confident, explanation)."""
    number = only_digits(value)
    if len(number) == 6 and number.startswith("1"):
        return "trainee", True, "6 digits starting with 1 -> trainee"
    if len(number) == 5:
        return "employee", True, "5 digits -> employee"
    if len(number) == 6 and number.startswith("2"):
        return "employee", True, "6 digits starting with 2 -> employee"
    if not number:
        return "employee", False, "no ID number"
    return "employee", False, str(len(number)) + " digit ID - outside the rule"


def kind_of(value):
    return classify_id(value)[0]


def normalise_person(person):
    pid = only_digits(str(person.get("id", "") or person.get("staffNo", "")))
    name = str(person.get("name", "") or person.get("fullName", "")).upper().strip()
    name = re.sub(r"\s+", " ", name)
    kind = person.get("kind") or kind_of(pid)
    if kind not in ("employee", "trainee"):
        kind = kind_of(pid)
    return {"id": pid, "name": name, "kind": kind}


# ----------------------------------------------------------------------
#  PASTE / CSV PARSING  ("36154  GETNET GEZAHEGN ENGIDA" in any order)
# ----------------------------------------------------------------------
HEADER_WORDS = ("id", "name", "staff", "no", "employee", "trainee", "full")
HEADER_TOKENS = ("id", "id no", "id number", "idno", "name", "full name",
                 "fullname", "staff", "staff no", "staff number", "staffno",
                 "type", "kind", "category", "no", "s/n", "sn", "remark",
                 "employee/trainee")


def looks_like_header(line, cells):
    """True for a spreadsheet header row such as  ID,NAME,TYPE."""
    if re.search(r"\d{4,}", line):
        return False
    lowered = [c.strip().lower() for c in cells if c and c.strip()]
    if not lowered:
        return False
    if any(cell in HEADER_TOKENS for cell in lowered):
        return True
    return all(any(word in cell for word in HEADER_WORDS) for cell in lowered)


def split_cells(line):
    if "\t" in line:
        return [c.strip() for c in line.split("\t")]
    if "," in line:
        return [c.strip() for c in line.split(",")]
    if ";" in line:
        return [c.strip() for c in line.split(";")]
    head = re.match(r"^\s*([0-9][0-9\s-]{2,})\s+(.+)$", line)
    if head:
        return [only_digits(head.group(1)), head.group(2).strip()]
    tail = re.match(r"^(.+?)\s+([0-9]{4,9})\s*$", line)
    if tail:
        return [tail.group(2), tail.group(1).strip()]
    return [line.strip()]


def parse_people_text(text):
    """Returns (people, skipped_lines)."""
    people = []
    skipped = []
    lines = [l.strip() for l in (text or "").splitlines() if l.strip()]
    for index, line in enumerate(lines):
        cells = split_cells(line)
        if index == 0 and looks_like_header(line, cells):
            continue
        pid = ""
        name = ""
        forced = ""
        for cell in cells:
            value = (cell or "").strip()
            if not value:
                continue
            low = value.lower()
            if low in ("trainee", "trn", "student"):
                forced = "trainee"
                continue
            if low in ("employee", "emp", "staff"):
                forced = "employee"
                continue
            digits = only_digits(value)
            if digits and digits == re.sub(r"[\s-]", "", value):
                if not pid:
                    pid = digits
                continue
            if re.search(r"[A-Za-z]", value) and len(value) > len(name):
                name = value
        if not name:
            skipped.append(line)
            continue
        person = normalise_person({"id": pid, "name": name})
        if forced:
            person["kind"] = forced
        people.append(person)
    return people, skipped


def merge_people(existing, incoming, replace=False):
    """Upsert by ID so re-pasting the sheet never duplicates. Returns counts."""
    if replace:
        existing[:] = []
    index = {}
    for position, person in enumerate(existing):
        if person.get("id"):
            index[person["id"]] = position
    added = 0
    updated = 0
    for person in incoming:
        if person["id"] and person["id"] in index:
            existing[index[person["id"]]] = person
            updated += 1
        else:
            if person["id"]:
                index[person["id"]] = len(existing)
            existing.append(person)
            added += 1
    existing.sort(key=lambda p: (p["kind"], p["id"]))
    return added, updated


def read_people_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as handle:
        return parse_people_text(handle.read())


def write_people_csv(path, people):
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["ID", "NAME", "TYPE"])
        for person in people:
            writer.writerow([person["id"], person["name"], person["kind"]])


# ----------------------------------------------------------------------
#  FLIGHT IMPORT
#  Understands lines such as
#     ET-154  AWA  ADD  08:15  09:10
#     ET-154, AWA-ADD, 0815, 0910
#     AWA ADD ET154 08:15 morning
# ----------------------------------------------------------------------
FLIGHT_HEADER_TOKENS = ("flight", "flight no", "flightno", "flight number",
                        "from", "to", "origin", "destination", "sector",
                        "dep", "departure", "dep time", "arr", "arrival",
                        "arr time", "time", "daypart", "time of day", "days")


def normalise_time(token):
    """08:15 / 8:15 / 0815 / 08.15  ->  08:15   (anything else -> "")"""
    value = (token or "").strip()
    if not value:
        return ""
    match = re.match(r"^([0-2]?\d)[:.h]([0-5]\d)$", value, re.IGNORECASE)
    if not match:
        if re.match(r"^\d{4}$", value):
            match = re.match(r"^([0-2]\d)([0-5]\d)$", value)
        if not match:
            return ""
    hour = int(match.group(1))
    if hour > 23:
        return ""
    return "{0:02d}:{1}".format(hour, match.group(2))


def looks_like_flight_no(token):
    value = (token or "").strip()
    if not re.search(r"\d", value):
        return False
    if not re.search(r"[A-Za-z]", value) and "-" not in value:
        return False
    return bool(re.match(r"^[A-Za-z]{1,3}[\s-]?\d{1,4}[A-Za-z]?$", value))


def split_flight_cells(line):
    for separator in ("\t", ",", ";", "|"):
        if separator in line:
            return [c.strip() for c in line.split(separator)]
    return [c for c in re.split(r"\s+", line.strip()) if c]


def parse_flights_text(text):
    """Returns (flights, skipped_lines)."""
    flights = []
    skipped = []
    lines = [l.strip() for l in (text or "").splitlines() if l.strip()]
    for index, line in enumerate(lines):
        cells = split_flight_cells(line)
        lowered = [c.strip().lower() for c in cells if c.strip()]
        if index == 0 and lowered and not re.search(r"\d", line):
            if any(cell in FLIGHT_HEADER_TOKENS for cell in lowered):
                continue
        number = ""
        airports = []
        times = []
        daypart = ""
        for raw in cells:
            token = (raw or "").strip()
            if not token:
                continue
            low = token.lower()
            if low in DAYPARTS:
                daypart = low
                continue
            sector = re.match(r"^([A-Za-z]{3})\s*[-/>]\s*([A-Za-z]{3})$", token)
            if sector:
                airports.extend([sector.group(1).upper(), sector.group(2).upper()])
                continue
            clock = normalise_time(token)
            if clock and not looks_like_flight_no(token):
                times.append(clock)
                continue
            if re.match(r"^[A-Za-z]{3}$", token) and len(airports) < 2:
                airports.append(token.upper())
                continue
            if not number and looks_like_flight_no(token):
                number = token.upper().replace(" ", "")
                continue
        if not number or len(airports) < 2:
            skipped.append(line)
            continue
        dep = times[0] if times else ""
        arr = times[1] if len(times) > 1 else ""
        flights.append({
            "flightNo": number,
            "origin": airports[0],
            "destination": airports[1],
            "depTime": dep,
            "arrTime": arr,
            "daypart": daypart or daypart_of(dep),
        })
    return flights, skipped


def multi_city_routes(flights):
    """Routes that connect through a hub, e.g. AWA-ADD-DIR.

    Worked out from the flights you already have: if AWA-ADD exists and
    ADD-DIR exists, then AWA-ADD-DIR is offered. Nothing to maintain by
    hand - add a flight and any new connection appears on its own.
    """
    sectors = set()
    for flight in (flights or []):
        origin = str(flight.get("origin", "")).strip().upper()
        destination = str(flight.get("destination", "")).strip().upper()
        if origin and destination and origin != destination:
            sectors.add((origin, destination))
    routes = set()
    for first_from, first_to in sectors:
        for second_from, second_to in sectors:
            if first_to == second_from and first_from != second_to:
                routes.add(first_from + "-" + first_to + "-" + second_to)
    return sorted(routes)


def route_legs(route):
    """'AWA-ADD-DIR' -> ['AWA-ADD', 'ADD-DIR']"""
    stops = [s for s in str(route or "").upper().split("-") if s]
    return [stops[i] + "-" + stops[i + 1] for i in range(len(stops) - 1)]


def merge_flights(existing, incoming, replace=False):
    """Upsert on flight number + sector. Returns (added, updated)."""
    if replace:
        existing[:] = []
    index = {}
    for position, flight in enumerate(existing):
        key = (flight.get("flightNo", ""), flight.get("origin", ""),
               flight.get("destination", ""))
        index[key] = position
    added = 0
    updated = 0
    for flight in incoming:
        key = (flight.get("flightNo", ""), flight.get("origin", ""),
               flight.get("destination", ""))
        if key in index:
            existing[index[key]] = flight
            updated += 1
        else:
            index[key] = len(existing)
            existing.append(flight)
            added += 1
    existing.sort(key=lambda f: (f.get("origin", ""), f.get("destination", ""),
                                 f.get("depTime", "")))
    return added, updated


def read_flights_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as handle:
        return parse_flights_text(handle.read())


def write_flights_csv(path, flights):
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["FLIGHT", "FROM", "TO", "DEP", "ARR", "TIME OF DAY"])
        for flight in flights:
            writer.writerow([flight.get("flightNo", ""), flight.get("origin", ""),
                             flight.get("destination", ""), flight.get("depTime", ""),
                             flight.get("arrTime", ""), flight.get("daypart", "")])


def write_snapshot(data, path):
    """The data.json that gets baked into the next .exe build."""
    snapshot = {
        "generatedAt": datetime.datetime.now().isoformat(timespec="seconds"),
        "settings": data.get("settings", {}),
        "reasons": data.get("reasons", []),
        "flights": data.get("flights", []),
        "people": data.get("people", []),
        "history": [],
    }
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle, indent=1, ensure_ascii=False)
    return path


# ----------------------------------------------------------------------
#  DATES
# ----------------------------------------------------------------------
def to_date(iso):
    try:
        parts = [int(x) for x in str(iso).split("-")]
        return datetime.date(parts[0], parts[1], parts[2])
    except (ValueError, IndexError):
        return None


def format_date(iso):
    day = to_date(iso)
    if day is None:
        return str(iso)
    return MONTHS[day.month - 1] + " " + str(day.day) + "," + str(day.year)


def date_phrase(iso, today=None):
    day = to_date(iso)
    if day is None:
        return str(iso)
    today = today or datetime.date.today()
    diff = (day - today).days
    pretty = format_date(iso)
    if diff == 0:
        return "today " + pretty
    if diff == 1:
        return "tomorrow " + pretty
    return pretty


def parse_loose_date(text):
    """Accepts 2026-09-18, tomorrow, today, 2 (days from now), 18/09/2026."""
    value = (text or "").strip().lower()
    today = datetime.date.today()
    if value in ("", "tomorrow", "tom", "t"):
        return today + datetime.timedelta(days=1)
    if value in ("today", "d"):
        return today
    if re.match(r"^\d{1,2}$", value):
        return today + datetime.timedelta(days=int(value))
    iso = to_date(value)
    if iso:
        return iso
    match = re.match(r"^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", value)
    if match:
        return datetime.date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
    return None


def daypart_of(dep_time):
    try:
        hour = int(str(dep_time).split(":")[0])
    except (ValueError, IndexError):
        return "morning"
    if hour < 12:
        return "morning"
    if hour < 17:
        return "afternoon"
    return "evening"


# ----------------------------------------------------------------------
#  THE E-MAIL ITSELF
# ----------------------------------------------------------------------
def passenger_block(passengers):
    lines = []
    for position, person in enumerate(passengers):
        bits = [str(position + 1) + "."]
        if person.get("id"):
            bits.append(str(person["id"]))
        bits.append(str(person.get("name", "")).upper())
        if person.get("doc"):
            bits.append(str(person["doc"]))
        lines.append(" ".join([b for b in bits if b]))
    return NL.join(lines)


def trainee_block(people):
    """The numbered student list for a dormitory request."""
    lines = []
    for position, person in enumerate(people):
        name = str(person.get("name", "")).upper().strip()
        number = str(person.get("id", "")).strip()
        entry = str(position + 1) + ".  " + name
        if number:
            entry = entry.ljust(46) + number
        lines.append(entry)
    return NL.join(lines)


def ticket_block(tickets, passengers=None):
    named = {}
    for person in (passengers or []):
        if person.get("ticket"):
            named[str(person["ticket"]).strip()] = str(person.get("name", "")).upper()
    out = []
    for ticket in tickets:
        name = named.get(str(ticket).strip())
        out.append("* " + str(ticket) + ("   " + name if name else ""))
    return (NL + NL).join(out)


def tidy(text):
    text = NL.join([line.rstrip() for line in text.split(NL)])
    while NL * 3 in text:
        text = text.replace(NL * 3, NL * 2)
    return text.strip()


def build_email(data, state):
    settings = data.get("settings", {})

    # A multi-city trip arrives as legs: [{"sector": "AWA-ADD",
    # "flights": [...]}, {"sector": "ADD-DIR", "flights": [...]}]
    legs = [leg for leg in (state.get("legs") or []) if leg.get("sector")]
    via = ""

    if legs:
        stops = []
        for leg in legs:
            first, _, second = str(leg["sector"]).upper().partition("-")
            if not stops:
                stops.append(first)
            stops.append(second)
        stops = [s for s in stops if s]
        origin = stops[0] if stops else ""
        destination = stops[-1] if stops else ""
        via = " / ".join(stops[1:-1])
        sector = "-".join(stops)
        sector_spaced = " - ".join(stops)

        # per leg: "ET-154 OR ET-174"; between legs: " / "
        pieces = []
        labelled = []
        for leg in legs:
            picked = [f for f in (leg.get("flights") or []) if f]
            if not picked:
                continue
            joined = " OR ".join(picked)
            pieces.append(joined)
            labelled.append(str(leg["sector"]).upper() + ": " + joined)
        flights_joined = " / ".join(pieces)
        flights_phrase = (" on " + flights_joined) if flights_joined else ""
        flights_line = ("Preferred Flight - " + " / ".join(labelled)) if labelled else ""
    else:
        origin = (state.get("origin") or "").upper()
        destination = (state.get("destination") or "").upper()
        if origin and destination:
            sector = origin + "-" + destination
            sector_spaced = origin + " - " + destination
        else:
            sector = origin or destination
            sector_spaced = sector

        flights = [f for f in state.get("flights", []) if f]
        flights_joined = " OR ".join(flights)
        flights_phrase = (" on " + flights_joined) if flights_joined else ""
        daypart = state.get("daypart") or ""
        daypart_label = (" (" + daypart + " flight)") if daypart and daypart != "any" else ""
        flights_line = ("Preferred Flight - " + flights_joined + daypart_label) if flights_joined else ""

    passengers = state.get("passengers", [])
    tickets = [str(t).strip() for t in state.get("tickets", []) if str(t).strip()]
    iso = state.get("date", "")
    pretty = format_date(iso)
    names = ", ".join([str(p.get("name", "")).upper() for p in passengers])
    count = len(tickets) if state.get("kind") == "rebooking" else len(passengers)

    sign_bits = [settings.get("signOff", ""), settings.get("signature", "")]
    signature = NL.join([bit for bit in sign_bits if bit and bit.strip()])

    purpose = state.get("purpose", "") or ""
    for token, value in (("{NAMES}", names), ("{COUNT}", str(count)),
                         ("{SECTOR}", sector), ("{DATE}", pretty)):
        purpose = purpose.replace(token, value)

    values = {
        # charge codes, sectors and names are always written in CAPITALS
        "CHARGE_CODE": str(state.get("charge", "")).upper(),
        "PASSENGERS": passenger_block(passengers),
        "TICKETS": ticket_block(tickets, passengers),
        "SECTOR": sector,
        "SECTOR_SPACED": sector_spaced,
        "ORIGIN": origin,
        "DESTINATION": destination,
        "DATE": pretty,
        "DATE_PHRASE": date_phrase(iso),
        "FLIGHTS": flights_joined,
        "FLIGHTS_PHRASE": flights_phrase,
        "FLIGHTS_LINE": flights_line,
        "DAYPART": "" if (legs or state.get("daypart") == "any")
                   else (state.get("daypart") or ""),
        "VIA": via,
        "TRAINEES": trainee_block(passengers),
        "DORM_REASON": str(state.get("dormReason", "")
                           or settings.get("dormReason", "")),
        "LEGS": NL.join([str(l["sector"]).upper()
                         + ("   " + " OR ".join([f for f in (l.get("flights") or []) if f])
                            if any(l.get("flights") or []) else "")
                         for l in legs]),
        "REASON": state.get("reason", ""),
        "PURPOSE": purpose,
        "NAMES": names,
        "COUNT": str(count),
        "REMARKS": (state.get("remarks") or "").strip(),
        "SIGNOFF": signature,
    }

    def fill(template):
        return re.sub(r"\{([A-Z_]+)\}",
                      lambda m: values.get(m.group(1), m.group(0)),
                      template or "")

    if state.get("kind") == "dormitory":
        body_template = settings.get("dormTemplate", DEFAULT_DORM_TEMPLATE)
        subject_template = settings.get("dormSubject", "")
    elif state.get("kind") == "rebooking":
        body_template = settings.get("rebookTemplate", DEFAULT_REBOOK_TEMPLATE)
        subject_template = settings.get("rebookSubject", "")
    else:
        body_template = settings.get("newTicketTemplate", DEFAULT_NEW_TICKET_TEMPLATE)
        subject_template = settings.get("newTicketSubject", "")

    body = tidy(fill(body_template))
    remarks = values["REMARKS"]
    if remarks and "{REMARKS}" not in (body_template or ""):
        if signature and signature in body:
            head, _, tail = body.rpartition(signature)
            body = tidy(head.rstrip() + NL + NL + remarks + NL + NL + signature + tail)
        else:
            body = tidy(body + NL + NL + remarks)

    subject = fill(subject_template)
    subject = re.sub(r"\s*\|\s*\|\s*", " | ", subject).strip().strip("|").strip()
    return subject, tidy(body)


# ----------------------------------------------------------------------
#  OUTLOOK
# ----------------------------------------------------------------------
def open_in_outlook(subject, body, to_addr="", cc_addr=""):
    """Returns a short status message. Uses Outlook COM when available."""
    try:
        import win32com.client  # type: ignore
        outlook = win32com.client.Dispatch("Outlook.Application")
        mail = outlook.CreateItem(0)
        if to_addr:
            mail.To = to_addr
        if cc_addr:
            mail.CC = cc_addr
        mail.Subject = subject
        mail.Body = body
        mail.Display()
        return "Opened in Outlook - check it and press Send."
    except Exception:
        pass
    try:
        url = "mailto:" + urllib.parse.quote(to_addr, safe="@,;")
        query = {"subject": subject, "body": body}
        if cc_addr:
            query["cc"] = cc_addr
        url += "?" + urllib.parse.urlencode(query, quote_via=urllib.parse.quote)
        webbrowser.open(url)
        return "Opened in your default mail program."
    except Exception as error:
        return "Could not open the mail program: " + str(error)



# ----------------------------------------------------------------------
#  THE BRIDGE BETWEEN THE WINDOW AND PYTHON
#  Every method here can be called from the interface as
#      window.pywebview.api.<name>(...)
#  It is plain Python, so it can be tested without opening a window.
# ----------------------------------------------------------------------
def split_addresses(text):
    """Split a To/Cc box into single addresses, keeping the original text."""
    parts = re.split(r"[;,]", str(text or ""))
    return [part.strip() for part in parts if part.strip()]


def bare_address(entry):
    """'Addis A <addis@et.com>' -> 'addis@et.com' (lower case)."""
    match = re.search(r"<([^>]+)>", str(entry or ""))
    value = match.group(1) if match else str(entry or "")
    return value.strip().strip("'\"").lower()


def strip_self(text, mine):
    """Remove your own address(es) from a To/Cc line.

    Matching ignores case and any "Name <...>" wrapper, so it works however
    the address was typed.
    """
    own = {bare_address(m) for m in split_addresses(mine) if bare_address(m)}
    if not own:
        return str(text or "")
    kept = [entry for entry in split_addresses(text)
            if bare_address(entry) not in own]
    return "; ".join(kept)


def outlook_available():
    try:
        import win32com.client  # noqa: F401
        return True
    except Exception:  # noqa: BLE001
        return False


class Api:
    def __init__(self, data=None):
        self.data = data if data is not None else load_data()
        self.window = None
        self.last_error = ""

    # ---------- helpers ----------
    def _save(self):
        try:
            return {"ok": True, "path": save_data(self.data)}
        except RuntimeError as error:
            self.last_error = str(error)
            return {"ok": False, "error": str(error)}

    def _sectors(self):
        seen = []
        for flight in self.data["flights"]:
            key = flight.get("origin", "") + "-" + flight.get("destination", "")
            if key != "-" and key not in seen:
                seen.append(key)
        return sorted(seen)

    # ---------- what the interface loads at start-up ----------
    def bootstrap(self):
        return {
            "appName": APP_NAME,
            "version": APP_VERSION,
            "dataPath": data_path(),
            "embedded": bool(bundled_path("data.json")),
            "settings": self.data["settings"],
            "reasons": self.data["reasons"],
            "flights": self.data["flights"],
            "people": self.data["people"],
            "sectors": self._sectors(),
            "routes": multi_city_routes(self.data["flights"]),
            "history": self.data["history"],
            "today": datetime.date.today().isoformat(),
            "tomorrow": (datetime.date.today()
                         + datetime.timedelta(days=1)).isoformat(),
            "outlook": outlook_available(),
            "groups": {"ticketing": list(self.recipients_for("new_ticket")),
                       "dormitory": list(self.recipients_for("dormitory"))},
            "logo": logo_data_uri(),
        }

    # ---------- compose ----------
    def preview(self, state):
        state = dict(state or {})
        day = parse_loose_date(state.get("dateText", ""))
        state["date"] = day.isoformat() if day else ""
        subject, body = build_email(self.data, state)
        return {
            "subject": subject,
            "body": body,
            "dateLabel": date_phrase(state["date"]) if day else "Date not understood",
            "dateOk": bool(day),
        }

    def flights_for(self, sector, daypart):
        out = []
        for flight in self.data["flights"]:
            key = flight.get("origin", "") + "-" + flight.get("destination", "")
            if sector and key != sector:
                continue
            if daypart and daypart != "any" and flight.get("daypart") != daypart:
                continue
            out.append(flight)
        out.sort(key=lambda f: f.get("depTime", ""))
        return out

    def search_people(self, query, kind):
        query = (query or "").strip().lower()
        out = []
        for person in self.data["people"]:
            if kind and kind != "all" and person.get("kind") != kind:
                continue
            blob = (person.get("id", "") + " " + person.get("name", "")).lower()
            if query and query not in blob:
                continue
            out.append(person)
            if len(out) >= 200:
                break
        return out

    def recipients_for(self, kind):
        """Who receives this kind of request.

        Dormitory requests go to the dormitory group, everything else to the
        ticketing group - and your own address is always removed, so a mail
        you send never lands back in your own inbox.
        """
        settings = self.data["settings"]
        if kind == "dormitory":
            to_addr = settings.get("dormToEmails", "")
            cc_addr = settings.get("dormCcEmails", "")
        else:
            to_addr = settings.get("toEmails", "")
            cc_addr = settings.get("ccEmails", "")
        mine = settings.get("myEmail", "")
        return (strip_self(to_addr, mine), strip_self(cc_addr, mine))

    def send_mail(self, state):
        result = self.preview(state)
        to_addr, cc_addr = self.recipients_for((state or {}).get("kind", ""))
        message = open_in_outlook(result["subject"], result["body"],
                                  to_addr, cc_addr)
        self.add_history(result["subject"], result["body"],
                         (state or {}).get("kind", ""))
        return {"message": message, "history": self.data["history"]}

    def copy_text(self, text):
        """Clipboard through the OS so it outlives the window."""
        text = text or ""
        try:
            if sys.platform.startswith("win"):
                process = subprocess.Popen("clip", stdin=subprocess.PIPE, shell=True)
                process.communicate(input=text.encode("utf-16-le"))
                return {"ok": True}
            if sys.platform == "darwin":
                process = subprocess.Popen("pbcopy", stdin=subprocess.PIPE)
                process.communicate(input=text.encode("utf-8"))
                return {"ok": True}
        except Exception as error:  # noqa: BLE001
            self.last_error = str(error)
        return {"ok": False}

    def save_text_file(self, subject, body):
        path = self._ask_save("email.txt", "Text file (*.txt)")
        if not path:
            return {"ok": False, "cancelled": True}
        try:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("Subject: " + (subject or "") + NL + NL + (body or ""))
            return {"ok": True, "path": path}
        except OSError as error:
            return {"ok": False, "error": str(error)}

    # ---------- people ----------
    def save_person(self, person):
        person = normalise_person(person or {})
        if not person["name"]:
            return {"ok": False, "error": "Type the name first."}
        added, updated = merge_people(self.data["people"], [person])
        self._save()
        return {"ok": True, "added": added, "updated": updated,
                "kind": person["kind"], "people": self.data["people"]}

    def delete_person(self, person_id, name=""):
        before = len(self.data["people"])
        self.data["people"] = [
            p for p in self.data["people"]
            if not (p.get("id") == person_id
                    and (not name or p.get("name") == name))]
        self._save()
        return {"ok": True, "removed": before - len(self.data["people"]),
                "people": self.data["people"]}

    def import_people(self, text, replace=False):
        people, skipped = parse_people_text(text or "")
        if not people:
            return {"ok": False,
                    "error": "No row could be read. Each line needs an ID and a "
                             "name, for example:  36154  GETNET GEZAHEGN ENGIDA"}
        added, updated = merge_people(self.data["people"], people, replace=replace)
        self._save()
        trainees = len([p for p in people if p["kind"] == "trainee"])
        return {"ok": True, "added": added, "updated": updated,
                "trainees": trainees, "employees": len(people) - trainees,
                "skipped": skipped, "people": self.data["people"]}

    def import_people_file(self):
        path = self._ask_open()
        if not path:
            return {"ok": False, "cancelled": True}
        try:
            with open(path, "r", encoding="utf-8-sig") as handle:
                return self.import_people(handle.read())
        except OSError as error:
            return {"ok": False, "error": str(error)}

    def export_people(self):
        path = self._ask_save("staff_list.csv", "CSV file (*.csv)")
        if not path:
            return {"ok": False, "cancelled": True}
        try:
            write_people_csv(path, self.data["people"])
            return {"ok": True, "path": path}
        except OSError as error:
            return {"ok": False, "error": str(error)}

    # ---------- flights ----------
    def save_flight(self, flight):
        flight = flight or {}
        number = str(flight.get("flightNo", "")).strip().upper()
        origin = str(flight.get("origin", "")).strip().upper()
        destination = str(flight.get("destination", "")).strip().upper()
        if not (number and origin and destination):
            return {"ok": False, "error": "Flight number, from and to are all needed."}
        dep = normalise_time(flight.get("depTime", "")) or str(
            flight.get("depTime", "")).strip()
        record = {
            "flightNo": number, "origin": origin, "destination": destination,
            "depTime": dep,
            "arrTime": normalise_time(flight.get("arrTime", "")) or str(
                flight.get("arrTime", "")).strip(),
            "daypart": flight.get("daypart") or daypart_of(dep),
        }
        added, updated = merge_flights(self.data["flights"], [record])
        self._save()
        return {"ok": True, "added": added, "updated": updated,
                "flights": self.data["flights"], "sectors": self._sectors(),
                "routes": multi_city_routes(self.data["flights"])}

    def delete_flight(self, flight_no, origin, destination):
        before = len(self.data["flights"])
        self.data["flights"] = [
            f for f in self.data["flights"]
            if not (f.get("flightNo") == flight_no
                    and f.get("origin") == origin
                    and f.get("destination") == destination)]
        self._save()
        return {"ok": True, "removed": before - len(self.data["flights"]),
                "flights": self.data["flights"], "sectors": self._sectors(),
                "routes": multi_city_routes(self.data["flights"])}

    def import_flights(self, text, replace=False):
        flights, skipped = parse_flights_text(text or "")
        if not flights:
            return {"ok": False,
                    "error": "No flight could be read. Each line needs a flight "
                             "number and two airports, e.g. ET-154 AWA ADD 08:15"}
        added, updated = merge_flights(self.data["flights"], flights, replace=replace)
        self._save()
        sectors = sorted({f["origin"] + "-" + f["destination"] for f in flights})
        return {"ok": True, "added": added, "updated": updated,
                "skipped": skipped, "importedSectors": sectors,
                "flights": self.data["flights"], "sectors": self._sectors(),
                "routes": multi_city_routes(self.data["flights"])}

    def import_flights_file(self):
        path = self._ask_open()
        if not path:
            return {"ok": False, "cancelled": True}
        try:
            with open(path, "r", encoding="utf-8-sig") as handle:
                return self.import_flights(handle.read())
        except OSError as error:
            return {"ok": False, "error": str(error)}

    def export_flights(self):
        path = self._ask_save("flights.csv", "CSV file (*.csv)")
        if not path:
            return {"ok": False, "cancelled": True}
        try:
            write_flights_csv(path, self.data["flights"])
            return {"ok": True, "path": path}
        except OSError as error:
            return {"ok": False, "error": str(error)}

    # ---------- templates & reasons ----------
    CAPS_SETTINGS = ("defaultChargeCode",)

    def save_settings(self, settings):
        for key, value in (settings or {}).items():
            if isinstance(value, str):
                self.data["settings"][key] = (
                    value.strip().upper() if key in self.CAPS_SETTINGS else value)
        self._save()
        return {"ok": True, "settings": self.data["settings"]}

    def reset_templates(self):
        self.data["settings"]["newTicketTemplate"] = DEFAULT_NEW_TICKET_TEMPLATE
        self.data["settings"]["rebookTemplate"] = DEFAULT_REBOOK_TEMPLATE
        self.data["settings"]["dormTemplate"] = DEFAULT_DORM_TEMPLATE
        self.data["settings"]["dormReason"] = DEFAULT_DORM_REASON
        self._save()
        return {"ok": True, "settings": self.data["settings"]}

    def save_reasons(self, reasons):
        cleaned = []
        for reason in (reasons or []):
            label = str(reason.get("label", "")).strip().upper()
            if label:
                cleaned.append({"label": label,
                                "purposeLine": str(reason.get("purposeLine", ""))})
        self.data["reasons"] = cleaned
        self._save()
        return {"ok": True, "reasons": self.data["reasons"]}

    # ---------- history ----------
    def add_history(self, subject, body, kind=""):
        if not body:
            return {"ok": False, "history": self.data["history"]}
        # microseconds keep the key unique even for two mails in the same second
        stamp = datetime.datetime.now().isoformat(timespec="microseconds")
        used = {h.get("savedAt") for h in self.data["history"]}
        while stamp in used:
            stamp += "1"
        self.data["history"].insert(0, {
            "savedAt": stamp,
            "kind": kind, "subject": subject, "body": body})
        del self.data["history"][200:]
        self._save()
        return {"ok": True, "history": self.data["history"]}

    def list_history(self):
        return self.data["history"]

    def delete_history(self, saved_at):
        self.data["history"] = [h for h in self.data["history"]
                                if h.get("savedAt") != saved_at]
        self._save()
        return {"ok": True, "history": self.data["history"]}

    def reopen_history(self, saved_at):
        for item in self.data["history"]:
            if item.get("savedAt") == saved_at:
                to_addr, cc_addr = self.recipients_for(item.get("kind", ""))
                return {"message": open_in_outlook(
                    item.get("subject", ""), item.get("body", ""),
                    to_addr, cc_addr)}
        return {"message": "That mail is no longer in the list."}

    # ---------- share & backup ----------
    def share_info(self):
        return {
            "dataPath": data_path(),
            "folder": os.path.dirname(data_path()),
            "embedded": bool(bundled_path("data.json")),
            "beside": os.path.exists(os.path.join(app_dir(), "data.json")),
            "buildTarget": os.path.join(app_dir(), "data.json"),
            "people": len(self.data["people"]),
            "flights": len(self.data["flights"]),
            "reasons": len(self.data["reasons"]),
            "history": len(self.data["history"]),
        }

    def write_build_snapshot(self):
        target = os.path.join(app_dir(), "data.json")
        try:
            write_snapshot(self.data, target)
            return {"ok": True, "path": target}
        except OSError as error:
            return {"ok": False, "error": str(error)}

    def export_backup(self):
        path = self._ask_save("ticket_mailer_backup.json", "JSON file (*.json)")
        if not path:
            return {"ok": False, "cancelled": True}
        try:
            with open(path, "w", encoding="utf-8") as handle:
                json.dump(self.data, handle, indent=1, ensure_ascii=False)
            return {"ok": True, "path": path}
        except OSError as error:
            return {"ok": False, "error": str(error)}

    def import_backup(self):
        path = self._ask_open()
        if not path:
            return {"ok": False, "cancelled": True}
        try:
            with open(path, "r", encoding="utf-8") as handle:
                raw = json.load(handle)
        except (OSError, ValueError) as error:
            return {"ok": False, "error": "That file could not be read. " + str(error)}
        self.data = merge_defaults(raw)
        self._save()
        return {"ok": True, "bootstrap": self.bootstrap()}

    def open_data_folder(self):
        folder = os.path.dirname(data_path())
        try:
            if sys.platform.startswith("win"):
                os.startfile(folder)  # type: ignore[attr-defined]
            else:
                webbrowser.open("file://" + folder)
            return {"ok": True, "path": folder}
        except Exception as error:  # noqa: BLE001
            return {"ok": False, "error": str(error), "path": folder}

    # ---------- native file dialogs ----------
    def _ask_save(self, suggested, file_type):
        if self.window is None:
            return ""
        try:
            import webview
            result = self.window.create_file_dialog(
                webview.SAVE_DIALOG, save_filename=suggested,
                file_types=(file_type, "All files (*.*)"))
        except Exception:  # noqa: BLE001
            return ""
        if not result:
            return ""
        return result if isinstance(result, str) else result[0]

    def _ask_open(self):
        if self.window is None:
            return ""
        try:
            import webview
            result = self.window.create_file_dialog(
                webview.OPEN_DIALOG, allow_multiple=False,
                file_types=("Data files (*.csv;*.txt;*.json)", "All files (*.*)"))
        except Exception:  # noqa: BLE001
            return ""
        if not result:
            return ""
        return result if isinstance(result, str) else result[0]


# ----------------------------------------------------------------------
#  THE WINDOW
# ----------------------------------------------------------------------
def ui_html():
    """The interface: ui.html beside the program, or baked into the .exe."""
    for candidate in (os.path.join(app_dir(), "ui.html"),
                      bundled_path("ui.html"),
                      os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                   "ui.html")):
        if candidate and os.path.exists(candidate):
            with open(candidate, "r", encoding="utf-8") as handle:
                return handle.read()
    return ("<body style=\"font-family:Segoe UI,sans-serif;padding:40px\">"
            "<h2>ui.html is missing</h2><p>Keep ui.html in the same folder as "
            "the program, or rebuild with build_exe.bat.</p></body>")


LOGO_NAMES = ("logo.png", "logo.jpg", "logo.jpeg", "logo.gif", "logo.svg")


def logo_file():
    """Your own company logo, if you dropped one into the assets folder.

    Put a file called logo.png (or .jpg / .svg) next to the program in
    assets\\ and the app shows it instead of the built-in mark.
    """
    for name in LOGO_NAMES:
        for candidate in (os.path.join(app_dir(), "assets", name),
                          os.path.join(app_dir(), name),
                          bundled_path(name),
                          bundled_path(os.path.join("assets", name)),
                          os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                       "assets", name)):
            if candidate and os.path.exists(candidate):
                return candidate
    return ""


def logo_data_uri():
    """The logo as a data: URI so the window can show it directly."""
    path = logo_file()
    if not path:
        return ""
    kind = "image/svg+xml" if path.lower().endswith(".svg") else (
        "image/jpeg" if path.lower().endswith((".jpg", ".jpeg")) else
        "image/gif" if path.lower().endswith(".gif") else "image/png")
    try:
        with open(path, "rb") as handle:
            return "data:" + kind + ";base64," + base64.b64encode(
                handle.read()).decode("ascii")
    except OSError:
        return ""


# Any of these names work for the .exe / window icon, so you do not have to
# remember one exact spelling.
ICON_NAMES = ("icon.ico", "logo.ico", "app.ico", "ticketmailer.ico")


def is_real_ico(path):
    """True only for a genuine .ico (a renamed .png is a common mistake)."""
    try:
        with open(path, "rb") as handle:
            head = handle.read(4)
    except OSError:
        return False
    # ICONDIR: reserved=0, type=1 (icon)
    return len(head) == 4 and head[0] == 0 and head[1] == 0 and head[2] == 1 and head[3] == 0


def icon_file(require_valid=True):
    """The .ico used for the window and the taskbar."""
    here = os.path.dirname(os.path.abspath(__file__))
    for name in ICON_NAMES:
        for candidate in (os.path.join(app_dir(), "assets", name),
                          os.path.join(app_dir(), name),
                          bundled_path(name),
                          bundled_path(os.path.join("assets", name)),
                          os.path.join(here, "assets", name)):
            if candidate and os.path.exists(candidate):
                if not require_valid or is_real_ico(candidate):
                    return candidate
    return ""


def png_size(path):
    """(width, height) of a PNG, using the standard library only."""
    try:
        with open(path, "rb") as handle:
            head = handle.read(24)
        if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
            return (0, 0)
        return (int.from_bytes(head[16:20], "big"),
                int.from_bytes(head[20:24], "big"))
    except (OSError, IndexError):
        return (0, 0)


def write_ico_from_pngs(entries, target):
    """Write a real .ico. `entries` is [(size, png_bytes), ...].

    Windows Vista and later read PNG-compressed icon entries directly, so no
    bitmap conversion is needed.
    """
    import struct
    entries = sorted(entries, key=lambda e: e[0])
    offset = 6 + 16 * len(entries)
    header = struct.pack("<HHH", 0, 1, len(entries))
    directory = b""
    for size, blob in entries:
        dim = 0 if size >= 256 else size
        directory += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32,
                                 len(blob), offset)
        offset += len(blob)
    with open(target, "wb") as handle:
        handle.write(header + directory + b"".join(blob for _s, blob in entries))
    return target


def make_icon(source="", target=""):
    """Build assets/icon.ico from your logo. Returns (ok, message)."""
    source = source or logo_file()
    if not source:
        return False, ("No logo found. Put your picture in the assets folder "
                       "as logo.png and run this again.")
    if source.lower().endswith(".ico"):
        return False, "That is already an .ico file."
    if not source.lower().endswith(".png"):
        return False, ("Only .png can be turned into an icon automatically. "
                       "Save your logo as assets/logo.png first.")

    target = target or os.path.join(app_dir(), "assets", "icon.ico")
    try:
        os.makedirs(os.path.dirname(target), exist_ok=True)
    except OSError:
        pass

    sizes = [16, 24, 32, 48, 64, 128, 256]
    try:
        from PIL import Image  # optional, installed by build_exe.bat
        import io
        base = Image.open(source).convert("RGBA")
        if base.width != base.height:          # pad to a square first
            side = max(base.width, base.height)
            square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            square.paste(base, ((side - base.width) // 2,
                                (side - base.height) // 2))
            base = square
        entries = []
        for size in sizes:
            buf = io.BytesIO()
            base.resize((size, size), Image.LANCZOS).save(buf, format="PNG")
            entries.append((size, buf.getvalue()))
        write_ico_from_pngs(entries, target)
        return True, ("Built " + target + " from " + os.path.basename(source)
                      + " (" + ", ".join(str(s) for s in sizes) + " px)")
    except ImportError:
        pass

    # No Pillow: a single-size icon still works if the picture is small enough.
    width, height = png_size(source)
    if width == 0:
        return False, "That file does not look like a PNG."
    if width != height:
        return False, ("The picture must be square to build an icon without "
                       "Pillow. Run:  python -m pip install pillow")
    if width > 256:
        return False, ("The picture is " + str(width) + "px; an icon may not be "
                       "larger than 256px. Install Pillow so it can be resized:"
                       "  python -m pip install pillow")
    with open(source, "rb") as handle:
        blob = handle.read()
    write_ico_from_pngs([(width, blob)], target)
    return True, "Built " + target + " from " + os.path.basename(source)


def set_window_icon(icon_path):
    """Put the icon on the window and the taskbar button.

    In a built .exe Windows already uses the icon compiled into the file;
    this also covers running from source, where it would otherwise show the
    plain Python icon. Never raises - a missing icon is not worth a crash.
    """
    if not (sys.platform.startswith("win") and icon_path):
        return False
    try:
        import ctypes
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        IMAGE_ICON, LR_LOADFROMFILE, LR_DEFAULTSIZE = 1, 0x10, 0x40
        WM_SETICON, ICON_SMALL, ICON_BIG = 0x0080, 0, 1

        big = user32.LoadImageW(None, icon_path, IMAGE_ICON, 0, 0,
                                LR_LOADFROMFILE | LR_DEFAULTSIZE)
        small = user32.LoadImageW(None, icon_path, IMAGE_ICON, 16, 16,
                                  LR_LOADFROMFILE)
        if not big and not small:
            return False

        titles = []

        @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
        def each_window(hwnd, _lparam):
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                if APP_NAME.lower() in buf.value.lower():
                    titles.append(hwnd)
            return True

        user32.EnumWindows(each_window, 0)
        for hwnd in titles:
            if big:
                user32.SendMessageW(hwnd, WM_SETICON, ICON_BIG, big)
            if small:
                user32.SendMessageW(hwnd, WM_SETICON, ICON_SMALL, small)
        return bool(titles)
    except Exception:  # noqa: BLE001 - cosmetic only
        return False


def set_windows_app_id():
    """Makes Windows use our own icon on the taskbar instead of python.exe."""
    if not sys.platform.startswith("win"):
        return
    try:
        import ctypes
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
            "TicketMailer.Desktop.1")
    except Exception:  # noqa: BLE001
        pass


def run_gui():
    """Opens the real window (Edge WebView2 on Windows)."""
    try:
        import webview
    except ImportError:
        print("The window toolkit 'pywebview' is not installed.")
        print("")
        print("Install it with:")
        print("    python -m pip install pywebview")
        print("")
        print("Then start the app again. (build_exe.bat does this for you.)")
        return 2

    set_windows_app_id()
    api = Api()
    window = webview.create_window(
        APP_NAME,
        html=ui_html(),
        js_api=api,
        width=1440,
        height=900,
        min_size=(1120, 700),
        background_color="#0B1220",
        text_select=True,
    )
    api.window = window

    icon = icon_file()

    def paint_icon():
        """pywebview does not always apply icon= on Windows, so do it here."""
        import threading
        import time

        def worker():
            for _ in range(20):          # the window may take a moment
                if set_window_icon(icon):
                    return
                time.sleep(0.25)
        if icon and sys.platform.startswith("win"):
            threading.Thread(target=worker, daemon=True).start()

    paint_icon()
    try:
        if icon:
            webview.start(icon=icon)
        else:
            webview.start()
    except TypeError:
        # older pywebview builds do not accept icon=
        webview.start()
    except Exception as error:  # noqa: BLE001
        print("The window could not be opened: " + str(error))
        print("")
        print("On Windows this usually means the Edge WebView2 runtime is")
        print("missing. Install it (free, from Microsoft):")
        print("    https://developer.microsoft.com/microsoft-edge/webview2/")
        return 3
    return 0


def main():
    if "--selftest" in sys.argv:
        return selftest("--quiet" not in sys.argv)
    if "--make-icon" in sys.argv:
        ok, message = make_icon()
        print(message)
        return 0 if ok else 1
    if "--icon-check" in sys.argv:
        found = icon_file()
        raw = icon_file(require_valid=False)
        print("logo picture : " + (logo_file() or "none"))
        print("icon file    : " + (found or "none"))
        if raw and not found:
            print("PROBLEM      : " + raw + " is not a real .ico file")
            print("               (a .png renamed to .ico does not work)")
        if not raw:
            print("PROBLEM      : no icon found. Accepted names in assets\\ are:")
            print("               " + ", ".join(ICON_NAMES))
        return 0 if found else 1
    if "--version" in sys.argv:
        print(APP_NAME + " " + APP_VERSION)
        print("python " + sys.version.split()[0] + " on " + sys.platform)
        print("data file: " + data_path())
        print("icon: " + (icon_file() or "not found"))
        return 0
    return run_gui()

def selftest(verbose=True):
    """Checks the engine without opening a window.

    Never raises: it reports every failure and returns 1, so the build script
    can show you exactly what went wrong.
    """
    results = []

    def check(label, got, expected=None, contains=None):
        try:
            if contains is not None:
                ok = contains in got
                detail = "" if ok else "missing: " + repr(contains)
            else:
                ok = got == expected
                detail = "" if ok else "got " + repr(got) + " expected " + repr(expected)
        except Exception as error:          # noqa: BLE001 - report, never crash
            ok = False
            detail = "error: " + repr(error)
        results.append((label, ok, detail))
        return ok

    print(APP_NAME + " " + APP_VERSION + " self-test")
    print("python " + sys.version.split()[0] + " on " + sys.platform)
    print("")

    try:
        data = merge_defaults({})
        data["flights"] = [{"flightNo": "ET-154", "origin": "AWA",
                            "destination": "ADD", "depTime": "08:15",
                            "arrTime": "09:10", "daypart": "morning"}]

        # --- the ID rule
        check("ID 36154 is an employee", classify_id("36154")[0], "employee")
        check("ID 104112 is a trainee", classify_id("104112")[0], "trainee")
        check("ID 210447 is an employee", classify_id("210447")[0], "employee")
        check("odd ID is flagged", classify_id("1234567")[1], False)

        # --- reading a pasted staff list
        people, skipped = parse_people_text(
            "36154\tGETNET GEZAHEGN ENGIDA" + NL +
            "104112 NATNAEL BIRHANU ASSEFA" + NL +
            "210447,MEKDES GIRMA WOLDE")
        check("3 people read from a paste", len(people), 3)
        check("nothing skipped", len(skipped), 0)
        check("types detected",
              [p["kind"] for p in people], ["employee", "trainee", "employee"])
        check("header row ignored",
              len(parse_people_text("ID,NAME" + NL + "36154,ABC DEF")[0]), 1)

        # --- reading a pasted flight list
        flights, fskipped = parse_flights_text(
            "ET-154  AWA  ADD  08:15  09:10" + NL +
            "ET-174, AWA-ADD, 1455, 1550" + NL +
            "ET-153\tADD\tAWA\t06:50\t07:45")
        check("3 flights read", len(flights), 3)
        check("no flight line skipped", len(fskipped), 0)
        if len(flights) == 3:
            check("flight number kept", flights[0]["flightNo"], "ET-154")
            check("sector split", flights[1]["origin"] + "-" + flights[1]["destination"],
                  "AWA-ADD")
            check("0000 time understood", flights[1]["depTime"], "14:55")
            check("time of day derived", flights[1]["daypart"], "afternoon")
        check("time 0815 -> 08:15", normalise_time("0815"), "08:15")
        check("time 8:15 -> 08:15", normalise_time("8:15"), "08:15")

        # --- dates
        today = datetime.date.today()
        check("tomorrow", parse_loose_date("tomorrow"),
              today + datetime.timedelta(days=1))
        check("today", parse_loose_date("today"), today)
        check("plain number", parse_loose_date("3"),
              today + datetime.timedelta(days=3))
        check("iso date", parse_loose_date("2026-09-18"), datetime.date(2026, 9, 18))
        check("slashed date", parse_loose_date("18/09/2026"), datetime.date(2026, 9, 18))
        check("date wording", format_date("2026-09-17"), "Sep 17,2026")

        # --- the rebooking e-mail
        rebook = build_email(data, {
            "kind": "rebooking", "origin": "AWA", "destination": "ADD",
            "date": (today + datetime.timedelta(days=1)).isoformat(),
            "daypart": "morning", "flights": ["ET-154", "ET-174"],
            "tickets": ["0712162366863", "0712156444358"],
            "passengers": [], "charge": "EAAMG969"})
        check("rebooking greeting", rebook[1],
              contains="Dear Team" + NL + "Greetings")
        check("rebooking says tomorrow", rebook[1],
              contains="tickets for tomorrow ")
        check("both flights joined", rebook[1], contains="on ET-154 OR ET-174.")
        check("sector line", rebook[1], contains="( AWA-ADD)")
        check("ticket list", rebook[1],
              contains="* 0712162366863" + NL + NL + "* 0712156444358")

        # --- the new-ticket e-mail
        new_ticket = build_email(data, {
            "kind": "new_ticket", "origin": "AWA", "destination": "ADD",
            "date": "2026-09-17", "daypart": "any", "flights": [],
            "tickets": [], "charge": "EAAMG969",
            "reason": "PASSPORT REGISTRATION",
            "purpose": "The above listed is traveling for passport registration.",
            "passengers": [{"id": "36154", "name": "GETNET GEZAHEGN ENGIDA"}]})
        check("charge line", new_ticket[1],
              contains="Please process ticket and charge cc EAAMG969")
        check("numbered passenger", new_ticket[1],
              contains="1. 36154 GETNET GEZAHEGN ENGIDA")
        check("sector spaced", new_ticket[1], contains="Sector - AWA - ADD")
        check("departure date", new_ticket[1],
              contains="Departure Date - Sep 17,2026")

        # --- saving and loading
        check("data folder is known", bool(data_path()), True)

    except Exception as error:              # noqa: BLE001 - never crash the build
        import traceback
        results.append(("the self-test itself crashed", False, repr(error)))
        traceback.print_exc()

    failed = [r for r in results if not r[1]]
    if verbose:
        for label, ok, detail in results:
            print(("  ok   " if ok else "  FAIL ") + label +
                  (("   " + detail) if detail else ""))
        print("")
        print("---- rebooking sample ----")
        try:
            print(rebook[1])
        except Exception:
            pass
        print("")
    print("{0} checks, {1} failed".format(len(results), len(failed)))
    if failed:
        print("")
        print("FAILED CHECKS:")
        for label, _ok, detail in failed:
            print("  - " + label + "   " + detail)
        return 1
    print("SELFTEST OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
