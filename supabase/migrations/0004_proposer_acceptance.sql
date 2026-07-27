insert into participant_responses (
  context_object_id,
  user_id,
  stance
)
select
  context_object.id,
  context_object.author_user_id,
  'accepted'
from context_objects as context_object
join context_audiences as audience
  on audience.context_object_id = context_object.id
 and audience.user_id = context_object.author_user_id
where context_object.epistemic_status = 'proposal'
on conflict (context_object_id, user_id) do nothing;
