-- Branding per event. Run once in Supabase: SQL Editor -> New query -> paste -> Run.

alter table public.events
  add column if not exists brand_color text not null default '#c8ff3d'
    check (brand_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists logo_url   text,
  add column if not exists banner_url text;

-- Public bucket for logos & flyers (images only, max 5 MB each).
-- Files are readable by anyone with the URL (they appear on tickets);
-- only the server can create upload links, so nobody else can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', true, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
