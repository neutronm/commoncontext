import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Sql } from "postgres";
import { z } from "zod";

import type { Caller } from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";

export const PROPOSE_CONTEXT_CHANGE_DESCRIPTION =
  "Propose replacement wording for an existing shared context item. This creates a new pending object linked to the original; it never edits the original, and the original remains current unless every participant accepts the replacement.";

type ProposeContextChangeDependencies = {
  sql: Sql;
  caller: Caller;
  publicAppUrl: string;
  domain: Pick<
    DomainApi,
    "createChangeProposal" | "getWorkspaceParticipants"
  >;
};

type ProposeContextChangeInput = {
  object_id: string;
  replacement_text: string;
};

export async function createContextChangeResult(
  dependencies: ProposeContextChangeDependencies,
  input: ProposeContextChangeInput,
) {
  const participants =
    await dependencies.domain.getWorkspaceParticipants(
      dependencies.sql,
      dependencies.caller.workspaceId,
    );
  const sharedWith = participants.filter(
    (participant) => participant !== dependencies.caller.displayName,
  );
  const proposal = await dependencies.domain.createChangeProposal(
    dependencies.sql,
    {
      caller: dependencies.caller,
      objectId: input.object_id,
      text: input.replacement_text,
      origin: "assistant",
    },
  );
  const reviewUrl = `${dependencies.publicAppUrl.replace(/\/$/, "")}${proposal.reviewPath}`;
  const reviewers =
    sharedWith.length > 0 ? sharedWith.join(" and ") : "another participant";

  return {
    status: "pending_change_review",
    id: proposal.id,
    supersedes_id: input.object_id,
    review_url: reviewUrl,
    shared_with: sharedWith,
    message: `Created a pending change proposal for ${reviewers} to review. The original wording was not edited and remains current unless every participant accepts the replacement.`,
  };
}

export function registerProposeContextChangeTool(
  server: McpServer,
  dependencies: ProposeContextChangeDependencies,
): void {
  server.registerTool(
    "propose_context_change",
    {
      description: PROPOSE_CONTEXT_CHANGE_DESCRIPTION,
      inputSchema: z.object({
        object_id: z
          .string()
          .describe("The ID of the shared context item to replace."),
        replacement_text: z
          .string()
          .describe(
            "The complete replacement statement, in the user's own words.",
          ),
      }),
    },
    async ({ object_id, replacement_text }) => {
      const result = await createContextChangeResult(dependencies, {
        object_id,
        replacement_text,
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
