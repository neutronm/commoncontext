import { describe, expect, it } from "vitest";

import type {
  ContextBundle,
  ContextObjectView,
} from "../../../src/domain/types";
import {
  PROPOSAL_NOTE,
  serializeContextBundle,
} from "./get-shared-context";

const conditionalTask: ContextObjectView = {
  id: "00000000-0000-0000-0000-000000000310",
  text: "Fred owns the pricing page copy.",
  type: "task",
  epistemicStatus: "reported_fact",
  lifecycleStatus: "active",
  visibility: "shared",
  origin: "seed",
  authorName: "Fred",
  ownerName: "Fred",
  audienceNames: ["Fred", "Sara"],
  sourceReference: null,
  supersedesText: null,
  resolvesObjectId: null,
  resolvedByObjectId: null,
  responses: [
    {
      displayName: "Sara",
      stance: "accepted_with_condition",
      responseText: "Fred drafts it, but I need to review before it ships.",
      createdAt: "2026-07-24T16:00:00.000Z",
    },
  ],
  createdAt: "2026-07-24T16:00:00.000Z",
};

function emptyBundle(
  viewer = "Fred",
  participants = ["Fred", "Sara"],
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

describe("serializeContextBundle", () => {
  it("describes conditional acceptance without contradicting the stance", () => {
    const bundle = emptyBundle();
    bundle.unresolved.push(conditionalTask);

    const result = serializeContextBundle(bundle);

    expect(result.unresolved).toEqual([
      expect.objectContaining({
        id: conditionalTask.id,
        stances: { Sara: "accepted_with_condition" },
        response_texts: {
          Sara: "Fred drafts it, but I need to review before it ships.",
        },
        note: expect.stringContaining(
          "Accepted with a condition by Sara; the condition remains unresolved.",
        ),
      }),
    ]);
    expect(result.unresolved[0].note).not.toContain("Not accepted by Sara");
    expect(result.agreed).toEqual([]);
    expect(result.disputed).toEqual([]);
  });

  it("serializes a decision's open-question resolution link", () => {
    const bundle = emptyBundle();
    bundle.agreed.push({
      ...conditionalTask,
      id: "decision-id",
      text: "Launch with a manual payments fallback.",
      type: "decision",
      resolvesObjectId: "open-question-id",
      responses: [
        {
          ...conditionalTask.responses[0],
          displayName: "Fred",
          stance: "accepted",
          responseText: null,
        },
        {
          ...conditionalTask.responses[0],
          stance: "accepted",
          responseText: null,
        },
      ],
    });

    const result = serializeContextBundle(bundle);

    expect(result.agreed[0]).toMatchObject({
      id: "decision-id",
      resolves: "open-question-id",
    });
  });

  it("serializes an open question's resolving decision link", () => {
    const bundle = emptyBundle();
    bundle.openQuestions.push({
      ...conditionalTask,
      id: "open-question-id",
      text: "Do we hold the launch if payments is not live?",
      type: "open_question",
      lifecycleStatus: "resolved",
      resolvesObjectId: null,
      resolvedByObjectId: "decision-id",
      responses: [],
    });

    const result = serializeContextBundle(bundle);

    expect(result.open_questions[0]).toMatchObject({
      id: "open-question-id",
      resolved_by: "decision-id",
    });
  });
});
