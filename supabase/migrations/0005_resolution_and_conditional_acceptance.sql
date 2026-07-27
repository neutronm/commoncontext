-- Add first-class conditional acceptance and question resolution links.
alter type lifecycle_status
  add value if not exists 'resolved' after 'active';

alter type stance
  add value if not exists 'accepted_with_condition' after 'accepted';

alter table context_objects
  add column if not exists resolves_object_id uuid
    references context_objects(id) on delete set null,
  add column if not exists resolved_by_object_id uuid
    references context_objects(id) on delete set null;

create unique index if not exists context_objects_one_pending_resolution_idx
  on context_objects(resolves_object_id)
  where resolves_object_id is not null
    and lifecycle_status = 'pending';
