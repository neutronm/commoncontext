import type { Sql } from 'postgres';

import type {
  Caller,
  ContextBundle,
  ContextObjectView,
  EpistemicStatus,
  ObjectType,
  Origin,
  ParticipantResponseView,
  Stance,
} from './types';

interface ContextObjectRow extends Omit<ContextObjectView, 'responses'> {
  responses: ParticipantResponseView[] | string;
}

type BucketName =
  | 'agreed'
  | 'perspectives'
  | 'unresolved'
  | 'disputed'
  | 'openQuestions'
  | 'blockers'
  | 'sources';

function visibleObjectIds(sql: Sql, userId: string) {
  return sql`
    select context_object.id
    from context_objects as context_object
    where context_object.author_user_id = ${userId}::uuid
      or exists (
        select 1
        from context_audiences as audience
        where audience.context_object_id = context_object.id
          and audience.user_id = ${userId}::uuid
      )
  `;
}

async function selectAuthorizedObjects(
  sql: Sql,
  caller: Caller,
  objectId?: string,
): Promise<ContextObjectView[]> {
  const requestedObjectId = objectId ?? null;

  const rows = await sql<ContextObjectRow[]>`
    with visible_object_ids as (
      ${visibleObjectIds(sql, caller.userId)}
    )
    select
      context_object.id::text as id,
      context_object.text,
      context_object.type::text as type,
      context_object.epistemic_status::text as "epistemicStatus",
      context_object.lifecycle_status::text as "lifecycleStatus",
      case
        when audience.member_count = 1 and audience.only_author
          then 'private'
        else 'shared'
      end as visibility,
      context_object.origin::text as origin,
      author.display_name as "authorName",
      owner.display_name as "ownerName",
      audience.names as "audienceNames",
      context_object.source_reference as "sourceReference",
      superseded_object.text as "supersedesText",
      responses.items as responses,
      to_char(
        context_object.created_at at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ) as "createdAt"
    from context_objects as context_object
    join visible_object_ids
      on visible_object_ids.id = context_object.id
    join users as author
      on author.id = context_object.author_user_id
    join users as owner
      on owner.id = context_object.owner_user_id
    left join context_objects as superseded_object
      on superseded_object.id = context_object.supersedes_object_id
    join lateral (
      select
        coalesce(
          json_agg(member.display_name order by member.handle),
          '[]'::json
        ) as names,
        count(*)::integer as member_count,
        bool_and(context_audience.user_id = context_object.author_user_id) as only_author
      from context_audiences as context_audience
      join users as member
        on member.id = context_audience.user_id
      where context_audience.context_object_id = context_object.id
    ) as audience on true
    join lateral (
      select coalesce(
        json_agg(
          json_build_object(
            'displayName', respondent.display_name,
            'stance', participant_response.stance,
            'responseText', participant_response.response_text,
            'createdAt', to_char(
              participant_response.created_at at time zone 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            )
          )
          order by participant_response.created_at, respondent.handle
        ) filter (where participant_response.id is not null),
        '[]'::json
      ) as items
      from participant_responses as participant_response
      join users as respondent
        on respondent.id = participant_response.user_id
      where participant_response.context_object_id = context_object.id
    ) as responses on true
    where context_object.workspace_id = ${caller.workspaceId}::uuid
      and (
        ${requestedObjectId}::uuid is null
        or context_object.id = ${requestedObjectId}::uuid
      )
    order by context_object.created_at desc, context_object.id
  `;

  return rows.map((row) => ({
    ...row,
    responses:
      typeof row.responses === 'string'
        ? (JSON.parse(row.responses) as ParticipantResponseView[])
        : row.responses,
  }));
}

function bucketNameFor(object: ContextObjectView): BucketName | null {
  if (
    object.lifecycleStatus === 'superseded' ||
    object.lifecycleStatus === 'revoked'
  ) {
    return null;
  }

  const hasNegativeResponse = object.responses.some(
    (response) =>
      response.stance === 'disputed' || response.stance === 'rejected',
  );
  const isReplacement = object.supersedesText !== null;

  if (isReplacement && hasNegativeResponse) return 'disputed';
  if (isReplacement && object.lifecycleStatus === 'pending') {
    return 'unresolved';
  }

  if (object.type === 'source_document') return 'sources';
  if (object.type === 'blocker') return 'blockers';
  if (object.type === 'open_question') return 'openQuestions';
  if (object.epistemicStatus === 'perspective') return 'perspectives';
  if (hasNegativeResponse) return 'disputed';

  const responsesByParticipant = new Map(
    object.responses.map((response) => [response.displayName, response.stance]),
  );
  if (
    object.lifecycleStatus === 'pending' ||
    object.audienceNames.some(
      (participant) => !responsesByParticipant.has(participant),
    )
  ) {
    return 'unresolved';
  }
  if (
    object.audienceNames.every(
      (participant) => responsesByParticipant.get(participant) === 'accepted',
    )
  ) {
    return 'agreed';
  }
  return 'unresolved';
}

