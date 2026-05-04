-- Evita duplicar o mesmo pagamento se o provedor reenviar o webhook.
create unique index if not exists gift_contributions_provider_ref_uidx
on public.gift_contributions (provider_ref)
where provider_ref is not null;
