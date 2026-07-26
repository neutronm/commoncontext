alter table context_objects
  drop constraint if exists context_objects_supersedes_object_id_key;

drop index if exists context_objects_one_pending_replacement_idx;

create unique index context_objects_one_pending_replacement_idx
  on context_objects(supersedes_object_id)
  where supersedes_object_id is not null
    and lifecycle_status = 'pending';