export async function resolveCaller(
  sql: Sql,
  token: string,
): Promise<Caller> {
  const [caller] = await sql<Caller[]>`
    select
      app_user.id::text as "userId",
      app_user.display_name as "displayName",
      membership.workspace_id::text as "workspaceId"
    from users as app_user
    join workspace_members as membership
      on membership.user_id = app_user.id
    where app_user.api_token = ${token}
    order by membership.workspace_id
    limit 1
  `;

  if (!caller) throw new Error('Unknown API token');
  return caller;
}

export async function resolveWebViewer(
  sql: Sql,
  handle: string | undefined,
): Promise<Caller> {
  const resolvedHandle = handle === 'sara' ? 'sara' : 'fred';
  const [caller] = await sql<Caller[]>`
    select
      app_user.id::text as "userId",
      app_user.display_name as "displayName",
      membership.workspace_id::text as "workspaceId"
    from users as app_user
    join workspace_members as membership
      on membership.user_id = app_user.id
    where app_user.handle = ${resolvedHandle}
    order by membership.workspace_id
    limit 1
  `;

  if (!caller) throw new Error(`Unknown web viewer: ${resolvedHandle}`);
  return caller;
}

export async function getAuthorizedObjects(
  sql: Sql,
  caller: Caller,
): Promise<ContextObjectView[]> {
  return selectAuthorizedObjects(sql, caller);
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
    const bucketName = bucketNameFor(object);
    if (bucketName) bundle[bucketName].push(object);
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
  const [proposal] = await sql<{ id: string; reviewerHandle: string }[]>`
    with reviewer as (
      select app_user.handle
      from workspace_members as membership
      join users as app_user
        on app_user.id = membership.user_id
      where membership.workspace_id = ${args.caller.workspaceId}::uuid
        and membership.role = 'founder'
        and membership.user_id <> ${args.caller.userId}::uuid
      order by app_user.handle
      limit 1
    ),
    proposal as (
      insert into context_objects (
        workspace_id,
        author_user_id,
        owner_user_id,
        type,
        text,
        epistemic_status,
        lifecycle_status,
        origin
      )
      select
        ${args.caller.workspaceId}::uuid,
        ${args.caller.userId}::uuid,
        ${args.caller.userId}::uuid,
        ${args.type},
        ${args.text},
        ${args.epistemicStatus},
        'pending',
        'assistant'
      from reviewer
      returning id
    ),
    audience as (
      insert into context_audiences (context_object_id, user_id)
      select proposal.id, membership.user_id
      from proposal
      join workspace_members as membership
        on membership.workspace_id = ${args.caller.workspaceId}::uuid
       and membership.role = 'founder'
    )
    select
      proposal.id::text as id,
      reviewer.handle as "reviewerHandle"
    from proposal
    cross join reviewer
  `;

  if (!proposal) throw new Error('Unable to create proposal');
  return {
    id: proposal.id,
    reviewPath: `/review/${proposal.id}?as=${encodeURIComponent(proposal.reviewerHandle)}`,
  };
}

