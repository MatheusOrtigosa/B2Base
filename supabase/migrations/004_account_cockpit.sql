-- Apply once after 003_relationship_hub.sql. Preserves existing CRM records.
begin;
alter table public.contacts add column reports_to_id uuid;
alter table public.contacts add constraint contact_superior_same_org
 foreign key(reports_to_id,organization_id) references public.contacts(id,organization_id);
alter table public.opportunities
 add column seller_feeling text not null default 'Não avaliado' check(seller_feeling in ('Não avaliado','Muito desfavorável','Desfavorável','Neutro','Favorável','Muito favorável')),
 add column seller_feeling_notes text not null default '',
 add column seller_feeling_updated_at timestamptz;

create function public.validate_contact_hierarchy() returns trigger
language plpgsql set search_path='' as $$
declare manager_company uuid;
begin
 -- Serialize hierarchy changes inside an organization to prevent concurrent cycles.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.organization_id::text,0));
 if new.reports_to_id is not null then
  if new.reports_to_id=new.id then raise exception 'Um contato não pode ser seu próprio superior'; end if;
  if new.company_id is null then raise exception 'Vincule o contato a uma empresa antes de definir o superior'; end if;
  select company_id into manager_company from public.contacts where id=new.reports_to_id and organization_id=new.organization_id;
  if not found or manager_company is distinct from new.company_id then raise exception 'O superior deve ser um contato da mesma empresa'; end if;
  if exists(
   with recursive chain as (
    select id,reports_to_id,array[id] as visited from public.contacts where id=new.reports_to_id and organization_id=new.organization_id
    union all
    select c.id,c.reports_to_id,chain.visited||c.id from public.contacts c join chain on c.id=chain.reports_to_id
    where c.organization_id=new.organization_id and not c.id=any(chain.visited)
   ) select 1 from chain where id=new.id
  ) then raise exception 'Essa relação criaria um ciclo no organograma'; end if;
 end if;
 if exists(select 1 from public.contacts c where c.reports_to_id=new.id and c.organization_id=new.organization_id and c.company_id is distinct from new.company_id) then
  raise exception 'Reorganize os subordinados antes de mudar a empresa deste contato';
 end if;
 return new;
end;
$$;
revoke all on function public.validate_contact_hierarchy() from public,anon,authenticated;
create trigger validate_contact_hierarchy before insert or update of reports_to_id,company_id,organization_id on public.contacts
 for each row execute function public.validate_contact_hierarchy();

create function public.timestamp_seller_feeling() returns trigger language plpgsql set search_path='' as $$
begin
 if (tg_op='INSERT' and new.seller_feeling<>'Não avaliado') or
 (tg_op='UPDATE' and (new.seller_feeling is distinct from old.seller_feeling or new.seller_feeling_notes is distinct from old.seller_feeling_notes)) then
  new.seller_feeling_updated_at:=now();
 elsif tg_op='UPDATE' then
  new.seller_feeling_updated_at:=old.seller_feeling_updated_at;
 end if;
 return new;
end;
$$;
revoke all on function public.timestamp_seller_feeling() from public,anon,authenticated;
create trigger timestamp_seller_feeling before insert or update on public.opportunities for each row execute function public.timestamp_seller_feeling();
create index on public.contacts(organization_id,company_id,reports_to_id);
notify pgrst, 'reload schema';
commit;
