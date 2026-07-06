-- DOTATIONS - Correctif immediat signature mobile / Supabase
-- A executer seul dans Supabase SQL Editor.
-- Objectif:
-- 1. supprimer la dependance a digest()/pgcrypto;
-- 2. permettre aux pages mobiles d'ecrire une signature dediee sans reecrire tout app_state;
-- 3. permettre a l'UI de relire uniquement les signatures mobiles necessaires;
-- 4. conserver les anciennes colonnes existantes sans destruction.

create or replace function public.jsonb_sha256(input jsonb)
returns text
language sql
immutable
as $$
  select md5(coalesce(input, '{}'::jsonb)::text)
$$;

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid()
);

alter table public.signatures
  add column if not exists token text,
  add column if not exists person_id text,
  add column if not exists doc_type text,
  add column if not exists signer text,
  add column if not exists status text,
  add column if not exists signature_data text,
  add column if not exists storage_ref text,
  add column if not exists storage_public_url text,
  add column if not exists validated_at_text text,
  add column if not exists signed_at timestamptz default now(),
  add column if not exists person_nom text,
  add column if not exists person_prenom text,
  add column if not exists signer_name text,
  add column if not exists signer_function text,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists ux_signatures_mobile_token
  on public.signatures(token)
  where token is not null;

create index if not exists ix_signatures_mobile_lookup
  on public.signatures(person_id, doc_type, signer, updated_at desc)
  where person_id is not null and doc_type is not null and signer is not null;

alter table public.signatures enable row level security;

drop policy if exists "mobile_signature_select_by_token" on public.signatures;
create policy "mobile_signature_select_by_token"
on public.signatures
for select
to anon, authenticated
using (token is not null and person_id is not null and doc_type in ('arrival', 'exit'));

drop policy if exists "mobile_signature_insert_by_token" on public.signatures;
create policy "mobile_signature_insert_by_token"
on public.signatures
for insert
to anon, authenticated
with check (
  token is not null
  and person_id is not null
  and doc_type in ('arrival', 'exit')
  and signer in ('personnel', 'representant')
);

drop policy if exists "mobile_signature_update_by_token" on public.signatures;
create policy "mobile_signature_update_by_token"
on public.signatures
for update
to anon, authenticated
using (token is not null)
with check (
  token is not null
  and person_id is not null
  and doc_type in ('arrival', 'exit')
  and signer in ('personnel', 'representant')
);

-- Test rapide : doit retourner une valeur md5, sans erreur digest().
select public.jsonb_sha256('{"test":"ok"}'::jsonb) as checksum_test;
