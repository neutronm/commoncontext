import { describe, expect, it } from "vitest";

import rootPackage from "../../package.json";
import workerPackage from "../package.json";
import { ADD_PRIVATE_CONTEXT_DESCRIPTION } from "./tools/add-private-context";
import { GET_SHARED_CONTEXT_DESCRIPTION } from "./tools/get-shared-context";
import { PROPOSE_CONTEXT_CHANGE_DESCRIPTION } from "./tools/propose-context-change";
import { PROPOSE_SHARED_CONTEXT_DESCRIPTION } from "./tools/propose-shared-context";
import { RESPOND_TO_CONTEXT_DESCRIPTION } from "./tools/respond-to-context";

describe("MCP runtime contracts", () => {
  it("keeps all tool descriptions byte-for-byte unchanged", () => {
    expect(ADD_PRIVATE_CONTEXT_DESCRIPTION).toBe(
      "Save an item as private context for the current user. The item is visible only to its owner and is never included in another participant's shared context.",
    );
    expect(GET_SHARED_CONTEXT_DESCRIPTION).toBe(
      "Retrieve the complete set of shared project context the current user is authorized to see, including decisions, tasks, blockers, open questions, and each founder's stated perspectives — along with who authored each item, who has accepted or disputed it, and where it came from. Use this whenever the user asks what has been decided, agreed, disputed, or what the other person thinks. This returns everything the user is permitted to see; it is not a search, and nothing outside this result is available to you.",
    );
    expect(PROPOSE_SHARED_CONTEXT_DESCRIPTION).toBe(
      "Propose a new item for the shared project context. This does NOT share anything immediately — it creates a pending proposal that the other participants must review and respond to before it becomes shared context. Use this when the user asks to record, save, or add something to the shared project. Always tell the user afterward that the item is pending review and not yet agreed.",
    );
    expect(RESPOND_TO_CONTEXT_DESCRIPTION).toBe(
      "Record the current user's stance on another participant's shared context item: accept it, decline it, dispute it, or add their own perspective alongside it. Authors cannot respond to their own items; use propose_context_change when the user wants to revise their own proposal or suggest replacement wording. This never edits or deletes the original item.",
    );
    expect(PROPOSE_CONTEXT_CHANGE_DESCRIPTION).toBe(
      "Propose replacement wording for an existing shared context item. This creates a new pending object linked to the original; it never edits the original, and the original remains current unless every participant accepts the replacement.",
    );
  });

  it("loads the root local environment through the supported Wrangler flag", () => {
    expect(rootPackage.scripts["dev:mcp"]).toBe(
      "npm --prefix mcp-worker run dev",
    );
    expect(workerPackage.scripts.dev).toBe(
      "wrangler dev --env-file ../.env.local",
    );
  });
});
