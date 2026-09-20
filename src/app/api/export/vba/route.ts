import { loadExportPayload } from "@/lib/exportData";
import { generateVbaModule } from "@/lib/generateVba";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await loadExportPayload();
  const source = generateVbaModule(payload);
  return new Response(source, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="TicketMailer.bas"',
    },
  });
}
