import { describe, expect, it } from "vitest";

import type { ContextObjectView } from "@/domain/types";
import { contextActionAvailability } from "./context-actions-state";

const object = {
  authorName: "Fred",
  lifecycleStatus: "pending",
  visibility: "shared",
} as ContextObjectView;

describe("contextActionAvailability", () => {
  it("does not let an author accept or decline their own proposal", () => {
    expect(contextActionAvailability(object, "Fred")).toEqual({
      canProposeChange: true,
      canRespond: false,
    });
  });

  it("lets another participant review the proposal", () => {
    expect(contextActionAvailability(object, "Sara")).toEqual({
      canProposeChange: true,
      canRespond: true,
    });
  });

  it("hides every action for closed records", () => {
    expect(
      contextActionAvailability(
        { ...object, lifecycleStatus: "superseded" },
        "Sara",
      ),
    ).toEqual({
      canProposeChange: false,
      canRespond: false,
    });
  });
});
