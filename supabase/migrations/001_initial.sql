begin;
create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 120),
 owner_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.memberships (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','member')),
 primary key (organization_id, user_id)
);
create or replace function public.is_member(org uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.memberships where organization_id = org and user_id = (select auth.uid()));
$$;
revoke all on function public.is_member(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated;
create or replace function public.create_organization(org_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare org_id uuid;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária'; end if;
 insert into public.organizations(name, owner_id) values (trim(org_name), auth.uid()) returning id into org_id;
 insert into public.memberships values (org_id, auth.uid(), 'owner');
 return org_id;
end;
$$;
revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
create table public.companies (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null check (length(trim(name)) > 0), industry text not null default '', website text not null default '',
 created_at timestamptz not null default now(), unique(id, organization_id)
);
create table public.contacts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 company_id uuid, name text not null check (length(trim(name)) > 0), email text not null default '',
 role text not null default 'Contato', created_at timestamptz not null default now(),
 foreign key (company_id, organization_id) references public.companies(id, organization_id)
);
create table public.leads (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null check (length(trim(name)) > 0), email text not null default '', source text not null default '',
 fit integer not null default 0 check (fit between 0 and 100), intent integer not null default 0 check (intent between 0 and 100),
 status text not null default 'Novo' check(status in ('Novo','Em contato','Qualificado','Descartado')),
 created_at timestamptz not null default now()
);
create table public.opportunities (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 company_id uuid, name text not null check (length(trim(name)) > 0), value numeric(14,2) not null default 0 check(value >= 0),
 stage text not null default 'Discovery' check(stage in ('Discovery','Validação','Proposta','Negociação','Ganha','Perdida')),
 owner_name text not null default '', close_date date, notes text not null default '',
 qualification jsonb not null default '{}'::jsonb check(jsonb_typeof(qualification) = 'object'),
 created_at timestamptz not null default now(), unique(id, organization_id),
 foreign key (company_id, organization_id) references public.companies(id, organization_id)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 opportunity_id uuid, title text not null check (length(trim(title)) > 0), due_date date, owner_name text not null default '',
 done boolean not null default false, created_at timestamptz not null default now(),
 foreign key (opportunity_id, organization_id) references public.opportunities(id, organization_id)
);
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
create policy org_read on public.organizations for select to authenticated using (public.is_member(id));
create policy membership_read on public.memberships for select to authenticated using (user_id = (select auth.uid()));
grant select on public.organizations, public.memberships to authenticated;
revoke all on public.organizations, public.memberships from anon;
revoke insert, update, delete on public.organizations, public.memberships from authenticated;
do $$ declare tab text; begin
 foreach tab in array array['companies','contacts','leads','opportunities','tasks'] loop
 execute format('alter table public.%I enable row level security', tab);
 execute format('create policy tenant_access on public.%I for all to authenticated using (public.is_member(organization_id)) with check (public.is_member(organization_id))', tab);
 execute format('grant select, insert, update, delete on public.%I to authenticated', tab);
 execute format('revoke all on public.%I from anon', tab);
 execute format('create index on public.%I (organization_id)', tab);
 end loop;
end $$;
commit;
