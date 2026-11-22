import { getContainer } from "@/server/container";
import { cronRoute, ok } from "@/server/http/route";

// GET|POST /api/cron/notifications   Daily job: billing periods to close and overdue invoices -> notifications + push.
// Authorization: Bearer $CRON_SECRET (Vercel Cron sends it by itself when CRON_SECRET is set; elsewhere: curl -H "Authorization: Bearer …").
const run = cronRoute(async () => ok(await getContainer().runScheduledNotifications.execute()));
export const GET = run;
export const POST = run;
