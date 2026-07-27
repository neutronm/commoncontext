do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'participant_responses_audience_fkey'
      and conrelid = 'participant_responses'::regclass
  ) then
    alter table participant_responses
      add constraint participant_responses_audience_fkey
      foreign key (context_object_id, user_id)
      references context_audiences(context_object_id, user_id)
      on delete cascade
      not valid;
  end if;
end
$$;

alter table participant_responses
  validate constraint participant_responses_audience_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'participant_responses_condition_text_check'
      and conrelid = 'participant_responses'::regclass
  ) then
    alter table participant_responses
      add constraint participant_responses_condition_text_check
      check (
        stance <> 'accepted_with_condition'
        or nullif(btrim(response_text), '') is not null
      )
      not valid;
  end if;
end
$$;

alter table participant_responses
  validate constraint participant_responses_condition_text_check;
