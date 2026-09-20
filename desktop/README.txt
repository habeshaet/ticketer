=======================================================================
 TICKET MAILER - desktop app for ticketing e-mails
=======================================================================
 Writes your "new ticket" and "rebooking" e-mails and hands them to
 Outlook. Everything runs on your PC - no website, no login, no internet.


-----------------------------------------------------------------------
 A. MAKE THE .EXE  (do this once, on any Windows PC that has internet)
-----------------------------------------------------------------------
 1. Unzip this folder somewhere normal, e.g.  C:\TicketMailer
    (avoid unzipping straight into Downloads or OneDrive)

 2. If Python is not installed yet:
       - go to  https://www.python.org/downloads/
       - download the Windows installer and run it
       - ON THE FIRST SCREEN tick  [x] Add python.exe to PATH
       - click Install Now
     (Python is only needed to BUILD the exe. The finished exe runs on
      PCs that have no Python at all.)

 3. Double-click        build_exe.bat
    It checks Python, installs the build tool, tests the program and
    produces the .exe. It takes 1-3 minutes. When it finishes a folder
    called "dist" opens.

 4. Inside dist you now have:
       TicketMailer.exe     <- the program, with its own icon
       data.json            <- your flights, staff list and wording
       README.txt           <- this file

 5. Copy that whole "dist" folder to any Windows PC. Python is NOT
    needed there. Right-click TicketMailer.exe > Send to > Desktop
    (create shortcut) if you want an icon on the desktop.

 Nothing happens when you double-click build_exe.bat?
    Right-click it > Run as administrator. If Windows SmartScreen warns
    you, choose "More info" > "Run anyway".


-----------------------------------------------------------------------
 B. USING THE APP
