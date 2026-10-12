import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

// Execute the real migrations in PostgreSQL, with a minimal Supabase Auth shim.
// This covers database rules, not the hosted Auth service or email delivery.
test('tenant isolation, invitations and team assignment',async(t)=>{
 const db=new PGlite();
 const a='00000000-0000-4000-8000-000000000001';
 const b='00000000-0000-4000-8000-000000000002';
 const c='00000000-0000-4000-8000-000000000003';
 const d='00000000-0000-4000-8000-000000000004';
 const e='00000000-0000-4000-8000-000000000005';
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,public to authenticated,anon;
 grant execute on function auth.uid() to authenticated,anon;`);
 await db.query('insert into auth.users values ($1,$2,now()),($3,$4,now()),($5,$6,now()),($7,$8,null),($9,$10,now())',[a,'a@example.com',b,'b@example.com',c,'c@example.com',d,'unconfirmed@example.com',e,'e@example.com']);
 await db.exec(await readFile(new URL('../supabase/migrations/001_initial.sql',import.meta.url),'utf8'));
 await as(a);const orgA=await scalar("select public.create_organization('Empresa A')");
 const companyA=await scalar('insert into public.companies(organization_id,name) values($1,$2) returning id',[orgA,'Cliente A']);
 const opportunityA=await scalar('insert into public.opportunities(organization_id,company_id,name,owner_name) values($1,$2,$3,$4) returning id',[orgA,companyA,'Venda A','Nome legado']);
 await db.query('insert into public.contacts(organization_id,company_id,name) values($1,$2,$3)',[orgA,companyA,'Contato A']);
 await db.query('insert into public.leads(organization_id,name) values($1,$2)',[orgA,'Lead A']);
 await db.query('insert into public.tasks(organization_id,opportunity_id,title) values($1,$2,$3)',[orgA,opportunityA,'Tarefa A']);
 await as(b);const orgB=await scalar("select public.create_organization('Empresa B')");
 await t.test('initial policies block cross-tenant reads, writes and relationships',async()=>{
 for(const table of ['companies','contacts','leads','opportunities','tasks']){
  assert.equal(await scalar(`select count(*)::int from public.${table} where organization_id=$1`,[orgA]),0);
 }
 assert.equal((await db.query('update public.companies set name=$1 where id=$2 returning id',['Ataque',companyA])).rows.length,0);
 assert.equal((await db.query('delete from public.opportunities where id=$1 returning id',[opportunityA])).rows.length,0);
 await assert.rejects(db.query('insert into public.companies(organization_id,name) values($1,$2)',[orgA,'Ataque']),/row-level security/i);
 await assert.rejects(db.query('insert into public.contacts(organization_id,company_id,name) values($1,$2,$3)',[orgB,companyA,'Ataque']),/foreign key/i);
 await assert.rejects(db.query('insert into public.tasks(organization_id,opportunity_id,title) values($1,$2,$3)',[orgB,opportunityA,'Ataque']),/foreign key/i);
 await assert.rejects(db.query('insert into public.memberships values($1,$2,$3)',[orgA,b,'owner']),/permission denied/i);
 });
 await db.exec('reset role');await db.exec(await readFile(new URL('../supabase/migrations/002_team_collaboration.sql',import.meta.url),'utf8'));
 await t.test('team migration preserves existing records and responsible names',async()=>{
 await as(a);const r=(await db.query('select owner_name,assignee_id from public.opportunities where id=$1',[opportunityA])).rows[0];
 assert.equal(r.owner_name,'Nome legado');assert.equal(r.assignee_id,null);
 });
 await t.test('outsiders cannot read team or invites or choose external assignees',async()=>{
 await as(b);await assert.rejects(db.query('select * from public.get_team($1)',[orgA]),/Acesso negado/);
 await assert.rejects(db.query('select public.invite_member($1,$2)',[orgA,'c@example.com']),/administrador/);
 await assert.rejects(db.query('select * from public.get_team_invitations($1)',[orgA]),/administrador/);
 await assert.rejects(db.query('select * from public.invitations'),/permission denied/);
 await as(a);await assert.rejects(db.query('update public.opportunities set assignee_id=$1 where id=$2',[b,opportunityA]),/foreign key/i);
 });
 let invitation;
 await t.test('owner creates a normalized invite and only its verified recipient sees it',async()=>{
 await as(a);invitation=await scalar('select public.invite_member($1,$2)',[orgA,' C@Example.com ']);
 await assert.rejects(db.query('select public.invite_member($1,$2)',[orgA,'c@example.com']),/convite ativo/);
 await as(b);assert.equal((await db.query('select * from public.my_invitations()')).rows.length,0);
 await assert.rejects(db.query('select public.accept_invitation($1)',[invitation]),/indisponível/);
 await as(c);const rows=(await db.query('select * from public.my_invitations()')).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].organization_name,'Empresa A');
 assert.equal(await scalar('select count(*)::int from public.companies'),0);
 });
 await t.test('acceptance unlocks only the invited tenant and cannot be replayed or escalated',async()=>{
 await as(c);assert.equal(await scalar('select public.accept_invitation($1)',[invitation]),orgA);
 assert.equal(await scalar('select count(*)::int from public.companies'),1);
 const team=(await db.query('select * from public.get_team($1)',[orgA])).rows;
 assert.equal(team.find(m=>m.user_id===c).role,'member');
 await assert.rejects(db.query('select public.accept_invitation($1)',[invitation]),/indisponível/);
 await assert.rejects(db.query('select public.invite_member($1,$2)',[orgA,'e@example.com']),/administrador/);
 await assert.rejects(db.query('select * from public.get_team_invitations($1)',[orgA]),/administrador/);
 await assert.rejects(db.query("update public.memberships set role='owner' where user_id=$1",[c]),/permission denied/);
 await assert.rejects(db.query('select * from public.get_team($1)',[orgB]),/Acesso negado/);
 await db.query('update public.opportunities set assignee_id=$1 where id=$2',[c,opportunityA]);
 await db.query('update public.tasks set assignee_id=$1 where opportunity_id=$2',[c,opportunityA]);
 assert.equal(await scalar('select assignee_id from public.opportunities where id=$1',[opportunityA]),c);
 });
 await t.test('unconfirmed accounts cannot see or accept invitations',async()=>{
 await as(a);const id=await scalar('select public.invite_member($1,$2)',[orgA,'unconfirmed@example.com']);
 await as(d);assert.equal((await db.query('select * from public.my_invitations()')).rows.length,0);
 await assert.rejects(db.query('select public.accept_invitation($1)',[id]),/Confirme o e-mail/);
 });
 await t.test('revoked, expired and fabricated invites are rejected',async()=>{
 await as(a);const id=await scalar('select public.invite_member($1,$2)',[orgA,'e@example.com']);
 await as(c);await assert.rejects(db.query('select public.revoke_invitation($1)',[id]),/Acesso negado/);
 await as(a);await db.query('select public.revoke_invitation($1)',[id]);
 await as(e);await assert.rejects(db.query('select public.accept_invitation($1)',[id]),/indisponível/);
 await as(a);const expired=await scalar('select public.invite_member($1,$2)',[orgA,'e@example.com']);
 await db.exec('reset role');await db.query("update public.invitations set expires_at=now()-interval '1 minute' where id=$1",[expired]);
 await as(e);await assert.rejects(db.query('select public.accept_invitation($1)',[expired]),/expirado/);
 await assert.rejects(db.query('select public.accept_invitation($1)',[a]),/inválido/);
 });
 await t.test('anonymous users cannot call team RPCs or read commercial data',async()=>{
 await db.exec('reset role;set role anon');
 await assert.rejects(db.query('select * from public.get_team($1)',[orgA]),/permission denied/);
 await assert.rejects(db.query('select * from public.my_invitations()'),/permission denied/);
 await assert.rejects(db.query('select public.accept_invitation($1)',[invitation]),/permission denied/);
 await assert.rejects(db.query('select * from public.companies'),/permission denied/);
 });
 await db.exec('reset role');
 await db.exec(await readFile(new URL('../supabase/migrations/003_relationship_hub.sql',import.meta.url),'utf8'));
 await t.test('relationship migration preserves original account and contact records',async()=>{
 await as(a);const company=(await db.query('select name,relationship_status,description from public.companies where id=$1',[companyA])).rows[0];
 assert.equal(company.name,'Cliente A');assert.equal(company.relationship_status,'Não avaliado');assert.equal(company.description,'');
 });
 let relationshipEvent,contactA;
 await t.test('contact interaction snapshots its company and creator and permits a follow-up',async()=>{
 await as(a);contactA=await scalar('select id from public.contacts where organization_id=$1',[orgA]);
 relationshipEvent=await scalar("insert into public.relationship_events(organization_id,contact_id,event_type,title,follow_up_date) values($1,$2,'Ligação','Conversa de relacionamento',current_date) returning id",[orgA,contactA]);
 const row=(await db.query('select company_id,created_by from public.relationship_events where id=$1',[relationshipEvent])).rows[0];
 assert.equal(row.company_id,companyA);assert.equal(row.created_by,a);
 await as(c);await db.query('update public.relationship_events set follow_up_done=true where id=$1',[relationshipEvent]);
 assert.equal(await scalar('select follow_up_done from public.relationship_events where id=$1',[relationshipEvent]),true);
 });
 await t.test('history cannot be forged, rewritten, deleted or associated with an outside account',async()=>{
 await as(a);
 await assert.rejects(db.query("insert into public.relationship_events(organization_id,company_id,event_type,title,created_by) values($1,$2,'Nota','Forged',$3)",[orgA,companyA,c]),/row-level security/i);
 await assert.rejects(db.query("update public.relationship_events set description='Rewrite' where id=$1",[relationshipEvent]),/permission denied/i);
 await assert.rejects(db.query('delete from public.relationship_events where id=$1',[relationshipEvent]),/permission denied/i);
 await as(b);
 assert.equal(await scalar('select count(*)::int from public.relationship_events'),0);
 assert.equal((await db.query('update public.relationship_events set follow_up_done=false where id=$1 returning id',[relationshipEvent])).rows.length,0);
 await assert.rejects(db.query("insert into public.relationship_events(organization_id,company_id,event_type,title) values($1,$2,'Nota','Attack')",[orgA,companyA]),/row-level security/i);
 await assert.rejects(db.query("insert into public.relationship_events(organization_id,contact_id,event_type,title) values($1,$2,'Nota','Attack')",[orgB,contactA]),/Contato indisponível/);
 await assert.rejects(db.query("insert into public.relationship_events(organization_id,company_id,event_type,title) values($1,$2,'Nota','Attack')",[orgB,companyA]),/foreign key/i);
 });
 await t.test('historical company stays unchanged when a contact changes company',async()=>{
 await as(a);const nextCompany=await scalar('insert into public.companies(organization_id,name) values($1,$2) returning id',[orgA,'Nova empresa']);
 await db.query('update public.contacts set company_id=$1 where id=$2',[nextCompany,contactA]);
 assert.equal(await scalar('select company_id from public.relationship_events where id=$1',[relationshipEvent]),companyA);
 await assert.rejects(db.query("insert into public.relationship_events(organization_id,company_id,event_type,title,occurred_at) values($1,$2,'Nota','Future',now()+interval '1 day')",[orgA,nextCompany]),/já realizada/);
 });
 await t.test('anonymous users cannot read history or enriched customer data',async()=>{
 await db.exec('reset role;set role anon');
 await assert.rejects(db.query('select * from public.relationship_events'),/permission denied/i);
 await assert.rejects(db.query('select description from public.companies'),/permission denied/i);
 });
 }finally{await db.close();}
});
