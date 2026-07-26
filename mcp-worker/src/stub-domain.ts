import type { Sql } from "postgres";

import type {
  Caller,
  ContextBundle,
  ContextObjectView,
  EpistemicStatus,
  ObjectType,
  Stance,
} from "../../src/domain/types";

type CallerRow = {
  user_id: string;
  display_name: string;
  workspace_id: string;
};

const FRED = "Fred";
const SARA = "Sara";
const BOTH_FOUNDERS = [FRED, SARA];

const acceptedByBoth = [
  {
    displayName: FRED,
    stance: "accepted" as const,
    responseText: null,
    createdAt: "2026-07-20T10:00:00Z",
  },
  {
    displayName: SARA,
    stance: "accepted" as const,
    responseText: null,
    createdAt: "2026-07-20T10:01:00Z",
  },
];

const seedObjects: ContextObjectView[] = [
  {
    id: "00000000-0000-4000-8000-000000000109",
    text: "Weekly sync, July 20 — Agreed August release window. Discussed payments dependency. Date not fixed to a specific day.",
    type: "source_document",
    epistemicStatus: "reported_fact",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: FRED,
    ownerName: FRED,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: "Weekly sync, July 20",
    supersedesText: null,
    responses: [],
    createdAt: "2026-07-20T09:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    text: "The first release ships July 30.",
    type: "decision",
    epistemicStatus: "verified_fact",
    lifecycleStatus: "superseded",
    visibility: "shared",
    origin: "seed",
    authorName: SARA,
    ownerName: SARA,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: acceptedByBoth,
    createdAt: "2026-07-20T09:05:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000101",
    text: "The first release ships in August.",
    type: "decision",
    epistemicStatus: "verified_fact",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: FRED,
    ownerName: FRED,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: "Weekly sync, July 20",
    supersedesText: "The first release ships July 30.",
    responses: acceptedByBoth,
    createdAt: "2026-07-20T09:30:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000108",
    text: "No paid marketing spend before launch.",
    type: "decision",
    epistemicStatus: "verified_fact",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: FRED,
    ownerName: FRED,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: acceptedByBoth,
    createdAt: "2026-07-20T09:45:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    text: "Sara owns the onboarding flow through launch.",
    type: "task",
    epistemicStatus: "verified_fact",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: SARA,
    ownerName: SARA,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: [
      {
        displayName: SARA,
        stance: "accepted",
        responseText: null,
        createdAt: "2026-07-21T10:01:00Z",
      },
      {
        displayName: FRED,
        stance: "accepted",
        responseText: null,
        createdAt: "2026-07-21T10:02:00Z",
      },
    ],
    createdAt: "2026-07-21T10:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000106",
    text: "The payments integration is waiting on vendor approval.",
    type: "blocker",
    epistemicStatus: "reported_fact",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: FRED,
    ownerName: FRED,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: acceptedByBoth,
    createdAt: "2026-07-22T11:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000107",
    text: "Do we hold the launch if payments isn't live?",
    type: "open_question",
    epistemicStatus: "proposal",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: SARA,
    ownerName: SARA,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: [],
    createdAt: "2026-07-22T11:10:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    text: "Fred's view: engineering time is the main risk to the launch.",
    type: "perspective",
    epistemicStatus: "perspective",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: FRED,
    ownerName: FRED,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: [
      {
        displayName: FRED,
        stance: "accepted",
        responseText: null,
        createdAt: "2026-07-23T14:01:00Z",
      },
      {
        displayName: SARA,
        stance: "acknowledged",
        responseText: null,
        createdAt: "2026-07-23T14:02:00Z",
      },
    ],
    createdAt: "2026-07-23T14:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    text: "Sara's view: expanding scope is the main risk to the launch.",
    type: "perspective",
    epistemicStatus: "perspective",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: SARA,
    ownerName: SARA,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: [
      {
        displayName: SARA,
        stance: "accepted",
        responseText: null,
        createdAt: "2026-07-23T14:21:00Z",
      },
      {
        displayName: FRED,
        stance: "acknowledged",
        responseText: null,
        createdAt: "2026-07-23T14:22:00Z",
      },
    ],
    createdAt: "2026-07-23T14:20:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000110",
    text: "Fred owns the pricing page copy.",
    type: "task",
    epistemicStatus: "reported_fact",
    lifecycleStatus: "active",
    visibility: "shared",
    origin: "seed",
    authorName: FRED,
    ownerName: FRED,
    audienceNames: BOTH_FOUNDERS,
    sourceReference: null,
    supersedesText: null,
    responses: [
      {
        displayName: SARA,
        stance: "disputed",
        responseText: "Fred drafts it, but I need to review before it ships.",
        createdAt: "2026-07-24T16:01:00Z",
      },
    ],
    createdAt: "2026-07-24T16:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000201",
    text: "Honestly I don't think we make August at all. If QA takes as long as I expect we're looking at slipping to September, and I don't want to say that out loud until I'm sure.",
    type: "perspective",
    epistemicStatus: "perspective",
    lifecycleStatus: "active",
    visibility: "private",
    origin: "seed",
    authorName: FRED,
    ownerName: FRED,
    audienceNames: [FRED],
    sourceReference: null,
    supersedesText: null,
    responses: [],
    createdAt: "2026-07-24T18:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    text: "Every time we get close to a date Fred adds another must-have. I think the scope is the problem, not the timeline.",
    type: "perspective",
    epistemicStatus: "perspective",
    lifecycleStatus: "active",
    visibility: "private",
    origin: "seed",
    authorName: SARA,
    ownerName: SARA,
    audienceNames: [SARA],
    sourceReference: null,
    supersedesText: null,
    responses: [],
    createdAt: "2026-07-24T18:30:00Z",
  },
];

