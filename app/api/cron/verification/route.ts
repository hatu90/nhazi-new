import { getContainer } from "@/server/container";
import { cronRoute, ok } from "@/server/http/route";

// GET|POST /api/cron/verification   Daily job: properties whose confirmations expired lose `verified`.
// Authorization: Bearer $CRON_SECRET (same as /api/cron/notifications).
const run = cronRoute(async () => ok(await getContainer().refreshVerification.execute()));
export const GET = run;
export const POST = run;
