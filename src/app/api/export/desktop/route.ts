import { buildDesktopZip } from "@/lib/desktopBundle";

export const dynamic = "force-dynamic";

export async function GET() {
  const zip = await buildDesktopZip();
  return new Response(zip as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="TicketMailer.zip"',
      "Content-Length": String(zip.byteLength),
    },
  });
}
