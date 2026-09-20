import {
  buildDataJson,
  isDesktopFile,
  readDesktopFile,
} from "@/lib/desktopBundle";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  "ticket_mailer.py": "text/x-python; charset=utf-8",
  "ui.html": "text/plain; charset=utf-8",
  "build_exe.bat": "text/plain; charset=utf-8",
  "README.txt": "text/plain; charset=utf-8",
  "requirements.txt": "text/plain; charset=utf-8",
  "data.json": "application/json; charset=utf-8",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "";

  let body: string;
  if (name === "data.json") {
    body = await buildDataJson();
  } else if (isDesktopFile(name)) {
    body = await readDesktopFile(name);
    if (name.endsWith(".bat") || name.endsWith(".txt")) {
      body = body.replace(/\r?\n/g, "\r\n");
    }
  } else {
    return Response.json({ error: "Unknown file" }, { status: 404 });
  }

  return new Response(body, {
    headers: {
      "Content-Type": TYPES[name] ?? "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