export async function createChangeProposal(
  sql: Sql,
  args: {
    caller: Caller;
    objectId: string;
    text: string;
    origin: Extract<Origin, 'assistant' | 'web'>;
  },
): Promise<{ id: string; reviewPath: string }> {
  const replacementText = args.text.trim();
  if (!replacementText) throw new Error('Replacement wording is required');

  const [proposal] = await sql<{ id: string; reviewerHandle: string }[]>`
    with original as (
      select context_object.id, context_object.type
      from context_objects as context_object
      join context_audiences as caller_audience
        on caller_audience.context_object_id = context_object.id
       and caller_audience.user_id = ${args.caller.userId}::uuid
      where context_object.id = ${args.objectId}::uuid
        and context_object.workspace_id = ${args.caller.workspaceId}::uuid
        and context_object.lifecycle_status in ('pending', 'active')
        and context_object.text <> ${replacementText}
        and exists (
          select 1
          from context_audiences as other_audience
          where other_audience.context_object_id = context_object.id
            and other_audience.user_id <> ${args.caller.userId}::uuid
        )
        and not exists (
          select 1
          from context_objects as existing_replacement
          where existing_replacement.supersedes_object_id = context_object.id
            and existing_replacement.lifecycle_status = 'pending'
        )
      for update of context_object
    ),
    reviewer as (
      select app_user.handle
      from workspace_members as membership
      join users as app_user
        on app_user.id = membership.user_id
      where membership.workspace_id = ${args.caller.workspaceId}::uuid
        and membership.role = 'founder'
        and membership.user_id <> ${args.caller.userId}::uuid
      order by app_user.handle
      limit 1
    ),
    proposal as (
      insert into context_objects (
        workspace_id,
        author_user_id,
        owner_user_id,
        type,
        text,
        epistemic_status,
        lifecycle_status,
        origin,
        supersedes_object_id
      )
      select
        ${args.caller.workspaceId}::uuid,
        ${args.caller.userId}::uuid,
        ${args.caller.userId}::uuid,
        original.type,
        ${replacementText},
        'proposal',
        'pending',
        ${args.origin},
        original.id
      from original
      cross join reviewer
      returning id
    ),
    audience as (
      insert into context_audiences (context_object_id, user_id)
      select proposal.id, membership.user_id
      from proposal
      join workspace_members as membership
        on membership.workspace_id = ${args.caller.workspaceId}::uuid
       and membership.role = 'founder'
      returning context_object_id
    ),
    proposer_response as (
      insert into participant_responses (
        context_object_id,
        user_id,
        stance
      )
      select
        proposal.id,
        ${args.caller.userId}::uuid,
        'accepted'
      from proposal
      returning context_object_id
    )
    select
      proposal.id::text as id,
      reviewer.handle as "reviewerHandle"
    from proposal
    cross join reviewer
  `;

  if (!proposal) {
    throw new Error(
      'Unable to propose a change to this context object',
    );
  }

  return {
    id: proposal.id,
    reviewPath: `/review/${proposal.id}?as=${encodeURIComponent(proposal.reviewerHandle)}`,
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
  const [result] = await sql<{ responseCount: number }[]>`
    with audience_match as (
      select context_object.id
      from context_objects as context_object
      join context_audiences as audience
        on audience.context_object_id = context_object.id
       and audience.user_id = ${args.caller.userId}::uuid
      where context_object.id = ${args.objectId}::uuid
        and context_object.workspace_id = ${args.caller.workspaceId}::uuid
        and context_object.lifecycle_status in ('pending', 'active')
    ),
    response as (
      insert into participant_responses (
        context_object_id,
        user_id,
        stance,
        response_text
      )
      select
        audience_match.id,
        ${args.caller.userId}::uuid,
        ${args.stance},
        ${args.responseText ?? null}
      from audience_match
      on conflict (context_object_id, user_id)
      do update set
        stance = excluded.stance,
        response_text = excluded.response_text,
        created_at = now()
      returning context_object_id
    ),
    accepted_replacement as (
      select
        context_object.id,
        context_object.supersedes_object_id
      from context_objects as context_object
      join response
        on response.context_object_id = context_object.id
      where context_object.supersedes_object_id is not null
        and context_object.lifecycle_status = 'pending'
        and ${args.stance}::stance = 'accepted'
        and not exists (
          select 1
          from context_audiences as other_audience
          left join participant_responses as other_response
            on other_response.context_object_id =
              other_audience.context_object_id
           and other_response.user_id = other_audience.user_id
          where other_audience.context_object_id = context_object.id
            and other_audience.user_id <> ${args.caller.userId}::uuid
            and other_response.stance is distinct from 'accepted'::stance
        )
    ),
    ordinary_activation as (
      update context_objects as context_object
      set lifecycle_status = 'active'
      from response
      where context_object.id = response.context_object_id
        and context_object.lifecycle_status = 'pending'
        and context_object.supersedes_object_id is null
      returning context_object.id
    ),
    replacement_activation as (
      update context_objects as context_object
      set lifecycle_status = 'active'
      from accepted_replacement
      where context_object.id = accepted_replacement.id
        and context_object.lifecycle_status = 'pending'
      returning context_object.id
    ),
    replacement_revocation as (
      update context_objects as context_object
      set lifecycle_status = 'revoked'
      from response
      where context_object.id = response.context_object_id
        and context_object.lifecycle_status = 'pending'
        and context_object.supersedes_object_id is not null
        and ${args.stance}::stance in ('disputed', 'rejected')
      returning context_object.id
    ),
    supersession as (
      update context_objects as original
      set lifecycle_status = 'superseded'
      from accepted_replacement
      where original.id = accepted_replacement.supersedes_object_id
        and original.lifecycle_status in ('pending', 'active')
      returning original.id
    )
    select
      (select count(*)::integer from response) as "responseCount",
      (
        (select count(*)::integer from ordinary_activation) +
        (select count(*)::integer from replacement_activation)
      ) as "activationCount",
      (
        select count(*)::integer
        from replacement_revocation
      ) as "revocationCount",
      (select count(*)::integer from supersession) as "supersessionCount"
  `;

  if (!result || result.responseCount === 0) {
    throw new Error('Caller is not in the object audience');
  }
}

export async function getObjectForReview(
  sql: Sql,
  objectId: string,
  caller: Caller,
): Promise<ContextObjectView> {
  const [object] = await selectAuthorizedObjects(sql, caller, objectId);
  if (!object) throw new Error('Context object not found or not authorized');
  return object;
}

export async function getWorkspaceParticipants(
  sql: Sql,
  workspaceId: string,
): Promise<string[]> {
  const participants = await sql<{ displayName: string }[]>`
    select app_user.display_name as "displayName"
    from workspace_members as membership
    join users as app_user
      on app_user.id = membership.user_id
    where membership.workspace_id = ${workspaceId}::uuid
    order by app_user.handle
  `;

  return participants.map((participant) => participant.displayName);
}