-----------------------------------------------------------------------
 The window has a menu down the left with six pages. You will mostly
 live in the first one. The app has its own icon on the window, on the
 taskbar and on the exe itself.

 THEMES
    Top right of the window there is a row of little colour circles
    with the current theme's name beside them.
        - Click a circle to switch straight away (fastest).
        - Or click the name to drop down the full list, which shows a
          colour dot, the name and a short description of each one.
    The five themes are:
        Ethiopian - the default. National green, gold and red.
        Emerald   - slate menu with green highlights
        Indigo    - navy menu with a royal blue highlight
        Midnight  - full dark mode, easy on the eyes at night
        Daylight  - light and airy, a pale menu instead of a dark one
    Either way the whole app changes instantly and the list closes by
    itself. Your choice is saved with the rest of your settings, so it
    is still there next time you open the app - and it travels with the
    exe when you share it. (Press Escape or click away to close the
    list without changing anything.)

 THE LOGO
    The Ethiopian Airlines logo ships with the app. It is shown in the
    sidebar at the top left, and the same mark is used for the .exe
    file, the window and the taskbar icon.

    USING A DIFFERENT LOGO
    You do not edit any code for this - you just replace one picture.

    BEFORE YOU BUILD (working from the unzipped folder)
        Replace          assets\logo.png
        with your own picture, keeping the same name, then restart the
        app. The new logo appears in the sidebar straight away. When you
        next run build_exe.bat it is baked into the .exe as well, so
        colleagues get it too.

    AFTER YOU HAVE ALREADY BUILT THE EXE (no rebuild needed)
        Next to TicketMailer.exe make a folder called
            assets
        and put your picture in it as
            assets\logo.png
        Restart the app. A logo sitting beside the exe always wins over
        the one baked inside, so you can change it any time without
        building again. Delete it and the built-in one comes back.

    Accepted names: logo.png, logo.jpg, logo.jpeg, logo.gif, logo.svg
    Best results: a square picture, about 512x512, with a transparent
    or white background. It is shown in a small white circle, so a very
    wide "logo + company name" banner will look tiny - use just the
    symbol if you have one.

    To change the .exe file icon as well, replace
        assets\icon.ico
    with your own .ico (it should contain the 16, 32, 48 and 256 pixel
    sizes) and rebuild.

 --- COMPOSE --------------------------------------------------------
 1. What do you need?
       o New ticket   - "Please process ticket and charge cc ..."
       o Rebooking    - "Kindly rebook the below listed tickets ..."
       o Dormitory    - "Dear Mr. Addis, ... dormitory arrangement ..."

    A small tag under the three buttons tells you WHICH GROUP the mail
    will go to - "Ticketing group" or "Dormitory group". The addresses
    themselves are not shown on this screen; rest the mouse on the tag
    to see them, or open the Templates page. The two groups never mix.

 2. Flight
       Direct or Multi-city?
                    : the two buttons at the top of the Flight box.

       MULTI-CITY (a trip through a connection, e.g. AWA-ADD-DIR)
       Route        : pick AWA-ADD-DIR, AWA-ADD-JIJ, DIR-ADD-AWA,
                      JIJ-ADD-AWA ... The list builds itself from your
                      flights: if you have AWA-ADD and ADD-DIR, then
                      AWA-ADD-DIR appears on its own. Add a new flight
                      and any new connection shows up automatically.
       Flights      : each leg gets its own list and EVERY FLIGHT OF
                      THE DAY is shown - there is no morning /
                      afternoon / evening filter on a multi-city trip.
                      Tick one or more on each leg.
       The mail then reads:
                      Sector - AWA - ADD - DIR
                      Preferred Flight - AWA-ADD: ET-154 OR ET-174 /
                                         ADD-DIR: ET-121
                      and a rebooking says "( AWA-ADD-DIR)".

       DIRECT
       Sector       : pick AWA-ADD, ADD-DIR, JIJ-ADD ...
       Time of day  : Any / Morning / Afternoon / Evening
                      (morning = before 12:00, afternoon = 12:00-16:59,
                       evening = 17:00 onwards)
       Flights      : the matching flights are listed one per line -
                      flight number, departure and arrival time, and
                      the time of day. Click a line to tick it; tick a
                      second one and the mail says "ET-154 OR ET-174".
                      Click again to untick, or press "Clear".
                      "Select all" ticks every flight shown.
       Date         : pick it from the calendar - click the date box
                      and choose a day. The quick buttons Today /
                      Tomorrow / +2 days / +1 week fill it in with one
                      click. The green line underneath confirms how it
                      will be written, e.g. "tomorrow Sep 18,2026".

 3. Then it depends on what you chose in step 1:

    IF YOU PICKED "REBOOKING"
       You only fill in the ticket numbers. Paste them any way you
       like - commas, spaces or one per line. Nothing else is asked
       for: no passenger list, no reason, no charge code. Just the
       tickets, the flight and the date.

    IF YOU PICKED "DORMITORY"
       No flight, no charge code and no travel reason are asked for.
       Trainees     : the list shows TRAINEES ONLY - instructors and
                      other staff never appear, so you cannot add one
                      by mistake. (A trainee is a 6 digit ID starting
                      with 1.) Search, then click to add.
       Reason       : pre-filled with "Completion of training at their
                      respective stage's". Change it for one mail here,
                      or change it for good on the Templates page.
       The mail goes to the DORMITORY group, not to ticketing.

    IF YOU PICKED "NEW TICKET"
       Reason       : passport registration, ferry return, stage
                      completed by trainee, ground class, flight
                      training, medical renewal.
       Charge cc    : filled in for you from the code saved on the
                      Templates page.
       Passengers   : type an ID number or part of a name and press
                      ENTER, or double-click a result. The name is
                      filled in for you. "+ Not in the list" covers
                      anyone who is not in your sheet.
       Extra remark : one optional sentence before the sign-off.

 4. The e-mail
       The preview on the right updates as you work.
       Open in Outlook  - creates the message in Outlook and shows it
                          on screen. YOU press Send. Nothing is sent
                          automatically.
       Copy body        - puts the text on the clipboard.
       Copy all         - subject + body.
       Save .txt        - writes it to a file.
       Keep             - stores it in the History page.

 CAPITALS
    Names, flight numbers, airports and the charge code are always
    written in CAPITALS - the boxes convert what you type as you type
    it, so what you see on screen is exactly what goes into the mail.

 THE SCREEN ADJUSTS ITSELF
    On a normal size window each of the three columns scrolls on its
    own, so a long flight list can never push the e-mail or the Send
    button off the bottom - you never have to scroll the whole page to
    reach something. The preview grows taller on a bigger monitor. On a
    small or narrow window the app falls back to scrolling the page in
    the ordinary way.

 --- STAFF LIST -----------------------------------------------------
 Your employees and trainees. The type is worked out from the ID:

       6 digits starting with 1  ->  TRAINEE      (e.g. 104112)
       5 digits                  ->  EMPLOYEE     (e.g. 36154)
       6 digits starting with 2  ->  EMPLOYEE     (e.g. 210447)

 To load your sheet: copy the ID and NAME columns in Excel, paste them
 into the big box and press "Import paste". Tab, comma or a single
 space between the two columns all work, and the order does not matter.
 Pasting the same sheet again never creates duplicates - rows with the
 same ID are just updated. Tick "Replace the whole list" to start over.
 You can also "Import CSV file" or "Export CSV".

 --- FLIGHTS --------------------------------------------------------
 The flight helper list behind the Compose tab. Add, edit or delete
 flights one at a time on the right.

 IMPORTING A WHOLE FLIGHT LIST
    Copy the rows out of Excel and paste them into the "Import a
    flight list" box, then press "Import paste". All of these work:

        ET-154  AWA  ADD  08:15  09:10
        ET-174, AWA-ADD, 1455, 1550
        ET-153  ADD  AWA  0650  0745  morning

    - the two airports may be separate columns or written AWA-ADD
    - times may be 08:15, 8:15, 0815 or 08.15
    - a header row (FLIGHT, FROM, TO ...) is ignored automatically
    - the time of day is worked out from the departure time unless
      you write morning / afternoon / evening yourself
    - importing the same flight twice updates it, never duplicates

    "Import CSV" reads the same thing from a file, and "Export CSV"
    writes your current list out so you can edit it in Excel.

 --- TEMPLATES ------------------------------------------------------
 TWO GROUPS OF PEOPLE
    Ticketing group - where new tickets and rebooking requests go.
    Dormitory group - where dormitory requests go.
    Each has its own "Send to" and "Cc" box. Put several addresses in
    one box by separating them with a semicolon. A dormitory request
    never goes to the ticketing group, and the other way round.

 NOT RECEIVING YOUR OWN MAIL
    If your own address is in one of the Cc boxes you will get a copy of
    everything you send. Two ways to stop that:

    1. Simply delete your address from the "Cc" box - the mail then only
       goes to the others.

    2. Better: type your address into "Your own e-mail" in the Defaults
       card at the top of the Templates page. From then on it is removed
       from To and Cc automatically, every time, even if somebody pastes
       it back into a group later. You can list more than one of your
       addresses, separated by a semicolon.

    Matching ignores capitals and the "Name <address>" form, so it works
    however the address was typed.

    NOTE: a copy in your SENT folder is normal and is not affected by
    this - that is Outlook keeping your own record. This setting only
    stops the mail arriving back in your INBOX. If you still receive a
    copy after setting it, the address is probably inside a distribution
    group (the whole group is one address to Outlook), or you have an
    Outlook rule; ask IT to take you off that group.

 THREE TEMPLATES
    New ticket, Rebooking and Dormitory each have their own subject
    line and wording. The dormitory one also has a Reason line.
    Useful placeholders for the dormitory template:
        {TRAINEES}     the numbered student list with their ID numbers
        {DORM_REASON}  the reason line
        {COUNT}        how many students
        {DATE}         the arrival date, e.g. Sep 19,2026
        {SIGNOFF}      your sign off and signature

 The exact wording of both e-mails, your charge code, the To/Cc
 addresses and your sign-off / signature. Placeholders you can use:

    {CHARGE_CODE}    EAAMG969
    {PASSENGERS}     1. 36154 GETNET GEZAHEGN ENGIDA
    {TICKETS}        * 0712162366863
    {SECTOR}         AWA-ADD
    {SECTOR_SPACED}  AWA - ADD
    {DATE}           Sep 17,2026
    {DATE_PHRASE}    tomorrow Sep 18,2026
    {FLIGHTS}        ET-154 OR ET-174
    {FLIGHTS_PHRASE}  on ET-154 OR ET-174
    {FLIGHTS_LINE}   Preferred Flight - ET-154 (morning flight)
    {REASON}         PASSPORT REGISTRATION
    {PURPOSE}        the sentence attached to that reason
    {NAMES} {COUNT} {REMARKS} {SIGNOFF}

 "Reset wording to factory default" puts the original text back.

 --- HISTORY --------------------------------------------------------
 The last 200 mails you created. Re-copy them or re-open them in
 Outlook with one click.


 --- SHARE & BACKUP -------------------------------------------------
 Tells you exactly where your data is, and gives your lists to other
 people. See section C.


