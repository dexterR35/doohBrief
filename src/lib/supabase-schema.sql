create extension if not exists "pgcrypto";

create table if not exists public.dooh_briefs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  payload jsonb not null default '{}'::jsonb,
  asset_base_path text not null default '/dooh',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dooh_briefs_updated_at on public.dooh_briefs(updated_at desc);

create table if not exists public.dooh_brief_media (
  id uuid primary key default gen_random_uuid(),
  brief_slug text not null references public.dooh_briefs(slug) on delete cascade,
  scene_id text null,
  kind text not null,
  storage_path text not null unique,
  original_filename text null,
  mime_type text null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dooh_media_brief_slug on public.dooh_brief_media(brief_slug);
create index if not exists idx_dooh_media_kind on public.dooh_brief_media(kind);
create index if not exists idx_dooh_media_scene_kind on public.dooh_brief_media(scene_id, kind);

create table if not exists public.dooh_prompts (
  id uuid primary key default gen_random_uuid(),
  brief_slug text not null references public.dooh_briefs(slug) on delete cascade,
  scene_id text not null,
  prompt_type text not null,
  prompt_text text not null,
  version int not null default 1,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dooh_prompts_brief_scene on public.dooh_prompts(brief_slug, scene_id);
create index if not exists idx_dooh_prompts_active on public.dooh_prompts(is_active);

create table if not exists public.dooh_archives (
  id uuid primary key default gen_random_uuid(),
  brief_slug text not null references public.dooh_briefs(slug) on delete cascade,
  archived_payload jsonb not null,
  reason text null,
  archived_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz not null default now()
);

create index if not exists idx_dooh_archives_brief_slug on public.dooh_archives(brief_slug);
create index if not exists idx_dooh_archives_archived_at on public.dooh_archives(archived_at desc);

alter table public.dooh_briefs enable row level security;
alter table public.dooh_brief_media enable row level security;
alter table public.dooh_prompts enable row level security;
alter table public.dooh_archives enable row level security;

drop policy if exists "authenticated can read briefs" on public.dooh_briefs;
create policy "authenticated can read briefs"
on public.dooh_briefs for select
to authenticated
using (true);

drop policy if exists "authenticated can read media" on public.dooh_brief_media;
create policy "authenticated can read media"
on public.dooh_brief_media for select
to authenticated
using (true);

drop policy if exists "authenticated can read prompts" on public.dooh_prompts;
create policy "authenticated can read prompts"
on public.dooh_prompts for select
to authenticated
using (true);

drop policy if exists "authenticated can read archives" on public.dooh_archives;
create policy "authenticated can read archives"
on public.dooh_archives for select
to authenticated
using (true);

drop policy if exists "authenticated can write briefs" on public.dooh_briefs;
create policy "authenticated can write briefs"
on public.dooh_briefs for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can write media" on public.dooh_brief_media;
create policy "authenticated can write media"
on public.dooh_brief_media for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can write prompts" on public.dooh_prompts;
create policy "authenticated can write prompts"
on public.dooh_prompts for all
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can write archives" on public.dooh_archives;
create policy "authenticated can write archives"
on public.dooh_archives for all
to authenticated
using (true)
with check (true);

