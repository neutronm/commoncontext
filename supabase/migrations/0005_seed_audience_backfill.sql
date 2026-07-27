-- Seed objects 301–310 are shared demo context. Backfill every workspace
-- participant into the same context_audiences source used by runtime writes.
insert into context_audiences (context_object_id, user_id)
select context_object.id, membership.user_id
from context_objects as context_object
join workspace_members as membership
  on membership.workspace_id = context_object.workspace_id
where context_object.id in (
  '00000000-0000-0000-0000-000000000301'::uuid,
  '00000000-0000-0000-0000-000000000302'::uuid,
  '00000000-0000-0000-0000-000000000303'::uuid,
  '00000000-0000-0000-0000-000000000304'::uuid,
  '00000000-0000-0000-0000-000000000305'::uuid,
  '00000000-0000-0000-0000-000000000306'::uuid,
  '00000000-0000-0000-0000-000000000307'::uuid,
  '00000000-0000-0000-0000-000000000308'::uuid,
  '00000000-0000-0000-0000-000000000309'::uuid,
  '00000000-0000-0000-0000-000000000310'::uuid
)
on conflict (context_object_id, user_id) do nothing;

update participant_responses
set stance = 'accepted_with_condition'
from context_objects
where participant_responses.context_object_id =
    '00000000-0000-0000-0000-000000000310'::uuid
  and user_id = '00000000-0000-0000-0000-000000000002'::uuid
  and context_objects.id = participant_responses.context_object_id
  and context_objects.origin = 'seed';
