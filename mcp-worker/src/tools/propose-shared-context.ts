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
  domain: Pick<DomainApi, "createProposal" | "getWorkspaceParticipants">;
};

type ProposeSharedContextInput = {
  text: string;
  type: "decision" | "perspective" | "task" | "blocker" | "open_question";
  epistemic_status:
    | "verified_fact"
    | "reported_fact"
    | "perspective"
    | "proposal";
};

function participantList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function proposalMessage(sharedWith: string[]): string {
  if (sharedWith.length === 0) {
    return "Created as a pending proposal. There are no other workspace participants who can see it for review yet. It is not canonical shared context until another participant responds.";
  }

  const participants = participantList(sharedWith);
  const has = sharedWith.length === 1 ? "has" : "have";
  const responds = sharedWith.length === 1 ? "responds" : "respond";
  return `Created as a pending proposal. ${participants} can see it for review but ${has} not agreed to it. It is not canonical shared context until ${participants} ${responds}.`;
}

export async function createProposalResult(
  dependencies: ProposeSharedContextDependencies,
  input: ProposeSharedContextInput,
) {
  const participants =
    await dependencies.domain.getWorkspaceParticipants(
      dependencies.sql,
      dependencies.caller.workspaceId,
    );
  const sharedWith = participants.filter(
    (participant) => participant !== dependencies.caller.displayName,
  );
  const proposal = await dependencies.domain.createProposal(
    dependencies.sql,
    {
      caller: dependencies.caller,
      text: input.text,
      type: input.type,
      epistemicStatus: input.epistemic_status,
    },
  );
  const reviewUrl = `${dependencies.publicAppUrl.replace(/\/$/, "")}${proposal.reviewPath}`;

  return {
    status: "pending_review",
    id: proposal.id,
    review_url: reviewUrl,
    shared_with: sharedWith,
    message: proposalMessage(sharedWith),
  };
}

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
      const result = await createProposalResult(dependencies, {
        text,
        type,
        epistemic_status,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
