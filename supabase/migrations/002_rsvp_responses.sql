-- Confirmações de presença enviadas pelo formulário (anon insert; leitura só no painel).
create table if not exists public.rsvp_responses (
  id uuid primary key default gen_random_uuid (),
  full_name text not null,
  email text,
  phone text,
  attending text not null check (attending in ('yes', 'no', 'maybe')),
  guest_count int not null default 1 check (guest_count >= 0 and guest_count <= 20),
  dietary_notes text,
  message text,
  created_at timestamptz not null default now ()
);

create index if not exists rsvp_responses_created_at_idx on public.rsvp_responses (created_at desc);

alter table public.rsvp_responses enable row level security;

create policy "anon insert rsvp responses" on public.rsvp_responses for insert to anon
with
  check (true);