-----------------------------------------------------------------------
 C. YOUR DATA, AND GIVING THE APP TO COLLEAGUES
-----------------------------------------------------------------------
 Everything you type is saved the moment you change it, into

    ticket_mailer_data.json

 kept next to TicketMailer.exe when that folder is writable, otherwise
 in  C:\Users\<you>\AppData\Roaming\TicketMailer\ .
 The Share & backup tab (and the status line) always shows the exact
 path in use.

 HOW A COLLEAGUE GETS EVERYTHING YOU SET UP

 CHOICE 1 - send the folder            (nothing to rebuild)
    Send them TicketMailer.exe together with the ticket_mailer_data.json
    file sitting beside it. They put both in one folder and open the
    exe - your staff, flights, reasons and wording are all there.

 CHOICE 2 - bake it into the exe       (one single file to send)
    1. In the app, open  Share & backup
    2. Press  "Write data.json for the next build"
    3. Run  build_exe.bat  again
    4. The new dist\TicketMailer.exe now carries your lists INSIDE it.
       Send just that one file to anyone - they open it and continue
       exactly where you left off, even with nothing else in the folder.

 Their later edits are saved on their own PC and never touch yours.
 To push an updated list out again, repeat the same steps and send the
 new file.

 BACKUP / RESTORE / MOVE PC
    Share & backup > "Export backup..." writes one file holding the
    staff list, flights, reasons, wording and history.
    "Restore from backup..." puts it all back on any PC.

 ONE SHARED LIST FOR THE WHOLE TEAM
    Put the folder on a shared network drive with the data file next to
    the exe. Everyone then reads and writes the same list. (Only one
    person should edit the Staff list at a time.)


