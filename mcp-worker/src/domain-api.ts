import type { Sql } from "postgres";

import type {
  Caller,
  ContextBundle,
  ContextObjectView,
  EpistemicStatus,
  ObjectType,
  Stance,
} from "../../src/domain/types";

export interface DomainApi {
  resolveCaller(sql: Sql, token: string): Promise<Caller>;
  getAuthorizedObjects(
    sql: Sql,
    caller: Caller,
  ): Promise<ContextObjectView[]>;
  getWorkspaceParticipants(
    sql: Sql,
    workspaceId: string,
  ): Promise<string[]>;
  bucketContext(
    objects: ContextObjectView[],
    meta: { workspace: string; viewer: string; participants: string[] },
  ): ContextBundle;
  createProposal(
    sql: Sql,
    args: {
      caller: Caller;
      text: string;
      type: ObjectType;
      epistemicStatus: EpistemicStatus;
      resolvesObjectId?: string;
    },
  ): Promise<{ id: string; reviewPath: string }>;
  createPrivateContext(
    sql: Sql,
    args: {
      caller: Caller;
      text: string;
      type: ObjectType;
    },
  ): Promise<{ id: string }>;
  createChangeProposal(
    sql: Sql,
    args: {
      caller: Caller;
      objectId: string;
      text: string;
      origin: "assistant" | "web";
    },
  ): Promise<{
    id: string;
    reviewPath: string;
    reviewerNames: string[];
  }>;
  respondToObject(
    sql: Sql,
    args: {
      caller: Caller;
      objectId: string;
      stance: Stance;
      responseText?: string;
    },
  ): Promise<void>;
}
