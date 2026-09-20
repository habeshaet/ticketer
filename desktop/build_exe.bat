@echo off
REM =====================================================================
REM  Ticket Mailer - build the Windows .exe
REM  Just double-click this file. It does everything.
REM =====================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"
color 0A
title Ticket Mailer - building your exe
echo.
echo  ===============================================
echo    TICKET MAILER  -  building your .exe
echo  ===============================================
echo.

if not exist "ticket_mailer.py" (
    echo  [X] ticket_mailer.py is not in this folder.
    echo      Unzip the whole TicketMailer folder first, then run this file
    echo      from inside it.
    echo.
    pause
    exit /b 1
)

REM ---- 1. find Python --------------------------------------------------
set "PY="
python --version >nul 2>&1 && set "PY=python"
if not defined PY (
    py -3 --version >nul 2>&1 && set "PY=py -3"
)
if not defined PY (
    echo  [X] Python was not found on this PC.
    echo.
    echo      1. Go to  https://www.python.org/downloads/
    echo      2. Run the installer
    echo      3. ON THE FIRST SCREEN tick  [x] Add python.exe to PATH
    echo      4. Install, then run this file again.
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('%PY% --version 2^>^&1') do echo  [1/5] Found %%v

REM ---- 2. the window toolkit ------------------------------------------
echo  [2/5] Installing the window toolkit (pywebview)...
%PY% -m pip install --upgrade pip >pip_log.txt 2>&1
%PY% -m pip install --upgrade pywebview >>pip_log.txt 2>&1
if errorlevel 1 (
    echo  [X] pywebview could not be installed.
    echo      Check your internet connection or company proxy.
    echo      Details are in  pip_log.txt
    echo.
    pause
    exit /b 1
)
echo        ...done

echo  [3/5] Installing the build tool and Outlook support...
%PY% -m pip install --upgrade pyinstaller >>pip_log.txt 2>&1
if errorlevel 1 (
    echo  [X] PyInstaller could not be installed. See pip_log.txt
    echo.
    pause
    exit /b 1
)
%PY% -m pip install --upgrade pywin32 >>pip_log.txt 2>&1
if errorlevel 1 (
    echo        ...Outlook add-on skipped - the default mail app will be used.
) else (
    echo        ...done
)

REM ---- 4. self-test (a warning only - it never stops the build) --------
echo  [4/5] Checking the program...
%PY% ticket_mailer.py --selftest >selftest_log.txt 2>&1
if errorlevel 1 (
    echo.
    echo  [!] The self-test reported a problem. The build will CONTINUE -
    echo      the app itself is very likely still fine. What it said:
    echo  ---------------------------------------------------------------
    powershell -NoProfile -Command "Get-Content selftest_log.txt -Tail 18" 2>nul || type selftest_log.txt
    echo  ---------------------------------------------------------------
    echo      The full report is in  selftest_log.txt
    echo.
) else (
    echo        ...all good
)

REM ---- 5. build --------------------------------------------------------
echo  [5/5] Building TicketMailer.exe - this takes 1-3 minutes...

REM  quotes matter: cmd treats ; as a separator
set "EXTRA=--add-data "ui.html;.""

REM  ---- the .exe icon -------------------------------------------------
REM  any of these names is accepted, so you do not have to guess one
set "ICONFILE="
for %%I in (icon.ico logo.ico app.ico ticketmailer.ico) do (
    if not defined ICONFILE if exist "assets\%%I" set "ICONFILE=assets\%%I"
)

REM  no .ico yet? build one automatically from your logo picture
if not defined ICONFILE (
    if exist "assets\logo.png" (
        echo        no .ico found - building one from assets\logo.png ...
        %PY% -m pip install --quiet --upgrade pillow >>pip_log.txt 2>&1
        %PY% ticket_mailer.py --make-icon
        if exist "assets\icon.ico" set "ICONFILE=assets\icon.ico"
    )
)

set "ICONARG="
if defined ICONFILE (
    REM  make sure it is a real .ico and not a renamed .png
    %PY% ticket_mailer.py --icon-check >icon_log.txt 2>&1
    if errorlevel 1 (
        echo.
        echo  [!] The icon file could not be used:
        type icon_log.txt
        echo      The exe will be built with the default icon.
        echo.
    ) else (
        set "ICONARG=--icon "!ICONFILE!""
        set "EXTRA=!EXTRA! --add-data "!ICONFILE!;.""
        echo        app icon: !ICONFILE!
    )
) else (
    echo.
    echo  [!] No icon found, so the exe will get the plain default one.
    echo      Put your icon in the assets folder as  icon.ico  ^(or logo.ico^),
    echo      or put a square picture there as  logo.png  and run this again -
    echo      it will make the .ico for you.
    echo.
)

for %%L in (logo.png logo.jpg logo.jpeg logo.gif logo.svg) do (
    if exist "assets\%%L" (
        set "EXTRA=!EXTRA! --add-data "assets\%%L;.""
        echo        sidebar logo: assets\%%L
    )
)
if exist "data.json" (
    set "EXTRA=!EXTRA! --add-data "data.json;.""
    echo        your staff + flight lists will be baked INSIDE the exe
)

%PY% -m PyInstaller --onefile --noconsole --clean --name TicketMailer ^
    !ICONARG! !EXTRA! ^
    --distpath "%~dp0dist" --workpath "%~dp0build" --specpath "%~dp0build" ^
    ticket_mailer.py >build_log.txt 2>&1

if not exist "%~dp0dist\TicketMailer.exe" (
    echo.
    echo  [X] The build failed. The last lines of build_log.txt:
    echo  ---------------------------------------------------------------
    powershell -NoProfile -Command "Get-Content build_log.txt -Tail 20" 2>nul || type build_log.txt
    echo  ---------------------------------------------------------------
    echo.
    pause
    exit /b 1
)

if exist "%~dp0data.json" copy /y "%~dp0data.json" "%~dp0dist\data.json" >nul
if exist "%~dp0README.txt" copy /y "%~dp0README.txt" "%~dp0dist\README.txt" >nul

echo.
echo  ===============================================
echo    DONE!
echo  ===============================================
echo.
echo    Your program:
echo       %~dp0dist\TicketMailer.exe
echo.
if exist "%~dp0data.json" (
    echo    Your lists are INSIDE the exe, so you can send that single
    echo    file to a colleague and they get everything you set up.
) else (
    echo    NOTE: no data.json was found, so the exe starts with empty
    echo    lists. Open the app, load your staff and flights, then use
    echo    "Share ^& backup" -^> "Write data.json for the next build"
    echo    and run this file again to bake them in.
)
echo.
echo    Copy the whole "dist" folder anywhere - the PC you copy it to
echo    does NOT need Python.
echo.
if defined ICONARG (
    echo    Still seeing the old icon in Explorer? Windows caches icons.
    echo    Refreshing it now...
    ie4uinit.exe -show >nul 2>&1
    ie4uinit.exe -ClearIconCache >nul 2>&1
    echo    If it still looks wrong, press F5 in the dist folder, or log out
    echo    and back in. The icon inside the .exe itself is correct.
    echo.
)
start "" "%~dp0dist"
pause
