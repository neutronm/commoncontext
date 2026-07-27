import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Sql } from "postgres";
import { z } from "zod";

import type { Caller, ObjectType } from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";

export const ADD_PRIVATE_CONTEXT_DESCRIPTION =
  "Save an item as private context for the current user. The item is visible only to its owner and is never included in another participant's shared context.";

type AddPrivateContextDependencies = {
  sql: Sql;
  caller: Caller;
  domain: Pick<DomainApi, "createPrivateContext">;
};

type AddPrivateContextInput = {
  text: string;
  type: ObjectType;
};

export async function createPrivateContextResult(
  dependencies: AddPrivateContextDependencies,
  input: AddPrivateContextInput,
) {
  const context = await dependencies.domain.createPrivateContext(
    dependencies.sql,
    {
      caller: dependencies.caller,
      text: input.text,
      type: input.type,
    },
  );

  return {
    status: "created",
    id: context.id,
    visibility: "private",
    owner: dependencies.caller.displayName,
    message: `Saved as private context. Only ${dependencies.caller.displayName} can see this item.`,
  };
}

export function registerAddPrivateContextTool(
  server: McpServer,
  dependencies: AddPrivateContextDependencies,
): void {
  server.registerTool(
    "add_private_context",
    {
      description: ADD_PRIVATE_CONTEXT_DESCRIPTION,
      inputSchema: z.object({
        text: z
          .string()
          .describe("The private context item, in the user's own words."),
        type: z.enum([
          "decision",
          "perspective",
          "task",
          "blocker",
          "open_question",
          "source_document",
        ]),
      }),
    },
    async ({ text, type }) => {
      const result = await createPrivateContextResult(dependencies, {
        text,
        type,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
