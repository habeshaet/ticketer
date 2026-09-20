import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { badRequest, getSettingsRow, json, str } from "@/lib/server";
import {
  DEFAULT_DORM_REASON,
  DEFAULT_DORM_SUBJECT,
  DEFAULT_DORM_TEMPLATE,
  DEFAULT_NEW_TICKET_SUBJECT,
  DEFAULT_NEW_TICKET_TEMPLATE,
  DEFAULT_REBOOK_SUBJECT,
  DEFAULT_REBOOK_TEMPLATE,
} from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  return json(await getSettingsRow());
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body");
  await getSettingsRow();

  const reset = body.reset === true;
  const patch = {
    defaultChargeCode: str(body.defaultChargeCode).toUpperCase(),
    toEmails: str(body.toEmails),
    ccEmails: str(body.ccEmails),
    dormToEmails: str(body.dormToEmails),
    dormCcEmails: str(body.dormCcEmails),
    myEmail: str(body.myEmail),
    theme: str(body.theme, "ethiopian") || "ethiopian",
    signOff: str(body.signOff),
    signature: str(body.signature),
    newTicketTemplate: reset
      ? DEFAULT_NEW_TICKET_TEMPLATE
      : String(body.newTicketTemplate ?? DEFAULT_NEW_TICKET_TEMPLATE),
    rebookTemplate: reset
      ? DEFAULT_REBOOK_TEMPLATE
      : String(body.rebookTemplate ?? DEFAULT_REBOOK_TEMPLATE),
    newTicketSubject: reset
      ? DEFAULT_NEW_TICKET_SUBJECT
      : str(body.newTicketSubject, DEFAULT_NEW_TICKET_SUBJECT),
    rebookSubject: reset
      ? DEFAULT_REBOOK_SUBJECT
      : str(body.rebookSubject, DEFAULT_REBOOK_SUBJECT),
    dormTemplate: reset
      ? DEFAULT_DORM_TEMPLATE
      : String(body.dormTemplate ?? DEFAULT_DORM_TEMPLATE),
    dormReason: reset
      ? DEFAULT_DORM_REASON
      : str(body.dormReason, DEFAULT_DORM_REASON),
    dormSubject: reset
      ? DEFAULT_DORM_SUBJECT
      : str(body.dormSubject, DEFAULT_DORM_SUBJECT),
  };

  const [row] = await db
    .update(settings)
    .set(patch)
    .where(eq(settings.id, 1))
    .returning();
  return json(row);
}
