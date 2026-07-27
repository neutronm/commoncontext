import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { Caller } from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";
import {
  createPrivateContextResult,
  registerAddPrivateContextTool,
} from "./add-private-context";

const sql = {} as Sql;
const fred: Caller = {
  userId: "user-fred",
  displayName: "Fred",
  workspaceId: "workspace",
};

describe("createPrivateContextResult", () => {
  it("creates a caller-owned private item and reports its visibility clearly", async () => {
    const domain: Pick<DomainApi, "createPrivateContext"> = {
      createPrivateContext: vi.fn().mockResolvedValue({
        id: "private-context-id",
      }),
    };

    await expect(
      createPrivateContextResult(
        { sql, caller: fred, domain },
        {
          text: "Privately revisit the payments fallback.",
          type: "perspective",
        },
      ),
    ).resolves.toEqual({
      status: "created",
      id: "private-context-id",
      visibility: "private",
      owner: "Fred",
      message: "Saved as private context. Only Fred can see this item.",
    });
    expect(domain.createPrivateContext).toHaveBeenCalledWith(sql, {
      caller: fred,
      text: "Privately revisit the payments fallback.",
      type: "perspective",
    });
  });

  it("registers the exact add_private_context(text, type) tool contract", () => {
    const registerTool = vi.fn();
    const domain: Pick<DomainApi, "createPrivateContext"> = {
      createPrivateContext: vi.fn(),
    };

    registerAddPrivateContextTool(
      { registerTool } as unknown as McpServer,
      { sql, caller: fred, domain },
    );

    const [name, definition] = registerTool.mock.calls[0] as unknown as [
      string,
      { inputSchema: { shape: Record<string, unknown> } },
    ];
    expect(name).toBe("add_private_context");
    expect(Object.keys(definition.inputSchema.shape)).toEqual(["text", "type"]);
  });
});
