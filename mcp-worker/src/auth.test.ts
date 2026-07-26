import type { Sql } from "postgres";
import { describe, expect, it, vi } from "vitest";

import type { Caller } from "../../src/domain/types";
import { resolveAuthenticatedCaller } from "./auth";

const sql = {} as Sql;
const caller: Caller = {
  userId: "user-fred",
  displayName: "Fred",
  workspaceId: "workspace",
};

describe("resolveAuthenticatedCaller", () => {
  it("classifies only an unknown API token as unauthenticated", async () => {
    const resolveCaller = vi
      .fn()
      .mockRejectedValue(new Error("Unknown API token"));

    await expect(
      resolveAuthenticatedCaller(sql, "invalid-token", resolveCaller),
    ).resolves.toEqual({ status: "unknown_token" });
  });

  it("returns the token-derived caller", async () => {
    const resolveCaller = vi.fn().mockResolvedValue(caller);

    await expect(
      resolveAuthenticatedCaller(sql, "known-token", resolveCaller),
    ).resolves.toEqual({ status: "authenticated", caller });
  });

  it("preserves database and runtime failures as server errors", async () => {
    const databaseFailure = new Error("database unavailable");
    const resolveCaller = vi.fn().mockRejectedValue(databaseFailure);

    await expect(
      resolveAuthenticatedCaller(sql, "known-token", resolveCaller),
    ).rejects.toBe(databaseFailure);
  });
});
