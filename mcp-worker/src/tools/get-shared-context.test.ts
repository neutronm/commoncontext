import { describe, expect, it } from "vitest";

import type { ContextBundle } from "../../../src/domain/types";
import {
  PROPOSAL_NOTE,
  serializeContextBundle,
} from "./get-shared-context";

function emptyBundle(
  viewer: string,
  participants: string[],
): ContextBundle {
  return {
    workspace: "Launch planning",
    viewer,
    participants,
    agreed: [],
    perspectives: [],
    unresolved: [],
    disputed: [],
    openQuestions: [],
    blockers: [],
    sources: [],
  };
}

describe("serializeContextBundle participant awareness", () => {
  it.each([
    { viewer: "Fred", expected: ["Sara"] },
    { viewer: "Sara", expected: ["Fred"] },
  ])("identifies the other participant for $viewer", ({ viewer, expected }) => {
    const result = serializeContextBundle(
      emptyBundle(viewer, ["Fred", "Sara"]),
    );

    expect(result.shared_with).toEqual(expected);
    expect(result.proposal_note).toBe(PROPOSAL_NOTE);
  });

  it("returns no shared_with participants for a single-member workspace", () => {
    const result = serializeContextBundle(emptyBundle("Fred", ["Fred"]));

    expect(result.shared_with).toEqual([]);
    expect(result.participants).toEqual(["Fred"]);
  });
});
