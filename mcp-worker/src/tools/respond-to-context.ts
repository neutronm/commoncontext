import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Sql } from "postgres";
import { z } from "zod";

import type { Caller } from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";

export const RESPOND_TO_CONTEXT_DESCRIPTION =
  "Record the current user's stance on a shared context item: accept it, decline it, dispute it, or add their own perspective alongside it. This never edits or deletes the original item. Use propose_context_change instead when the user wants replacement wording.";

type RespondToContextDependencies = {
  sql: Sql;
  caller: Caller;
  domain: Pick<DomainApi, "respondToObject">;
};

export function registerRespondToContextTool(
  server: McpServer,
  dependencies: RespondToContextDependencies,
): void {
  server.registerTool(
    "respond_to_context",
    {
      description: RESPOND_TO_CONTEXT_DESCRIPTION,
      inputSchema: z.object({
        object_id: z.string(),
        stance: z
          .enum([
            "acknowledged",
            "accepted",
            "disputed",
            "rejected",
          ])
          .describe(
            "Use 'accepted' to approve, 'rejected' to decline, 'disputed' to challenge, or 'acknowledged' to note without agreement.",
          ),
        response_text: z.string().optional(),
      }),
    },
    async ({ object_id, stance, response_text }) => {
      await dependencies.domain.respondToObject(dependencies.sql, {
        caller: dependencies.caller,
        objectId: object_id,
        stance,
        responseText: response_text,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ status: "recorded", id: object_id }),
          },
        ],
      };
    },
  );
}
