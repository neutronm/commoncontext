import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const SERVER_INSTRUCTIONS =
  "Use get_shared_context to learn which other workspace participants appear in shared_with before responding to affirmative requests to tell, inform, or make someone aware, and whenever new durable project information could help another participant. For affirmative communication intent or inferred relevance, show a one-sentence proposal preview and wait for confirmation before calling propose_shared_context. Never suggest or create a proposal when the user negates communication or says not to share, never proactively surface private context, and do not treat a proposal as a direct message or as agreed context. An explicit affirmative request to add, record, or propose something in shared context already authorizes calling propose_shared_context.";

export function createSharedContextServer(): McpServer {
  return new McpServer(
    {
      name: "Shared Context",
      version: "0.1.0",
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );
}
