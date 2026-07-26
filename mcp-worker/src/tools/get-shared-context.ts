import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Sql } from "postgres";
import { z } from "zod";

import type {
  Caller,
  ContextBundle,
  ContextObjectView,
} from "../../../src/domain/types";
import type { DomainApi } from "../domain-api";

export const GET_SHARED_CONTEXT_DESCRIPTION =
  "Retrieve the complete set of shared project context the current user is authorized to see, including decisions, tasks, blockers, open questions, and each founder's stated perspectives — along with who authored each item, who has accepted or disputed it, and where it came from. Use this whenever the user asks what has been decided, agreed, disputed, or what the other person thinks. This returns everything the user is permitted to see; it is not a search, and nothing outside this result is available to you.";

type GetSharedContextDependencies = {
  sql: Sql;
  caller: Caller;
  workspace: string;
  domain: Pick<
    DomainApi,
    "getAuthorizedObjects" | "getWorkspaceParticipants" | "bucketContext"
  >;
};

type WireObject = Record<string, unknown>;

function stanceMap(object: ContextObjectView): Record<string, string> {
  return Object.fromEntries(
    object.responses.map(({ displayName, stance }) => [displayName, stance]),
  );
}

function responseTextMap(
  object: ContextObjectView,
): Record<string, string> | undefined {
  const responseTexts = Object.fromEntries(
    object.responses.flatMap(({ displayName, responseText }) =>
      responseText ? [[displayName, responseText]] : [],
    ),
  );
  return Object.keys(responseTexts).length > 0 ? responseTexts : undefined;
}

function optionalProvenance(object: ContextObjectView): WireObject {
  return {
    ...(object.sourceReference ? { source: object.sourceReference } : {}),
    ...(object.supersedesText ? { supersedes: object.supersedesText } : {}),
    ...(responseTextMap(object)
      ? { response_texts: responseTextMap(object) }
      : {}),
  };
}

function privateNote(object: ContextObjectView): string | undefined {
  return object.visibility === "private"
    ? "Private to you. The other participant cannot see this and does not know it exists."
    : undefined;
}

function serializeAgreed(object: ContextObjectView): WireObject {
  return {
    id: object.id,
    text: object.text,
    type: object.type,
    author: object.authorName,
    visibility: object.visibility,
    stances: stanceMap(object),
    ...optionalProvenance(object),
    ...(privateNote(object) ? { note: privateNote(object) } : {}),
  };
}

function perspectiveNote(object: ContextObjectView): string {
  const privateBoundary = privateNote(object);
  if (privateBoundary) return privateBoundary;

  const acknowledgers = object.responses
    .filter(({ stance }) => stance === "acknowledged")
    .map(({ displayName }) => displayName);

  if (acknowledgers.length > 0) {
    return `Attributed to ${object.ownerName}. Acknowledged by ${acknowledgers.join(" and ")}, which is not agreement.`;
  }
  return `Attributed to ${object.ownerName}. This is their perspective, not a jointly agreed fact.`;
}

function serializePerspective(object: ContextObjectView): WireObject {
  return {
    id: object.id,
    text: object.text,
    owner: object.ownerName,
    epistemic_status: object.epistemicStatus,
    visibility: object.visibility,
    stances: stanceMap(object),
    ...optionalProvenance(object),
    note: perspectiveNote(object),
  };
}

function unresolvedNote(object: ContextObjectView): string {
  const privateBoundary = privateNote(object);
  if (privateBoundary) return privateBoundary;

  const unaccepted = object.audienceNames.filter(
    (name) =>
      name !== object.authorName &&
      !object.responses.some(
        ({ displayName, stance }) =>
          displayName === name && stance === "accepted",
      ),
  );
  return `Proposed by ${object.authorName}. Not accepted by ${unaccepted.join(" or ")}. Do not report this as agreed.`;
}

function serializeUnresolved(object: ContextObjectView): WireObject {
  return {
    id: object.id,
    text: object.text,
    type: object.type,
    author: object.authorName,
    lifecycle_status: object.lifecycleStatus,
    visibility: object.visibility,
    stances: stanceMap(object),
    ...optionalProvenance(object),
    note: unresolvedNote(object),
  };
}

function serializeDisputed(object: ContextObjectView): WireObject {
  return {
    id: object.id,
    text: object.text,
    author: object.authorName,
    visibility: object.visibility,
    stances: stanceMap(object),
    ...optionalProvenance(object),
    ...(privateNote(object) ? { note: privateNote(object) } : {}),
  };
}

function serializeSupportingObject(object: ContextObjectView): WireObject {
  return {
    id: object.id,
    text: object.text,
    type: object.type,
    author: object.authorName,
    visibility: object.visibility,
    stances: stanceMap(object),
    ...optionalProvenance(object),
    ...(privateNote(object) ? { note: privateNote(object) } : {}),
  };
}

function serializeSource(object: ContextObjectView): WireObject {
  return {
    id: object.id,
    text: object.text,
    type: object.type,
    author: object.authorName,
    visibility: object.visibility,
    ...optionalProvenance(object),
    note: "Source material, not a claim either founder is asserting.",
  };
}

export function serializeContextBundle(bundle: ContextBundle) {
  return {
    workspace: bundle.workspace,
    viewer: bundle.viewer,
    participants: bundle.participants,
    boundary_note: `This is the complete set of context ${bundle.viewer} is authorized to see. Context that other participants have kept private is not included and cannot be inferred. If the user asks about something not present here, state that you have no authorized information about it rather than speculating.`,
    agreed: bundle.agreed.map(serializeAgreed),
    perspectives: bundle.perspectives.map(serializePerspective),
    unresolved: bundle.unresolved.map(serializeUnresolved),
    disputed: bundle.disputed.map(serializeDisputed),
    open_questions: bundle.openQuestions.map(serializeSupportingObject),
    blockers: bundle.blockers.map(serializeSupportingObject),
    sources: bundle.sources.map(serializeSource),
  };
}

export function registerGetSharedContextTool(
  server: McpServer,
  dependencies: GetSharedContextDependencies,
): void {
  server.registerTool(
    "get_shared_context",
    {
      description: GET_SHARED_CONTEXT_DESCRIPTION,
      inputSchema: z.object({}),
    },
    async () => {
      const objects = await dependencies.domain.getAuthorizedObjects(
        dependencies.sql,
        dependencies.caller,
      );
      const participants =
        await dependencies.domain.getWorkspaceParticipants(
          dependencies.sql,
          dependencies.caller.workspaceId,
        );
      const bundle = dependencies.domain.bucketContext(objects, {
        workspace: dependencies.workspace,
        viewer: dependencies.caller.displayName,
        participants,
      });
      const result = serializeContextBundle(bundle);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
