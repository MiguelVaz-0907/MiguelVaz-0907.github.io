-- Catálogo editável no painel admin: presentes e convidados.
-- Depois de criar um utilizador em Authentication > Users, autorize-o:
--   insert into public.app_admins (user_id) values ('<uuid do auth.users>');
create table if not exists public.wedding_gifts (
  id text primary key,
  title text not null,
  description text not null default '',
  price numeric(12, 2) not null check (price > 0),
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wedding_invited_guests (
  id text primary key,
  name text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create index if not exists wedding_gifts_sort_idx on public.wedding_gifts (sort_order, id);
create index if not exists wedding_invited_guests_sort_idx on public.wedding_invited_guests (sort_order, id);

alter table public.wedding_gifts enable row level security;
alter table public.wedding_invited_guests enable row level security;
alter table public.app_admins enable row level security;

-- Leitura pública (site dos convidados).
create policy "anon read wedding gifts" on public.wedding_gifts for select to anon using (true);
create policy "authenticated read wedding gifts" on public.wedding_gifts for select to authenticated using (true);

create policy "anon read wedding invited guests" on public.wedding_invited_guests for select to anon using (true);
create policy "authenticated read wedding invited guests" on public.wedding_invited_guests for select to authenticated using (true);

-- Quem é admin vê a própria linha (para verificar sessão).
create policy "admin read own row" on public.app_admins for select to authenticated using (user_id = auth.uid());

-- Escrita apenas para admins (lista app_admins).
create policy "admin insert wedding gifts" on public.wedding_gifts for insert to authenticated with check (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
);

create policy "admin update wedding gifts" on public.wedding_gifts for update to authenticated using (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
);

create policy "admin delete wedding gifts" on public.wedding_gifts for delete to authenticated using (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
);

create policy "admin insert wedding invited guests" on public.wedding_invited_guests for insert to authenticated with check (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
);

create policy "admin update wedding invited guests" on public.wedding_invited_guests for update to authenticated using (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
);

create policy "admin delete wedding invited guests" on public.wedding_invited_guests for delete to authenticated using (
  exists (select 1 from public.app_admins a where a.user_id = auth.uid())
);

-- Dados iniciais (idempotente). Ajuste no admin depois se quiser.
insert into
  public.wedding_gifts (id, title, description, price, sort_order)
values
  ('jantar', 'Jantar romântico pós-lua de mel', 'Uma noite especial para fechar com chave de ouro.', 450, 10),
  ('panelas', 'Jogo de panelas premium', 'Para a casa nova cheirar a comida feita com carinho.', 899.90, 20),
  ('cafeteira', 'Cafeteira espresso', 'Manhãs mais gostosas ao lado um do outro.', 1200, 30),
  ('lua', 'Contribuição para a lua de mel', 'Qualquer valor ajuda a tornar a viagem inesquecível.', 300, 40),
  ('toalhas', 'Jogo de toalhas de banho', 'Conforto e maciez para o dia a dia.', 280, 50),
  ('vinhos', 'Seleção de vinhos', 'Para brindar histórias e futuras celebrações.', 350, 60)
on conflict (id) do nothing;

insert into
  public.wedding_invited_guests (id, name, sort_order)
values
  ('maria-silva', 'Maria Silva', 10),
  ('joao-santos', 'João Santos', 20),
  ('familia-oliveira', 'Família Oliveira', 30)
on conflict (id) do nothing;
