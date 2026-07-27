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
  "Retrieve the complete set of shared project context the current user is authorized to see, including decisions, tasks, blockers, open questions, and each founder's stated perspectives — along with who authored each item, who has accepted or disputed it, and where it came from. Use this whenever the user asks what has been decided, agreed, disputed, or what the other person thinks. Also use this before responding to an affirmative intent to tell, inform, or make a named person aware of something, and before suggesting that durable project information be proposed, so you can verify the person appears in shared_with and avoid duplicating information that is already shared or pending. This returns everything the user is permitted to see; it is not a search, and nothing outside this result is available to you.";

export const PROPOSAL_NOTE =
  "People in shared_with are the other workspace participants with whom the viewer can propose shared context. When the user affirmatively says to tell or inform one of them, wants one of them to know something, or states new durable project information that could plausibly help them, first check that no equivalent shared or pending object already exists. If one exists, explain its current status instead of proposing a duplicate. A private object is not a shared duplicate: never proactively surface or suggest its content, but if the user's current request explicitly says to tell or inform someone, base the preview only on what that request asks to communicate. Never suggest or create a proposal when the user negates communication or says not to share. Do not suggest a proposal when the current request marks information private, confidential, speculative, or between us. Otherwise, offer a one-sentence proposal preview in the user's own words, name who would review it, explain that it is pending shared context rather than a direct message, and ask for confirmation before calling propose_shared_context. Do not suggest a proposal for a mere question about a participant or short-lived conversation. If the named person is not in shared_with, say that no proposal can be made through the current shared context.";

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
    ...(object.resolvesObjectId ? { resolves: object.resolvesObjectId } : {}),
    ...(object.resolvedByObjectId
      ? { resolved_by: object.resolvedByObjectId }
      : {}),
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

  const conditionalAcceptors = object.responses
    .filter(({ stance }) => stance === "accepted_with_condition")
    .map(({ displayName }) => displayName);
  const unaccepted = object.audienceNames.filter(
    (name) =>
      name !== object.authorName &&
      !object.responses.some(
        ({ displayName, stance }) =>
          displayName === name &&
          (stance === "accepted" || stance === "accepted_with_condition"),
      ),
  );
  const status = [
    conditionalAcceptors.length > 0
      ? `Accepted with a condition by ${conditionalAcceptors.join(" and ")}; the condition remains unresolved.`
      : null,
    unaccepted.length > 0
      ? `Not accepted by ${unaccepted.join(" or ")}.`
      : null,
  ].filter((part): part is string => part !== null);

  if (status.length === 0) {
    status.push("Not yet fully accepted by every participant.");
  }

  return `Proposed by ${object.authorName}. ${status.join(" ")} Do not report this as agreed.`;
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
    note:
      privateNote(object) ??
      "Source material, not a claim either founder is asserting.",
  };
}

export function serializeContextBundle(bundle: ContextBundle) {
  const sharedWith = bundle.participants.filter(
    (participant) => participant !== bundle.viewer,
  );

  return {
    workspace: bundle.workspace,
    viewer: bundle.viewer,
    participants: bundle.participants,
    shared_with: sharedWith,
    proposal_note: PROPOSAL_NOTE,
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
