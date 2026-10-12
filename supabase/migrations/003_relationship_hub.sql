-- Apply once after 001_initial.sql. Compatible with or without migration 002.
-- Existing companies, contacts and CRM records are preserved.
begin;
alter table public.companies
 add column legal_name text not null default '',
 add column tax_id text not null default '',
 add column description text not null default '',
 add column company_size text not null default 'Não informado',
 add column city text not null default '',
 add column state text not null default '',
 add column country text not null default 'Brasil',
 add column business_phone text not null default '',
 add column business_email text not null default '',
 add column products_services text not null default '',
 add column challenges text not null default '',
 add column strategic_objectives text not null default '',
 add column account_status text not null default 'Prospect' check(account_status in ('Prospect','Cliente','Ex-cliente','Parceiro')),
 add column icp_fit text not null default 'Não avaliada' check(icp_fit in ('Não avaliada','Alta','Média','Baixa')),
 add column relationship_status text not null default 'Não avaliado' check(relationship_status in ('Não avaliado','Em construção','Saudável','Atenção','Em risco')),
 add column relationship_notes text not null default '';
alter table public.contacts
 add column job_title text not null default '',
 add column department text not null default '',
 add column phone text not null default '',
 add column whatsapp text not null default '',
 add column linkedin text not null default '',
 add column preferred_channel text not null default 'Não informado' check(preferred_channel in ('Não informado','E-mail','Telefone','WhatsApp','Reunião')),
 add column influence text not null default 'Não mapeada' check(influence in ('Não mapeada','Alta','Média','Baixa')),
 add column interests text not null default '',
 add column priorities text not null default '',
 add column notes text not null default '',
 add column relationship_status text not null default 'Não avaliado' check(relationship_status in ('Não avaliado','Em construção','Saudável','Atenção','Em risco')),
 add column relationship_notes text not null default '',
 add constraint contact_id_org_unique unique(id,organization_id);

create table public.relationship_events (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 company_id uuid, contact_id uuid,
 event_type text not null check(event_type in ('Ligação','Reunião','E-mail','WhatsApp','Nota','Outro')),
 title text not null check(length(trim(title)) between 1 and 200),
 description text not null default '',
 outcome text not null default 'Conversa realizada' check(outcome in ('Avanço','Conversa realizada','Sem resposta','Ponto de atenção')),
 occurred_at timestamptz not null default now(),
 follow_up_date date, follow_up_description text not null default '',
 follow_up_done boolean not null default false,
 created_by uuid not null references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now(),
 check(company_id is not null or contact_id is not null),
 foreign key (company_id,organization_id) references public.companies(id,organization_id),
 foreign key (contact_id,organization_id) references public.contacts(id,organization_id)
);
-- Store the contact's company at the moment of the interaction. Its history stays
-- with that company even if the contact changes companies later.
create function public.prepare_relationship_event() returns trigger
language plpgsql set search_path='' as $$
declare linked_company uuid;
begin
 if new.occurred_at > now() + interval '5 minutes' then raise exception 'Registre uma interação já realizada. Use o próximo passo para planejar ações futuras.'; end if;
 if new.contact_id is not null then
  select company_id into linked_company from public.contacts where id=new.contact_id and organization_id=new.organization_id;
  if not found then raise exception 'Contato indisponível nesta empresa'; end if;
  new.company_id := linked_company;
 end if;
 return new;
end;
$$;
revoke all on function public.prepare_relationship_event() from public,anon,authenticated;
create trigger relationship_event_company before insert on public.relationship_events for each row execute function public.prepare_relationship_event();
alter table public.relationship_events enable row level security;
create policy relationship_event_read on public.relationship_events for select to authenticated using(public.is_member(organization_id));
create policy relationship_event_insert on public.relationship_events for insert to authenticated with check(public.is_member(organization_id) and created_by=(select auth.uid()));
create policy relationship_followup_update on public.relationship_events for update to authenticated using(public.is_member(organization_id)) with check(public.is_member(organization_id));
revoke all on public.relationship_events from anon,authenticated;
grant select,insert on public.relationship_events to authenticated;
-- Preserve interaction history: members can only mark/unmark the follow-up.
grant update(follow_up_done) on public.relationship_events to authenticated;
create index on public.relationship_events(organization_id,company_id,occurred_at desc);
create index on public.relationship_events(organization_id,contact_id,occurred_at desc);
notify pgrst, 'reload schema';
commit;
