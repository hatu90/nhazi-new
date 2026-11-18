import { NextRequest, NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { getContainer } from "@/server/container";
import { AppError, UnauthorizedError, ValidationError } from "@/server/shared/errors";
import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { idParamsSchema } from "@/server/shared/schema";
import type { IVerifiedIdentity } from "@/server/shared/auth";

/**
 * HTTP edge. Routes stay thin:   parse (zod) -> build Command -> usecase.execute -> respond.
 * Envelope: success `{ data }`, failure `{ error: { code, message, details? } }`.
 */
type Params = Record<string, string>;

export interface IRouteContext {
  request: NextRequest;
  params: Params;
}
export interface IIdentityRouteContext extends IRouteContext {
  identity: IVerifiedIdentity;
}
export interface IAuthedRouteContext extends IRouteContext {
  actor: IActor;
}

export interface IAdminRouteContext extends IAuthedRouteContext {
  scope: IPropertyScope;
}

type NextContext = { params: Promise<Params> };
type Handler<C> = (ctx: C) => Promise<Response>;

export const ok = <T>(data: T) => NextResponse.json({ data }, { status: 200 });
export const noContent = () => new Response(null, { status: 204 });
export const created = <T>(data: T) => NextResponse.json({ data }, { status: 201 });

const bearer = (request: NextRequest): string => {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) throw new UnauthorizedError();
  return token;
};

const toErrorResponse = (err: unknown): Response => {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      { status: err.status },
    );
  }
  console.error(err);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Internal server error" } }, { status: 500 });
};

const guard =
  (build: (request: NextRequest, params: Params) => Promise<Response>) =>
  async (request: NextRequest, ctx: NextContext): Promise<Response> => {
    // Reading request data marks the handler as request-time, so Cache Components never prerenders an API response.
    // Kept outside the try: Next's prerender bail-out is thrown here and must not be turned into a 500.
    void request.headers;
    try {
      return await build(request, await ctx.params);
    } catch (err) {
      return toErrorResponse(err);
    }
  };

/** No credentials required. */
export const publicRoute = (handler: Handler<IRouteContext>) =>
  guard((request, params) => handler({ request, params }));

/** Valid token required, account NOT required (registration). */
export const identityRoute = (handler: Handler<IIdentityRouteContext>) =>
  guard(async (request, params) => {
    const identity = await getContainer().verifyToken.execute({ token: bearer(request) });
    return handler({ request, params, identity });
  });

/** Valid token AND registered, active account required. */
export const authedRoute = (handler: Handler<IAuthedRouteContext>) =>
  guard(async (request, params) => {
    const actor = await getContainer().authenticate.execute({ token: bearer(request) });
    return handler({ request, params, actor });
  });

/** `/api/admin/properties/:propertyId/...`: authenticated + a `scope` ({ actor, propertyId }) for property-scoped commands. */
export const adminRoute = (handler: Handler<IAdminRouteContext>) =>
  authedRoute(async (c) => {
    const { propertyId } = parseParams(idParamsSchema("propertyId"), c.params);
    return handler({ ...c, scope: { actor: c.actor, propertyId } });
  });

// ── input parsing: always zod, always ValidationError ──────────────────────────────
const parse = <S extends ZodType>(schema: S, input: unknown): z.output<S> => {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError("Validation failed", z.flattenError(result.error));
  return result.data;
};

export const parseQuery = <S extends ZodType>(schema: S, request: NextRequest) =>
  parse(schema, Object.fromEntries(request.nextUrl.searchParams));

export const parseParams = <S extends ZodType>(schema: S, params: Params) => parse(schema, params);

export const parseBody = async <S extends ZodType>(schema: S, request: NextRequest) => {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
  return parse(schema, json);
};
