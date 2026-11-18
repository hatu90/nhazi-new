import { getContainer } from "@/server/container";
import { authedRoute, ok } from "@/server/http/route";

// null when the account has no current subscription
export const GET = authedRoute(async ({ actor }) => ok(await getContainer().getMySubscription.execute(actor)));