-----------------------------------------------------------------------
 D. IF SOMETHING GOES WRONG
-----------------------------------------------------------------------
 The build said "the self-test reported a problem"
     From version 2.0 this is only a warning and the build carries on -
     you still get a working exe. The full report is written to
     selftest_log.txt next to build_exe.bat. Open it, and if anything
     says FAIL send that file back for a fix. You can also run the
     check yourself at any time with:
         python ticket_mailer.py --selftest

 The exe has no icon / my logo is not on the exe
     The build looks for an icon file in the assets folder called any of
         icon.ico    logo.ico    app.ico    ticketmailer.ico
     Two things catch people out:

     1. A PICTURE IS NOT AN ICON. Renaming logo.png to logo.ico does
        not work - Windows needs a real .ico file. The build now spots
        this and tells you instead of quietly using the default icon.

     2. If you have no .ico at all but you do have assets\logo.png,
        build_exe.bat now makes the .ico for you automatically (it
        installs a small helper called Pillow the first time).

     To check what the app can see, run:
         python ticket_mailer.py --icon-check
     To build the icon yourself from your logo:
         python ticket_mailer.py --make-icon

     STILL SHOWING THE OLD ICON?
     Windows keeps a cache of icons, so Explorer can show the previous
     one even after a good build. build_exe.bat now refreshes it. If it
     persists: press F5 in the dist folder, or copy the exe to another
     folder, or log out and back in. Right-click the exe > Properties
     to confirm the real icon.

     REMEMBER THERE ARE TWO PICTURES
         assets\logo.png  - the logo INSIDE the window, top left
         assets\icon.ico  - the icon ON the exe, window and taskbar
     Changing logo.png needs no rebuild. Changing icon.ico does.

 "Windows protected your PC" when starting the exe
     Click "More info" then "Run anyway". This appears because the file
     is not code-signed; it is your own build.

 The exe opens and closes instantly
     Open a Command Prompt in the dist folder and run TicketMailer.exe
     from there - the error message will stay on screen. Most often the
     data file is corrupt; delete ticket_mailer_data.json and restart
     (the app will rebuild it from data.json).

 "Open in Outlook" opens another mail program instead
     pywin32 was not installed during the build. Run:
         python -m pip install pywin32
     and build again. The mail still works either way - the badge at the
     top right of the window tells you which one is in use.

 The window is blank, or it will not open at all
     The app draws its interface with the Edge WebView2 runtime. Every
     up-to-date Windows 10 and 11 already has it. If yours does not,
     install it once (free, from Microsoft):
         https://developer.microsoft.com/microsoft-edge/webview2/
     Choose the "Evergreen Standalone Installer".

 Nothing appears when I search a person
     Check the Staff list tab - the list may be empty. Paste your sheet
     there once.

 Antivirus quarantines the exe
     This is a known false positive with PyInstaller. Ask IT to allow
     the file, or run the app directly with:  python ticket_mailer.py

 Rebuilding after a change
     Edit anything in the app itself (staff, flights, wording) - no
     rebuild needed. Only changes to ticket_mailer.py need a rebuild:
     just run build_exe.bat again.


-----------------------------------------------------------------------
 E. RUNNING WITHOUT BUILDING
-----------------------------------------------------------------------
 If you cannot install PyInstaller you can still use the app:

     python -m pip install pywebview
     python ticket_mailer.py

 It behaves exactly the same; it just needs Python on that PC.
 Keep ui.html and the assets folder next to ticket_mailer.py.
 To check the program is healthy without opening a window:

     python ticket_mailer.py --selftest
=======================================================================
