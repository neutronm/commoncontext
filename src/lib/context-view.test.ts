import { describe, expect, it } from "vitest";

import type { ContextObjectView } from "../domain/types";
import {
  canViewerRespondToObject,
  isContextObjectId,
} from "./context-view";

function contextObject(
  overrides: Partial<ContextObjectView> = {},
): ContextObjectView {
  return {
    audienceNames: ["Fred", "Sara"],
    authorName: "Fred",
    createdAt: "2026-07-20T09:00:00.000Z",
    epistemicStatus: "proposal",
    id: "00000000-0000-0000-0000-000000000301",
    lifecycleStatus: "pending",
    origin: "assistant",
    ownerName: "Fred",
    responses: [],
    sourceReference: null,
    supersedesText: null,
    text: "We agreed to launch on August 15.",
    type: "decision",
    visibility: "shared",
    ...overrides,
  };
}

describe("context view policy", () => {
  it("accepts context UUIDs and rejects malformed path values", () => {
    expect(
      isContextObjectId("00000000-0000-0000-0000-000000000301"),
    ).toBe(true);
    expect(isContextObjectId("not-a-context-id")).toBe(false);
  });

  it("allows the non-author audience member to answer a pending proposal", () => {
    expect(canViewerRespondToObject(contextObject(), "Sara")).toBe(true);
  });

  it("does not let the author answer their own proposal", () => {
    expect(canViewerRespondToObject(contextObject(), "Fred")).toBe(false);
  });

  it("does not offer response controls after activation or a prior response", () => {
    expect(
      canViewerRespondToObject(
        contextObject({ lifecycleStatus: "active" }),
        "Sara",
      ),
    ).toBe(false);
    expect(
      canViewerRespondToObject(
        contextObject({
          responses: [
            {
              createdAt: "2026-07-20T10:00:00.000Z",
              displayName: "Sara",
              responseText: null,
              stance: "accepted",
            },
          ],
        }),
        "Sara",
      ),
    ).toBe(false);
  });
});
