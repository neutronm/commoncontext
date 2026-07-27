import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import rootPackage from "../../package.json";
import workerPackage from "../package.json";
import {
  createSharedContextServer,
  SERVER_INSTRUCTIONS,
} from "./server";
import { ADD_PRIVATE_CONTEXT_DESCRIPTION } from "./tools/add-private-context";
import {
  GET_SHARED_CONTEXT_DESCRIPTION,
  PROPOSAL_NOTE,
} from "./tools/get-shared-context";
import { PROPOSE_CONTEXT_CHANGE_DESCRIPTION } from "./tools/propose-context-change";
import { PROPOSE_SHARED_CONTEXT_DESCRIPTION } from "./tools/propose-shared-context";
import { RESPOND_TO_CONTEXT_DESCRIPTION } from "./tools/respond-to-context";

describe("MCP runtime contracts", () => {
  it("keeps all tool descriptions byte-for-byte unchanged", () => {
    expect(ADD_PRIVATE_CONTEXT_DESCRIPTION).toBe(
      "Save an item as private context for the current user. The item is visible only to its owner and is never included in another participant's shared context.",
    );
    expect(GET_SHARED_CONTEXT_DESCRIPTION).toBe(
      "Retrieve the complete set of shared project context the current user is authorized to see, including decisions, tasks, blockers, open questions, and each founder's stated perspectives — along with who authored each item, who has accepted or disputed it, and where it came from. Use this whenever the user asks what has been decided, agreed, disputed, or what the other person thinks. Also use this before responding to an affirmative intent to tell, inform, or make a named person aware of something, and before suggesting that durable project information be proposed, so you can verify the person appears in shared_with and avoid duplicating information that is already shared or pending. This returns everything the user is permitted to see; it is not a search, and nothing outside this result is available to you.",
    );
    expect(PROPOSE_SHARED_CONTEXT_DESCRIPTION).toBe(
      "Propose a new item for the shared project context. This does NOT share anything immediately — it creates a pending proposal that the other participants must review and respond to before it becomes shared context. Use this immediately only when the user explicitly and affirmatively asks to record, save, add, or propose something in shared context. If the user instead affirmatively asks to tell or inform a participant, wants a participant to know something, or if you infer that durable project information could help them, do not call this tool yet: first call get_shared_context, verify the recipient appears in shared_with, present a one-sentence preview in the user's own words, explain that it is pending review rather than a direct message, and ask for confirmation. Call this tool only after that confirmation. Never call this tool when the user negates communication or says not to share. Always tell the user afterward that the item is pending review and not yet agreed.",
    );
    expect(RESPOND_TO_CONTEXT_DESCRIPTION).toBe(
      "Record the current user's stance on another participant's shared context item: accept it, decline it, dispute it, or add their own perspective alongside it. Authors cannot respond to their own items; use propose_context_change when the user wants to revise their own proposal or suggest replacement wording. This never edits or deletes the original item.",
    );
    expect(PROPOSE_CONTEXT_CHANGE_DESCRIPTION).toBe(
      "Propose replacement wording for an existing shared context item. This creates a new pending object linked to the original; it never edits the original, and the original remains current unless every participant accepts the replacement.",
    );
  });

  it("keeps the proposal suggestion guidance byte-for-byte unchanged", () => {
    expect(PROPOSAL_NOTE).toBe(
      "People in shared_with are the other workspace participants with whom the viewer can propose shared context. When the user affirmatively says to tell or inform one of them, wants one of them to know something, or states new durable project information that could plausibly help them, first check that no equivalent shared or pending object already exists. If one exists, explain its current status instead of proposing a duplicate. A private object is not a shared duplicate: never proactively surface or suggest its content, but if the user's current request explicitly says to tell or inform someone, base the preview only on what that request asks to communicate. Never suggest or create a proposal when the user negates communication or says not to share. Do not suggest a proposal when the current request marks information private, confidential, speculative, or between us. Otherwise, offer a one-sentence proposal preview in the user's own words, name who would review it, explain that it is pending shared context rather than a direct message, and ask for confirmation before calling propose_shared_context. Do not suggest a proposal for a mere question about a participant or short-lived conversation. If the named person is not in shared_with, say that no proposal can be made through the current shared context.",
    );
  });

  it("publishes always-on proposal awareness during MCP initialization", async () => {
    expect(SERVER_INSTRUCTIONS).toBe(
      "Use get_shared_context to learn which other workspace participants appear in shared_with before responding to affirmative requests to tell, inform, or make someone aware, and whenever new durable project information could help another participant. For affirmative communication intent or inferred relevance, show a one-sentence proposal preview and wait for confirmation before calling propose_shared_context. Never suggest or create a proposal when the user negates communication or says not to share, never proactively surface private context, and do not treat a proposal as a direct message or as agreed context. An explicit affirmative request to add, record, or propose something in shared context already authorizes calling propose_shared_context.",
    );

    const server = createSharedContextServer();
    const client = new Client({
      name: "runtime-contract-test",
      version: "1.0.0",
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    try {
      await client.connect(clientTransport);
      expect(client.getInstructions()).toBe(SERVER_INSTRUCTIONS);
    } finally {
      await client.close();
      await server.close();
    }
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
