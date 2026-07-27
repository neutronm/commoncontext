import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { Caller } from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";
import { createContextChangeResult } from "./propose-context-change";

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

function changeDomain(reviewPath: string): Pick<
  DomainApi,
  "createChangeProposal"
> {
  return {
    createChangeProposal: vi.fn().mockResolvedValue({
      id: "replacement-id",
      reviewPath,
      reviewerNames: reviewPath.endsWith("sara") ? ["Sara"] : ["Fred"],
    }),
  };
}

describe("createContextChangeResult", () => {
  it("creates Fred's immutable change proposal for Sara to review", async () => {
    const domain = changeDomain(
      "/review/replacement-id?as=sara",
    );

    await expect(
      createContextChangeResult(
        {
          sql,
          caller: fred,
          publicAppUrl: "https://app.example/",
          domain,
        },
        {
          object_id: "original-id",
          replacement_text: "Use an August release window.",
        },
      ),
    ).resolves.toEqual({
      status: "pending_change_review",
      id: "replacement-id",
      supersedes_id: "original-id",
      review_url:
        "https://app.example/review/replacement-id?as=sara",
      shared_with: ["Sara"],
      message:
        "Created a pending change proposal for Sara to review. The original wording was not edited and remains current unless every participant accepts the replacement.",
    });
    expect(domain.createChangeProposal).toHaveBeenCalledWith(sql, {
      caller: fred,
      objectId: "original-id",
      text: "Use an August release window.",
      origin: "assistant",
    });
  });

  it("creates Sara's immutable change proposal for Fred to review", async () => {
    const domain = changeDomain(
      "/review/replacement-id?as=fred",
    );

    await expect(
      createContextChangeResult(
        {
          sql,
          caller: sara,
          publicAppUrl: "https://app.example",
          domain,
        },
        {
          object_id: "original-id",
          replacement_text: "Review the scope before fixing a date.",
        },
      ),
    ).resolves.toMatchObject({
      review_url:
        "https://app.example/review/replacement-id?as=fred",
      shared_with: ["Fred"],
      message:
        "Created a pending change proposal for Fred to review. The original wording was not edited and remains current unless every participant accepts the replacement.",
    });
  });
});
