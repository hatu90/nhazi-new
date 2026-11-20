import { getContainer } from "@/server/container";
import { adminRoute, created, ok, parseBody, parseQuery } from "@/server/http/route";
import { createLeasePayloadSchema, tenancyListQuerySchema, toCreateLeaseCommand } from "@/server/modules/tenancy/tenancy.schema";

// GET ?unitId=&status=upcoming|active|ended
export const GET = adminRoute(async ({ request, scope }) =>
  ok(await getContainer().listTenancies.execute({ ...scope, query: parseQuery(tenancyListQuerySchema, request) })));

// POST: creates tenants (by phone), members, handover items and pins the agreement template version
export const POST = adminRoute(async ({ request, scope }) =>
  created(await getContainer().createTenancy.execute(toCreateLeaseCommand(await parseBody(createLeasePayloadSchema, request), scope))));
