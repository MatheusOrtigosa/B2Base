-- Apply once AFTER 001_initial.sql. Existing CRM records are preserved.
begin;
alter table public.opportunities add column assignee_id uuid;
alter table public.tasks add column assignee_id uuid;
alter table public.opportunities add constraint opportunity_assignee_member
 foreign key (organization_id, assignee_id) references public.memberships(organization_id, user_id);
alter table public.tasks add constraint task_assignee_member
 foreign key (organization_id, assignee_id) references public.memberships(organization_id, user_id);

create table public.invitations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 email text not null check(email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 invited_by uuid not null references auth.users(id),
 expires_at timestamptz not null default (now() + interval '7 days'),
 accepted_at timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create index on public.invitations(organization_id);
create index on public.invitations(email);
alter table public.invitations enable row level security;
revoke all on public.invitations from anon, authenticated;

-- RPCs check membership/ownership explicitly before returning private data.
create function public.get_team(org_id uuid)
returns table(user_id uuid, email text, role text)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.is_member(org_id) then raise exception 'Acesso negado'; end if;
 return query select m.user_id, u.email::text, m.role from public.memberships m
 join auth.users u on u.id = m.user_id where m.organization_id = org_id
 order by m.role desc, u.email;
end;
$$;
create function public.get_team_invitations(org_id uuid)
returns table(id uuid, email text, expires_at timestamptz, accepted_at timestamptz, revoked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.memberships where organization_id=org_id and user_id=auth.uid() and role='owner') then raise exception 'Somente o administrador pode ver os convites'; end if;
 return query select i.id,i.email,i.expires_at,i.accepted_at,i.revoked_at from public.invitations i
 where i.organization_id=org_id order by i.created_at desc;
end;
$$;
create function public.invite_member(org_id uuid, invite_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid; normalized text := lower(trim(invite_email));
begin
 if not exists(select 1 from public.memberships where organization_id=org_id and user_id=auth.uid() and role='owner') then raise exception 'Somente o administrador pode convidar'; end if;
 -- Serialize duplicate invites for the same organization.
 perform 1 from public.organizations where id=org_id for update;
 if normalized is null or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe um e-mail válido'; end if;
 if exists(select 1 from public.memberships m join auth.users u on u.id=m.user_id where m.organization_id=org_id and lower(u.email)=normalized) then raise exception 'Esta pessoa já participa da equipe'; end if;
 if exists(select 1 from public.invitations where organization_id=org_id and email=normalized and accepted_at is null and revoked_at is null and expires_at>now()) then raise exception 'Já existe um convite ativo para este e-mail'; end if;
 insert into public.invitations(organization_id,email,invited_by) values(org_id,normalized,auth.uid()) returning id into new_id;
 return new_id;
end;
$$;
create function public.my_invitations()
returns table(id uuid, organization_name text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select i.id,o.name,i.expires_at from public.invitations i join public.organizations o on o.id=i.organization_id
 join auth.users u on u.id=auth.uid() and lower(u.email)=i.email and u.email_confirmed_at is not null
 where i.accepted_at is null and i.revoked_at is null and i.expires_at>now() order by i.created_at desc;
$$;
create function public.accept_invitation(invitation_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare invitation public.invitations; verified_email text;
begin
 select lower(email) into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'Confirme o e-mail da sua conta antes de aceitar'; end if;
 select * into invitation from public.invitations where id=invitation_id for update;
 if not found or invitation.email<>verified_email or invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.expires_at<=now() then raise exception 'Convite inválido, expirado ou indisponível para esta conta'; end if;
 insert into public.memberships(organization_id,user_id,role) values(invitation.organization_id,auth.uid(),'member') on conflict do nothing;
 update public.invitations set accepted_at=now() where id=invitation.id;
 return invitation.organization_id;
end;
$$;
create function public.revoke_invitation(invitation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare invitation public.invitations;
begin
 select * into invitation from public.invitations where id=invitation_id for update;
 if not found or not exists(select 1 from public.memberships where organization_id=invitation.organization_id and user_id=auth.uid() and role='owner') then raise exception 'Acesso negado'; end if;
 if invitation.accepted_at is not null then raise exception 'Este convite já foi aceito'; end if;
 update public.invitations set revoked_at=now() where id=invitation_id;
end;
$$;
revoke all on function public.get_team(uuid), public.get_team_invitations(uuid), public.invite_member(uuid,text), public.my_invitations(), public.accept_invitation(uuid), public.revoke_invitation(uuid) from public, anon;
grant execute on function public.get_team(uuid), public.get_team_invitations(uuid), public.invite_member(uuid,text), public.my_invitations(), public.accept_invitation(uuid), public.revoke_invitation(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
