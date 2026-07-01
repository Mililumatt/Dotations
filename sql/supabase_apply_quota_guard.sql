-- DOTATIONS - Correctif durable quota Supabase
-- A executer dans Supabase SQL Editor apres nettoyage.
-- Objectifs:
-- 1. l'audit de app_state ne stocke plus le payload complet;
-- 2. app_state_versions est limite automatiquement a 5 versions / 48 h;
-- 3. les anciens logs app_state lourds sont purges.

begin;

create extension if not exists pgcrypto;

create or replace function public.jsonb_sha256(input jsonb)
returns text
language sql
immutable
as $$
  select encode(digest(convert_to(coalesce(input, '{}'::jsonb)::text, 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_id text;
  v_old_data jsonb;
  v_new_data jsonb;
  v_old_payload jsonb;
  v_new_payload jsonb;
begin
  if tg_op = 'INSERT' then
    v_row_id := coalesce((to_jsonb(new)->>'id'), '');
    v_new_data := to_jsonb(new);
    if tg_table_name = 'app_state' then
      v_new_payload := coalesce(v_new_data->'payload', '{}'::jsonb);
      v_new_data := jsonb_build_object(
        'id', v_new_data->>'id',
        'revision', v_new_data->>'revision',
        'updated_at', v_new_data->>'updated_at',
        'payload_bytes', length(v_new_payload::text),
        'payload_checksum', public.jsonb_sha256(v_new_payload)
      );
    end if;
    insert into public.audit_log(table_name, action, row_id, actor_id, old_data, new_data)
    values (tg_table_name, tg_op, v_row_id, auth.uid(), null, v_new_data);
    return new;
  elsif tg_op = 'UPDATE' then
    v_row_id := coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id'), '');
    v_old_data := to_jsonb(old);
    v_new_data := to_jsonb(new);
    if tg_table_name = 'app_state' then
      v_old_payload := coalesce(v_old_data->'payload', '{}'::jsonb);
      v_new_payload := coalesce(v_new_data->'payload', '{}'::jsonb);
      v_old_data := jsonb_build_object(
        'id', v_old_data->>'id',
        'revision', v_old_data->>'revision',
        'updated_at', v_old_data->>'updated_at',
        'payload_bytes', length(v_old_payload::text),
        'payload_checksum', public.jsonb_sha256(v_old_payload)
      );
      v_new_data := jsonb_build_object(
        'id', v_new_data->>'id',
        'revision', v_new_data->>'revision',
        'updated_at', v_new_data->>'updated_at',
        'payload_bytes', length(v_new_payload::text),
        'payload_checksum', public.jsonb_sha256(v_new_payload)
      );
    end if;
    insert into public.audit_log(table_name, action, row_id, actor_id, old_data, new_data)
    values (tg_table_name, tg_op, v_row_id, auth.uid(), v_old_data, v_new_data);
    return new;
  elsif tg_op = 'DELETE' then
    v_row_id := coalesce((to_jsonb(old)->>'id'), '');
    v_old_data := to_jsonb(old);
    if tg_table_name = 'app_state' then
      v_old_payload := coalesce(v_old_data->'payload', '{}'::jsonb);
      v_old_data := jsonb_build_object(
        'id', v_old_data->>'id',
        'revision', v_old_data->>'revision',
        'updated_at', v_old_data->>'updated_at',
        'payload_bytes', length(v_old_payload::text),
        'payload_checksum', public.jsonb_sha256(v_old_payload)
      );
    end if;
    insert into public.audit_log(table_name, action, row_id, actor_id, old_data, new_data)
    values (tg_table_name, tg_op, v_row_id, auth.uid(), v_old_data, null);
    return old;
  end if;
  return null;
end;
$$;

create or replace function public.prune_app_state_versions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.app_state_versions
  where created_at < now() - interval '48 hours';

  with ranked as (
    select id,
           row_number() over (partition by app_state_id order by created_at desc, id desc) as rn
    from public.app_state_versions
  )
  delete from public.app_state_versions v
  using ranked r
  where v.id = r.id
    and r.rn > 5;
end;
$$;

create or replace function public.snapshot_app_state_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_id text;
  old_revision bigint;
  old_checksum text;
begin
  if to_jsonb(new)->>'payload' is distinct from to_jsonb(old)->>'payload' then
    old_id := coalesce(to_jsonb(old)->>'id', '');
    old_revision := coalesce((to_jsonb(old)->>'revision')::bigint, 0);
    old_checksum := public.jsonb_sha256((to_jsonb(old)->'payload')::jsonb);

    insert into public.app_state_versions (
      app_state_id, source_revision, payload, payload_checksum, created_by, reason
    )
    values (
      old_id,
      old_revision,
      coalesce((to_jsonb(old)->'payload')::jsonb, '{}'::jsonb),
      old_checksum,
      auth.uid(),
      'snapshot_before_update'
    )
    on conflict (app_state_id, source_revision) do nothing;

    insert into public.app_state_save_journal(app_state_id, event_type, actor_id, details)
    values (
      old_id,
      'save',
      auth.uid(),
      jsonb_build_object(
        'from_revision', old_revision,
        'to_revision', coalesce((to_jsonb(new)->>'revision')::bigint, old_revision + 1),
        'checksum_before', old_checksum
      )
    );

    perform public.prune_app_state_versions();
  end if;
  return new;
end;
$$;

delete from public.audit_log
where table_name = 'app_state';

select public.prune_app_state_versions();

commit;

vacuum analyze public.audit_log;
vacuum analyze public.app_state_versions;

