import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { Caller } from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";
import { createProposalResult } from "./propose-shared-context";

const sql = {} as Sql;
const fred: Caller = {
  userId: "user-fred",
  displayName: "Fred",
  workspaceId: "workspace",
};
const sara: Caller = {
  userId: "user-sara",
  displayName: "Sara",
  workspaceId: "workspace",
};
const input = {
  text: "Ship the launch.",
  type: "decision" as const,
  epistemic_status: "proposal" as const,
};

function proposalDomain(): Pick<
  DomainApi,
  "createProposal" | "getWorkspaceParticipants"
> {
  return {
    getWorkspaceParticipants: vi.fn().mockResolvedValue(["Fred", "Sara"]),
    createProposal: vi.fn().mockResolvedValue({
      id: "proposal-id",
      reviewPath: "/review/proposal-id?as=sara",
    }),
  };
}

describe("createProposalResult", () => {
  it("builds Fred's result for Sara from workspace participants", async () => {
    const domain = proposalDomain();

    await expect(
      createProposalResult(
        {
          sql,
          caller: fred,
          publicAppUrl: "https://app.example/",
          domain,
        },
        input,
      ),
    ).resolves.toEqual({
      status: "pending_review",
      id: "proposal-id",
      review_url: "https://app.example/review/proposal-id?as=sara",
      shared_with: ["Sara"],
      message:
        "Created as a pending proposal. Sara can see it for review but has not agreed to it. It is not canonical shared context until Sara responds.",
    });
  });

  it("builds Sara's result for Fred from workspace participants", async () => {
    const domain = proposalDomain();

    await expect(
      createProposalResult(
        {
          sql,
          caller: sara,
          publicAppUrl: "https://app.example",
          domain,
        },
        input,
      ),
    ).resolves.toEqual({
      status: "pending_review",
      id: "proposal-id",
      review_url: "https://app.example/review/proposal-id?as=sara",
      shared_with: ["Fred"],
      message:
        "Created as a pending proposal. Fred can see it for review but has not agreed to it. It is not canonical shared context until Fred responds.",
    });
  });
});
