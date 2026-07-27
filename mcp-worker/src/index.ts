import { createMcpHandler } from "agents/mcp";
import postgres from "postgres";

import * as domain from "../../src/domain/context";
import { resolveAuthenticatedCaller } from "./auth";
import { createSharedContextServer } from "./server";
import { registerAddPrivateContextTool } from "./tools/add-private-context";
import { registerGetSharedContextTool } from "./tools/get-shared-context";
import { registerProposeContextChangeTool } from "./tools/propose-context-change";
import { registerProposeSharedContextTool } from "./tools/propose-shared-context";
import { registerRespondToContextTool } from "./tools/respond-to-context";

const WORKSPACE_NAME = "Launch planning";
const TOKEN_ROUTE = /^\/([^/]+)\/mcp$/;

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function unauthorized(): Response {
  return new Response("Unauthorized", { status: 401 });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const route = TOKEN_ROUTE.exec(url.pathname);
    if (!route) return notFound();

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "POST" },
      });
    }

    let token: string;
    try {
      token = decodeURIComponent(route[1]);
    } catch {
      return unauthorized();
    }

    const sql = postgres(env.HYPERDRIVE.connectionString, {
      max: 5,
      fetch_types: false,
    });

    const callerResolution = await resolveAuthenticatedCaller(
      sql,
      token,
      domain.resolveCaller,
    );
    if (callerResolution.status === "unknown_token") return unauthorized();
    const caller = callerResolution.caller;

    const server = createSharedContextServer();
    registerAddPrivateContextTool(server, { sql, caller, domain });
    registerGetSharedContextTool(server, {
      sql,
      caller,
      workspace: WORKSPACE_NAME,
      domain,
    });
    registerProposeSharedContextTool(server, {
      sql,
      caller,
      publicAppUrl: env.PUBLIC_APP_URL,
      domain,
    });
    registerProposeContextChangeTool(server, {
      sql,
      caller,
      publicAppUrl: env.PUBLIC_APP_URL,
      domain,
    });
    registerRespondToContextTool(server, { sql, caller, domain });

    return createMcpHandler(server, {
      route: url.pathname,
      enableJsonResponse: true,
    })(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
