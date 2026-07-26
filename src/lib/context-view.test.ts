import { describe, expect, it } from "vitest";

import {
  isContextObjectId,
  viewerDisplayName,
} from "./context-view";

describe("context view helpers", () => {
  it("accepts context UUIDs and rejects malformed path values", () => {
    expect(
      isContextObjectId("00000000-0000-0000-0000-000000000301"),
    ).toBe(true);
    expect(isContextObjectId("not-a-context-id")).toBe(false);
  });

  it("maps web viewer keys to participant names", () => {
    expect(viewerDisplayName("fred")).toBe("Fred");
    expect(viewerDisplayName("sara")).toBe("Sara");
  });
});
