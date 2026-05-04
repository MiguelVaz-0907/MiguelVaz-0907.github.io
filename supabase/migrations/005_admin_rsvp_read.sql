-- Leitura de confirmações apenas para admins (relatório no painel).
create policy "admin read rsvp responses" on public.rsvp_responses for select to authenticated using (
  exists (
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
  )
);
