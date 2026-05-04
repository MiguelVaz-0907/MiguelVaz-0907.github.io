-- Progresso só sobe com linhas payment_status = 'paid' (inseridas pelo webhook/servidor com service role).
create table if not exists public.gift_contributions (
  id uuid primary key default gen_random_uuid (),
  gift_id text not null,
  amount numeric(12, 2) not null check (amount > 0),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  provider_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now ()
);

create index if not exists gift_contributions_gift_id_idx on public.gift_contributions (gift_id);
create index if not exists gift_contributions_status_idx on public.gift_contributions (payment_status);

alter table public.gift_contributions enable row level security;

-- Leitura pública apenas do que já foi confirmado (o app usa a anon key).
create policy "anon read paid gift contributions" on public.gift_contributions for select to anon using (payment_status = 'paid');

-- Sem política de insert para anon/authenticated: apenas service role (Edge Function, backend ou SQL no painel).
