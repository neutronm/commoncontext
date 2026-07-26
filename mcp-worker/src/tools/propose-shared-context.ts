import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Sql } from "postgres";
import { z } from "zod";

import type { Caller } from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";

export const PROPOSE_SHARED_CONTEXT_DESCRIPTION =
  "Propose a new item for the shared project context. This does NOT share anything immediately — it creates a pending proposal that the other participants must review and respond to before it becomes shared context. Use this when the user asks to record, save, or add something to the shared project. Always tell the user afterward that the item is pending review and not yet agreed.";

type ProposeSharedContextDependencies = {
  sql: Sql;
  caller: Caller;
  publicAppUrl: string;
  domain: Pick<DomainApi, "createProposal">;
};

export function registerProposeSharedContextTool(
  server: McpServer,
  dependencies: ProposeSharedContextDependencies,
): void {
  server.registerTool(
    "propose_shared_context",
    {
      description: PROPOSE_SHARED_CONTEXT_DESCRIPTION,
      inputSchema: z.object({
        text: z
          .string()
          .describe("The claim, in the user's own words, as a single sentence."),
        type: z.enum([
          "decision",
          "perspective",
          "task",
          "blocker",
          "open_question",
        ]),
        epistemic_status: z
          .enum([
            "verified_fact",
            "reported_fact",
            "perspective",
            "proposal",
          ])
          .describe(
            "Use 'proposal' unless the user is recording something already jointly agreed.",
          ),
      }),
    },
    async ({ text, type, epistemic_status }) => {
      const proposal = await dependencies.domain.createProposal(
        dependencies.sql,
        {
          caller: dependencies.caller,
          text,
          type,
          epistemicStatus: epistemic_status,
        },
      );
      const reviewUrl = `${dependencies.publicAppUrl.replace(/\/$/, "")}${proposal.reviewPath}`;
      const result = {
        status: "pending_review",
        id: proposal.id,
        review_url: reviewUrl,
        shared_with: ["Sara"],
        message:
          "Created as a pending proposal. Sara has not seen or agreed to this yet. It will not appear as shared context until she responds.",
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
