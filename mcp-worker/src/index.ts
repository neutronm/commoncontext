import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import postgres from "postgres";

import * as domain from "../../src/domain/context";
import { registerGetSharedContextTool } from "./tools/get-shared-context";
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

    let caller;
    try {
      caller = await domain.resolveCaller(sql, token);
    } catch {
      return unauthorized();
    }

    const server = new McpServer({
      name: "Shared Context",
      version: "0.1.0",
    });
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
    registerRespondToContextTool(server, { sql, caller, domain });

    return createMcpHandler(server, {
      route: url.pathname,
      enableJsonResponse: true,
    })(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
