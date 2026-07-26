import type { Sql } from "postgres";

import type { Caller } from "../../src/domain/types";
import type { DomainApi } from "./domain-api";

const UNKNOWN_API_TOKEN_MESSAGE = "Unknown API token";

export type CallerResolution =
  | { status: "authenticated"; caller: Caller }
  | { status: "unknown_token" };

export async function resolveAuthenticatedCaller(
  sql: Sql,
  token: string,
  resolveCaller: DomainApi["resolveCaller"],
): Promise<CallerResolution> {
  try {
    const caller = await resolveCaller(sql, token);
    return { status: "authenticated", caller };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === UNKNOWN_API_TOKEN_MESSAGE
    ) {
      return { status: "unknown_token" };
    }
    throw error;
  }
}
