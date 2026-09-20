import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadExportPayload } from "./exportData";

const FILES = [
  "ticket_mailer.py",
  "ui.html",
  "build_exe.bat",
  "README.txt",
  "requirements.txt",
] as const;
/** Binary extras copied verbatim into the zip. */
const BINARY_FILES = ["assets/icon.ico", "assets/icon.png",
  "assets/logo.png"] as const;

export type DesktopFileName = (typeof FILES)[number];

export function isDesktopFile(name: string): name is DesktopFileName {
  return (FILES as readonly string[]).includes(name);
}

export async function readDesktopFile(name: DesktopFileName): Promise<string> {
  const filePath = path.join(process.cwd(), "desktop", name);
  return readFile(filePath, "utf8");
}

/** data.json shipped next to the .exe: flights, staff, reasons, wording. */
export async function buildDataJson(): Promise<string> {
  const payload = await loadExportPayload();
  const data = {
    generatedAt: payload.generatedAt,
    // the desktop app remembers a theme; ship the default so it is explicit
    settings: { theme: "ethiopian", ...payload.settings },
    reasons: payload.reasons.map((r) => ({
      label: r.label,
      purposeLine: r.purposeLine,
    })),
    flights: payload.flights.map((f) => ({
      flightNo: f.flightNo,
      origin: f.origin,
      destination: f.destination,
      depTime: f.depTime,
      arrTime: f.arrTime,
      daypart: f.daypart,
    })),
    people: payload.people.map((p) => ({
      id: p.staffNo,
      name: p.fullName,
      kind: p.kind,
    })),
    history: [],
  };
  return `${JSON.stringify(data, null, 1)}\n`;
}

export async function buildDesktopZip(): Promise<Uint8Array> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const folder = zip.folder("TicketMailer");
  if (!folder) throw new Error("Could not create the zip folder");

  const contents = await Promise.all(FILES.map((name) => readDesktopFile(name)));
  FILES.forEach((name, index) => {
    // .bat and .txt must use CRLF so Notepad and cmd.exe are happy.
    const needsCrlf = name.endsWith(".bat") || name.endsWith(".txt");
    const body = needsCrlf
      ? contents[index].replace(/\r?\n/g, "\r\n")
      : contents[index];
    folder.file(name, body);
  });
  folder.file("data.json", await buildDataJson());

  await Promise.all(
    BINARY_FILES.map(async (name) => {
      const bytes = await readFile(path.join(process.cwd(), "desktop", name));
      folder.file(name, bytes);
    }),
  );

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
