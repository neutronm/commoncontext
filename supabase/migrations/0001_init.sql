drop table if exists participant_responses cascade;
drop table if exists context_audiences cascade;
drop table if exists context_objects cascade;
drop table if exists workspace_members cascade;
drop table if exists workspaces cascade;
drop table if exists users cascade;

drop type if exists stance cascade;
drop type if exists origin cascade;
drop type if exists lifecycle_status cascade;
drop type if exists epistemic_status cascade;
drop type if exists context_object_type cascade;

create type context_object_type as enum (
  'decision',
  'perspective',
  'task',
  'blocker',
  'open_question',
  'source_document'
);

create type epistemic_status as enum (
  'verified_fact',
  'reported_fact',
  'perspective',
  'proposal'
);

create type lifecycle_status as enum (
  'pending',
  'active',
  'resolved',
  'superseded',
  'revoked'
);

create type origin as enum (
  'seed',
  'assistant',
  'web'
);

create type stance as enum (
  'acknowledged',
  'accepted',
  'accepted_with_condition',
  'disputed',
  'rejected'
);

create table users (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  display_name text not null,
  api_token text not null unique
);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  primary key (workspace_id, user_id)
);

create table context_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  author_user_id uuid not null references users(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  type context_object_type not null,
  text text not null,
  epistemic_status epistemic_status not null,
  lifecycle_status lifecycle_status not null,
  origin origin not null,
  source_reference text,
  supersedes_object_id uuid references context_objects(id) on delete cascade,
  resolves_object_id uuid references context_objects(id) on delete set null,
  resolved_by_object_id uuid references context_objects(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index context_objects_one_pending_replacement_idx
  on context_objects(supersedes_object_id)
  where supersedes_object_id is not null
    and lifecycle_status = 'pending';

create unique index context_objects_one_pending_resolution_idx
  on context_objects(resolves_object_id)
  where resolves_object_id is not null
    and lifecycle_status = 'pending';

create table context_audiences (
  context_object_id uuid not null references context_objects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (context_object_id, user_id)
);

create index context_audiences_user_id_idx on context_audiences(user_id);

create table participant_responses (
  id uuid primary key default gen_random_uuid(),
  context_object_id uuid not null references context_objects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  stance stance not null,
  response_text text,
  created_at timestamptz not null default now(),
  unique (context_object_id, user_id),
  constraint participant_responses_condition_text_check check (
    stance <> 'accepted_with_condition'
    or nullif(btrim(response_text), '') is not null
  ),
  constraint participant_responses_audience_fkey
    foreign key (context_object_id, user_id)
    references context_audiences(context_object_id, user_id)
    on delete cascade
);