export async function resolveCaller(sql: Sql, token: string): Promise<Caller> {
  const rows = await sql<CallerRow[]>`
    SELECT
      users.id AS user_id,
      users.display_name,
      workspace_members.workspace_id
    FROM users
    INNER JOIN workspace_members ON workspace_members.user_id = users.id
    WHERE users.api_token = ${token}
    LIMIT 1
  `;
  const row = rows[0];

  if (!row) {
    throw new Error("Unknown caller");
  }

  return {
    userId: row.user_id,
    displayName: row.display_name,
    workspaceId: row.workspace_id,
  };
}

export async function getAuthorizedObjects(
  sql: Sql,
  caller: Caller,
): Promise<ContextObjectView[]> {
  void sql;

  return seedObjects
    .filter(
      (object) =>
        object.authorName === caller.displayName ||
        object.audienceNames.includes(caller.displayName),
    )
    .map((object) => ({
      ...object,
      audienceNames: [...object.audienceNames],
      responses: object.responses.map((response) => ({ ...response })),
    }));
}

export async function getWorkspaceParticipants(
  sql: Sql,
  workspaceId: string,
): Promise<string[]> {
  void sql;
  void workspaceId;
  return [...BOTH_FOUNDERS];
}

export function bucketContext(
  objects: ContextObjectView[],
  meta: { workspace: string; viewer: string; participants: string[] },
): ContextBundle {
  const bundle: ContextBundle = {
    ...meta,
    agreed: [],
    perspectives: [],
    unresolved: [],
    disputed: [],
    openQuestions: [],
    blockers: [],
    sources: [],
  };

  for (const object of objects) {
    if (object.lifecycleStatus === "superseded") continue;
    if (object.type === "source_document") {
      bundle.sources.push(object);
      continue;
    }
    if (object.type === "blocker") {
      bundle.blockers.push(object);
      continue;
    }
    if (object.type === "open_question") {
      bundle.openQuestions.push(object);
      continue;
    }
    if (object.epistemicStatus === "perspective") {
      bundle.perspectives.push(object);
      continue;
    }
    if (
      object.responses.some(
        ({ stance }) => stance === "disputed" || stance === "rejected",
      )
    ) {
      bundle.disputed.push(object);
      continue;
    }

    const stances = new Map(
      object.responses.map(({ displayName, stance }) => [displayName, stance]),
    );
    if (
      object.lifecycleStatus === "pending" ||
      object.audienceNames.some((name) => !stances.has(name))
    ) {
      bundle.unresolved.push(object);
      continue;
    }
    if (
      object.audienceNames.every((name) => stances.get(name) === "accepted")
    ) {
      bundle.agreed.push(object);
      continue;
    }
    bundle.unresolved.push(object);
  }

  return bundle;
}

export async function createProposal(
  sql: Sql,
  args: {
    caller: Caller;
    text: string;
    type: ObjectType;
    epistemicStatus: EpistemicStatus;
  },
): Promise<{ id: string; reviewPath: string }> {
  const proposal = await sql.begin(async (transaction) => {
    const rows = await transaction<{ id: string }[]>`
      INSERT INTO context_objects (
        workspace_id,
        author_user_id,
        owner_user_id,
        type,
        text,
        epistemic_status,
        lifecycle_status,
        origin
      )
      VALUES (
        ${args.caller.workspaceId},
        ${args.caller.userId},
        ${args.caller.userId},
        ${args.type},
        ${args.text},
        ${args.epistemicStatus},
        'pending',
        'assistant'
      )
      RETURNING id
    `;
    const createdProposal = rows[0];

    if (!createdProposal) {
      throw new Error("Proposal was not created");
    }

    await transaction`
      INSERT INTO context_audiences (context_object_id, user_id)
      SELECT ${createdProposal.id}, workspace_members.user_id
      FROM workspace_members
      WHERE workspace_members.workspace_id = ${args.caller.workspaceId}
    `;

    return createdProposal;
  });

  return {
    id: proposal.id,
    reviewPath: `/review/${proposal.id}?as=sara`,
  };
}

export async function respondToObject(
  sql: Sql,
  args: {
    caller: Caller;
    objectId: string;
    stance: Stance;
    responseText?: string;
  },
): Promise<void> {
  const stubObject = seedObjects.find(({ id }) => id === args.objectId);
  if (stubObject) {
    if (!stubObject.audienceNames.includes(args.caller.displayName)) {
      throw new Error("The current caller is not in this object's audience");
    }
    throw new Error("Responses to phase-1 stub objects cannot be persisted");
  }

  const audienceRows = await sql<{ is_audience: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM context_audiences
      WHERE context_object_id = ${args.objectId}
        AND user_id = ${args.caller.userId}
    ) AS is_audience
  `;

  if (!audienceRows[0]?.is_audience) {
    throw new Error("The current caller is not in this object's audience");
  }

  await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO participant_responses (
        context_object_id,
        user_id,
        stance,
        response_text
      )
      VALUES (
        ${args.objectId},
        ${args.caller.userId},
        ${args.stance},
        ${args.responseText ?? null}
      )
      ON CONFLICT (context_object_id, user_id)
      DO UPDATE SET
        stance = EXCLUDED.stance,
        response_text = EXCLUDED.response_text,
        created_at = now()
    `;
    await transaction`
      UPDATE context_objects
      SET lifecycle_status = 'active'
      WHERE id = ${args.objectId}
        AND lifecycle_status = 'pending'
    `;
  });
}
