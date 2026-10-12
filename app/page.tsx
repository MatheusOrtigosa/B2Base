'use client';
import { useEffect, useState, useRef, useMemo, useCallback, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, configured } from '../lib/supabase';
import { type Qualification } from '../lib/score';
import TeamPanel from '../components/team-panel';
import IncomingInvitations from '../components/incoming-invitations';
import { assigneeLabel, type TeamMember, type IncomingInvitation } from '../lib/team';
import RelationshipFields from '../components/relationship-fields';
import RelationshipList from '../components/relationship-list';
import RelationshipDetail, {type EventInput} from '../components/relationship-detail';
import type {RelationshipRecord,RelationshipEvent} from '../lib/relationships';
import {Icon,Brand,Avatar,ScoreBadge,Empty,Search,Skeleton,DetailDialog} from '../components/ui';
import GlobalSearch,{type SearchResult} from '../components/global-search';
import EntityForm,{entityCopy} from '../components/entity-form';
import LoginScreen from '../components/login-screen';
import {Pipeline,Leads,TaskList} from '../components/crm-views';
import CompanyCockpit from '../components/company-cockpit';
import OpportunityDetail from '../components/opportunity-detail';
import {opportunityHealth,type HealthContext} from '../lib/opportunity-health';
import ReviewDashboard from '../components/review-dashboard';
import ReviewFilterBar from '../components/review-filters';
import {defaultFilters,parseReview,writeReview,scopeOpportunities,scopeTasks,type ReviewFilters} from '../lib/review';
import {readAllRows} from '../lib/read-pages';

type Row = RelationshipRecord & { id: string; organization_id?: string; name?: string; title?: string; email?: string; industry?: string; website?: string; role?: string; company_id?: string | null; opportunity_id?: string; value?: number; stage?: string; status?: string; fit?: number; intent?: number; source?: string; close_date?: string; due_date?: string; done?: boolean; owner_name?: string; assignee_id?: string | null; notes?: string; qualification?: Qualification;created_at?:string;seller_feeling?:string;seller_feeling_notes?:string;seller_feeling_updated_at?:string|null };
type Table = 'companies' | 'contacts' | 'leads' | 'opportunities' | 'tasks';
const tables: Table[] = ['companies', 'contacts', 'leads', 'opportunities', 'tasks'];
const stages = ['Discovery', 'Validação', 'Proposta', 'Negociação', 'Ganha', 'Perdida'];
const nav = [{id:'dashboard',label:'Visão geral',icon:'◈'},{id:'pipeline',label:'Oportunidades',icon:'▦'},{id:'leads',label:'Leads',icon:'◎'},{id:'cockpit',label:'Cockpit de contas',icon:'◈'},{id:'companies',label:'Empresas',icon:'▤'},{id:'contacts',label:'Contatos',icon:'♧'},{id:'tasks',label:'Próximos passos',icon:'✓'},{id:'team',label:'Equipe',icon:'♧'}];
const money = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(v);
const date = (s?: string) => s ? s.split('-').reverse().join('/') : 'Sem prazo';
const today = () => new Date().toLocaleDateString('en-CA', {timeZone:'America/Sao_Paulo'});
const blankData: Record<Table,Row[]> = {companies:[],contacts:[],leads:[],opportunities:[],tasks:[]};

export default function Home() {
 const [session,setSession] = useState<Session|null>(null);
 const [authLoading,setAuthLoading] = useState(true);
 const [orgs,setOrgs] = useState<Row[]>([]);
 const [org,setOrg] = useState('');
 const [data,setData] = useState(blankData);
 const [loading,setLoading] = useState(false);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState('');
 const [notice,setNotice] = useState('');
 const [tab,setTab] = useState('dashboard');
 const [reviewFilters,setReviewFilters]=useState<ReviewFilters>(()=>defaultFilters());
 const [urlReady,setUrlReady]=useState(false);
 const [pipelineStage,setPipelineStage]=useState('all');
 useEffect(()=>{const read=()=>{const p=new URLSearchParams(window.location.search);setReviewFilters(parseReview(p));const view=p.get('view');if(['dashboard','pipeline','tasks','leads','companies','contacts','cockpit','team'].includes(view||''))setTab(view!);setPipelineStage(['Discovery','Validação','Proposta','Negociação','Ganha','Perdida'].includes(p.get('stage')||'')?p.get('stage')!:'all');};read();setUrlReady(true);window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);},[]);
 useEffect(()=>{if(!urlReady)return;const p=writeReview(new URLSearchParams(window.location.search),reviewFilters);p.set('view',tab);if(org)p.set('workspace',org);if(tab==='pipeline'&&pipelineStage!=='all')p.set('stage',pipelineStage);else p.delete('stage');window.history.replaceState(null,'',window.location.pathname+'?'+p.toString()+window.location.hash);},[reviewFilters,tab,pipelineStage,urlReady,org]);
 const [search,setSearch] = useState('');
 const [commandOpen,setCommandOpen]=useState(false);
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const [density,setDensity]=useState('comfortable');
 useEffect(()=>{function shortcut(e:KeyboardEvent){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCommandOpen(v=>!v);}}window.addEventListener('keydown',shortcut);return()=>window.removeEventListener('keydown',shortcut);},[]);
 const [authMode,setAuthMode] = useState('login');
 const [modal,setModal] = useState<{table:Table;row?:Row;initialOpportunity?:string;initialStage?:string;initialCompany?:string}|null>(null);
 const [detail,setDetail] = useState<Row|null>(null);
 const [qualification,setQualification] = useState<Qualification>({});
 const [readyOrg,setReadyOrg] = useState('');
 const [cockpitCompany,setCockpitCompany]=useState('');
 const [cockpitEnabled,setCockpitEnabled]=useState(false);
 const [relationshipDetail,setRelationshipDetail]=useState<{kind:'companies'|'contacts';id:string}|null>(null);
 const [events,setEvents]=useState<RelationshipEvent[]>([]);
 const [relationshipsEnabled,setRelationshipsEnabled]=useState(false);
 const [eventsError,setEventsError]=useState('');
 const [members,setMembers]=useState<TeamMember[]>([]);
 const [invitations,setInvitations]=useState<IncomingInvitation[]>([]);
 const [teamEnabled,setTeamEnabled]=useState(false);
 const [orgLoading,setOrgLoading]=useState(true);
 const identity=useRef<string|null>(null);
 const requestVersion=useRef(0);
 useEffect(() => {
  if (!supabase) {setAuthLoading(false);return;}
  supabase.auth.getSession().then(({data,error}) => {identity.current=data.session?.user.id||null;setSession(data.session);if(error)setError(error.message);setAuthLoading(false);});
  const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => {const next=s?.user.id||null;if(identity.current!==next){identity.current=next;requestVersion.current++;setOrg('');setOrgs([]);setData(blankData);setReadyOrg('');setDetail(null);setModal(null);setMembers([]);setInvitations([]);setEvents([]);setRelationshipDetail(null);setOrgLoading(!!s);}setSession(s);});
  return () => subscription.unsubscribe();
 },[]);
 useEffect(() => {
  if(!session?.user.id || !supabase)return;
  let active=true;setOrgLoading(true);
  supabase.from('organizations').select('*').order('created_at').then(({data,error})=>{if(!active)return;if(error)setError('Não foi possível carregar as empresas. '+error.message);else{setOrgs(data||[]);setOrg(current=>{const requested=new URLSearchParams(window.location.search).get('workspace');return data?.some(o=>o.id===current)?current:data?.some(o=>o.id===requested)?requested!:data?.[0]?.id||'';});}setOrgLoading(false);});
  void loadInvitations();
  return()=>{active=false;};
 },[session?.user.id]);
 async function loadInvitations(){
  if(!supabase)return;
  const {data,error}=await supabase.rpc('my_invitations');
  if(!error)setInvitations(data||[]);
 }
 async function acceptInvitation(id:string){
  if(!supabase)return;setBusy(true);setError('');
  const {data:target,error}=await supabase.rpc('accept_invitation',{invitation_id:id});
  if(error)setError(error.message);
  else{
   const {data:organizations,error:orgError}=await supabase.from('organizations').select('*').order('created_at');
   if(orgError)setError(orgError.message);else{setOrgs(organizations||[]);setOrg(target);setNotice('Convite aceito. Bem-vindo à equipe!');}
   await loadInvitations();
  }
  setBusy(false);
 }
 async function reload(target=org) {
  if(!supabase||!target)return;
  const version=++requestVersion.current;
  setLoading(true);setReadyOrg('');
  const results=await Promise.all(tables.map(t=>readAllRows(supabase!,t,target,()=>version===requestVersion.current)));
  if(version!==requestVersion.current)return;
  const [team,history,hierarchyProbe]=await Promise.all([supabase.rpc('get_team',{org_id:target}),readAllRows(supabase,'relationship_events',target,()=>version===requestVersion.current),supabase.from('contacts').select('reports_to_id').limit(1)]);
  if(version!==requestVersion.current)return;
  const schemaMissing=history.error&&['PGRST205','42P01'].includes(('code' in history.error?history.error.code:''));
  setCockpitEnabled(!hierarchyProbe.error);
  setRelationshipsEnabled(!history.error);setEvents(history.error?[]:(history.data||[]) as unknown as RelationshipEvent[]);
  setEventsError(history.error&&!schemaMissing?'Não foi possível carregar o histórico. '+history.error.message:'');
  setTeamEnabled(!team.error);setMembers(team.error?[]:team.data||[]);
  const failure=results.find(r=>r.error);
  if(failure)setError(failure.error!.message);
  else{setData(Object.fromEntries(tables.map((t,i)=>[t,results[i].data||[]])) as Record<Table,Row[]>);setReadyOrg(target);}
  setLoading(false);
 }
 useEffect(()=>{requestVersion.current++;setData(blankData);setMembers([]);setEvents([]);setEventsError('');setCockpitCompany('');setRelationshipDetail(null);setDetail(null);setModal(null);void reload(org);},[org]); // eslint-disable-line
 async function auth(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(!supabase)return;setBusy(true);setError('');setNotice('');
  const f=new FormData(e.currentTarget);const email=String(f.get('email'));const password=String(f.get('password'));
  const result=authMode==='signup'?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}}):authMode==='reset'?await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/reset-password'}):await supabase.auth.signInWithPassword({email,password});
  if(result.error)setError(result.error.message);else if(authMode!=='login')setNotice(authMode==='reset'?'Confira seu e-mail para redefinir a senha.':'Cadastro solicitado. Confira seu e-mail para confirmar a conta antes de entrar.');setBusy(false);
 }
 async function createOrg(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(!supabase)return;setBusy(true);setError('');
  const name=String(new FormData(e.currentTarget).get('name')).trim();
  const {data:id,error}=await supabase.rpc('create_organization',{org_name:name});
  if(error)setError(error.message);else{setOrgs([{id,name}]);setOrg(id);}setBusy(false);
 }
 async function save(e:FormEvent<HTMLFormElement>) {
  e.preventDefault();if(!supabase||!modal||readyOrg!==org)return;setBusy(true);setError('');
  const f=new FormData(e.currentTarget);const payload:Record<string,unknown>={organization_id:org};
  for(const [k,v] of f.entries())payload[k]=['value','fit','intent'].includes(k)?Number(v):['company_id','opportunity_id','close_date','due_date','assignee_id','reports_to_id'].includes(k)?(v||null):String(v).trim();
  if(teamEnabled&&['opportunities','tasks'].includes(modal.table)&&payload.assignee_id)payload.owner_name='';
  const result=modal.row?await supabase.from(modal.table).update(payload).eq('id',modal.row.id).eq('organization_id',org):await supabase.from(modal.table).insert(payload);
  if(result.error)setError(result.error.message);else{setModal(null);setNotice(entityCopy[modal.table].singular+(modal.row?' atualizado.':' criado.'));await reload();}setBusy(false);
 }
 async function taskDone(row:Row) {
  if(!supabase)return;setBusy(true);const {error}=await supabase.from('tasks').update({done:!row.done}).eq('id',row.id).eq('organization_id',org);if(error)setError(error.message);else await reload();setBusy(false);
 }
 async function saveQualification(feeling:string,feelingNotes:string) {
  if(!supabase||!detail||busy)return;setBusy(true);setError('');
  const payload:Record<string,unknown>={qualification};
  if(cockpitEnabled){payload.seller_feeling=feeling;payload.seller_feeling_notes=feelingNotes.trim();}
  const {data:updated,error}=await supabase.from('opportunities').update(payload).eq('id',detail.id).eq('organization_id',org).select('*').single();
  if(error)setError(error.message);else{setDetail(updated);setQualification(updated.qualification||{});setNotice('Avaliação e evidências atualizadas.');await reload();}setBusy(false);
 }
 async function saveEvent(input:EventInput):Promise<boolean>{
  if(!supabase||!relationshipDetail||!relationshipsEnabled)return false;
  setBusy(true);setEventsError('');
  try{
   const payload={...input,organization_id:org,company_id:relationshipDetail.kind==='companies'?relationshipDetail.id:null,contact_id:relationshipDetail.kind==='contacts'?relationshipDetail.id:null};
   const {error}=await supabase.from('relationship_events').insert(payload);
   if(error){setEventsError(error.message);return false;}
   await reload();return true;
  }catch{setEventsError('Não foi possível salvar a interação. Tente novamente.');return false;}
  finally{setBusy(false);}
 }
 async function updateFollowUp(event:RelationshipEvent){
  if(!supabase)return;setBusy(true);setEventsError('');
  try{
   const {error}=await supabase.from('relationship_events').update({follow_up_done:!event.follow_up_done}).eq('id',event.id).eq('organization_id',org);
   if(error)setEventsError(error.message);else await reload();
  }catch{setEventsError('Não foi possível atualizar o próximo passo. Tente novamente.');}
  finally{setBusy(false);}
 }
 const healthContext=useMemo<HealthContext>(()=>({companies:data.companies,contacts:data.contacts,events,tasks:data.tasks,historyAvailable:relationshipsEnabled}),[data.companies,data.contacts,data.tasks,events,relationshipsEnabled]);
 const healthCache=useMemo(()=>new Map<string,ReturnType<typeof opportunityHealth>>(),[healthContext]);
 const healthFor=useCallback((r:Row)=>{let health=healthCache.get(r.id);if(!health){health=opportunityHealth(r,healthContext);healthCache.set(r.id,health);}return health;},[healthContext,healthCache]);
 const reviewRows=useMemo(()=>scopeOpportunities(data.opportunities,reviewFilters,session?.user.id||''),[data.opportunities,reviewFilters,session?.user.id]);
 const reviewTasks=useMemo(()=>scopeTasks(data.tasks,reviewRows,reviewFilters,session?.user.id||''),[data.tasks,reviewRows,reviewFilters,session?.user.id]);
 const selectedRelationship=relationshipDetail?data[relationshipDetail.kind].find(r=>r.id===relationshipDetail.id):null;
 const open=data.opportunities.filter(r=>!['Ganha','Perdida'].includes(r.stage||''));
 const activeTasks=data.tasks.filter(r=>!r.done);
 const companyName=(id?:string|null)=>data.companies.find(c=>c.id===id)?.name||'Empresa não vinculada';
 const filtered=(rows:Row[])=>rows.filter(r=>([r.name,r.title,r.email,r.industry,r.job_title,r.city,r.phone,companyName(r.company_id)].join(' ')).toLowerCase().includes(search.toLowerCase()));
 const openDetail=(r:Row)=>{setDetail(r);setQualification(structuredClone(r.qualification||{}));};
 const banners=<>{error&&<div className="alert error" role="alert">{error}<button aria-label="Fechar erro" onClick={()=>setError('')}>×</button></div>}{notice&&<div className="alert toast" role="status"><Icon name="check"/>{notice}<button aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button></div>}</>;
 if(authLoading||(session&&orgLoading))return <main className="center"><Skeleton/></main>;
 if(!configured)return <main className="center"><div className="auth"><Brand/><h1>Vamos conectar sua base.</h1><p>Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel e publique novamente.</p></div></main>;
 if(!session)return <LoginScreen mode={authMode} setMode={setAuthMode} busy={busy} banners={banners} onSubmit={auth}/>;
 if(!org)return <main className="center"><div className="onboarding">{banners}<IncomingInvitations invitations={invitations} busy={busy} onAccept={acceptInvitation} onRefresh={loadInvitations}/><form className="auth" onSubmit={createOrg}><Brand/><h2>Crie sua base de vendas.</h2><p>Se você recebeu um convite, aceite-o acima. Para começar uma empresa nova, preencha o nome abaixo.</p><label>Nome da sua empresa<input name="name" required maxLength={120}/></label><button className="primary" disabled={busy}>Criar espaço de trabalho</button><button type="button" className="text-button" onClick={()=>supabase!.auth.signOut()}>Sair</button></form></div></main>;
 const activeNav=nav.find(n=>n.id===tab)!;
 const userLabel=String(session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'Minha conta');
 const searchResults:SearchResult[]=tables.flatMap(t=>data[t].map(r=>({id:r.id,kind:t,name:r.name||r.title||'',context:(t==='companies'?'Empresa':t==='contacts'?'Contato':t==='leads'?'Lead':t==='opportunities'?'Oportunidade':'Próximo passo')+(r.company_id?' · '+companyName(r.company_id):'')})));
 function selectSearch(r:SearchResult){if(r.kind==='opportunities'){setTab('pipeline');const found=data.opportunities.find(o=>o.id===r.id);if(found)openDetail(found);}else if(r.kind==='companies'||r.kind==='contacts'){setTab(r.kind);setRelationshipDetail({kind:r.kind,id:r.id});}else{setTab(r.kind);const found=data[r.kind as Table].find(o=>o.id===r.id);if(found)setModal({table:r.kind as Table,row:found});}}
 return <div className={`shell ${sidebarOpen?'sidebar-open':''}`} data-density={density}><aside><Brand/><span className="workspace-label">ESPAÇO DE TRABALHO</span><div className="workspace-select"><Avatar name={orgs.find(o=>o.id===org)?.name||'B2'}/><span>{orgs.find(o=>o.id===org)?.name}</span><Icon name="chevron"/><select aria-label="Empresa ativa" value={org} onChange={e=>setOrg(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div><nav aria-label="Navegação principal">{nav.map(n=><button key={n.id} className={tab===n.id?'selected':''} aria-current={tab===n.id?'page':undefined} onClick={()=>{setTab(n.id);setSearch('');setSidebarOpen(false);}}><Icon name={n.id}/>{n.label}{n.id==='tasks'&&<small>{activeTasks.length}</small>}</button>)}</nav><div className="sidebar-bottom"><div className="sidebar-user"><Avatar name={userLabel}/><div><b>{userLabel}</b><small>{session.user.email}</small></div></div><button className="text-button" onClick={()=>supabase!.auth.signOut()}><Icon name="logout"/>Sair da conta</button><small>MVP 0.5 · Fase A</small></div></aside><main className="content"><header><button className="icon-button mobile-menu" aria-label={sidebarOpen?'Fechar menu':'Abrir menu'} aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(v=>!v)}><Icon name={sidebarOpen?'close':'menu'}/></button><span className="header-breadcrumb">Workspace <b>/ {activeNav.label}</b></span><div className="header-actions"><button className="header-search" onClick={()=>setCommandOpen(true)} aria-label="Busca global (Ctrl ou Command K)"><Icon name="search"/><span>Buscar na base</span><kbd>Ctrl K</kbd></button><button className="text-button density-toggle" onClick={()=>setDensity(d=>d==='comfortable'?'compact':'comfortable')} title="Alternar densidade">{density==='compact'?'Compacta':'Confortável'}</button><select className="mobile-org" aria-label="Empresa ativa no celular" value={org} onChange={e=>setOrg(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><details className="profile-menu" onKeyDown={e=>{if(e.key==='Escape')e.currentTarget.open=false;}}><summary aria-label="Menu da minha conta"><Avatar name={userLabel}/></summary><div className="profile-dropdown"><b>{userLabel}</b><small>{session.user.email}</small><button className="text-button" onClick={()=>supabase!.auth.signOut()}><Icon name="logout"/>Sair da conta</button></div></details></div></header><div className="page-heading"><div><h1>{activeNav.label}</h1><p>{tab==='dashboard'?'Um próximo passo para cada negócio.':'Mantenha o contexto e faça cada conversa avançar.'}</p></div>{tab!=='team'&&<button className="primary" disabled={loading||readyOrg!==org} onClick={()=>setModal({table:tab==='dashboard'||tab==='pipeline'?'opportunities':tab==='cockpit'?'companies':tab as Table})}><Icon name="plus"/> {tab==='dashboard'||tab==='pipeline'?'Nova oportunidade':tab==='tasks'?'Novo próximo passo':tab==='leads'?'Novo lead':tab==='companies'||tab==='cockpit'?'Nova empresa':'Novo contato'}</button>}</div>{banners}{invitations.length>0&&<IncomingInvitations invitations={invitations} busy={busy} onAccept={acceptInvitation} onRefresh={loadInvitations}/>}{loading?<Skeleton review={tab==='dashboard'}/>:<>
 {tab==='team'&&<TeamPanel orgId={org} userId={session.user.id} members={members} enabled={teamEnabled} onRefresh={async()=>{await Promise.all([reload(),loadInvitations()]);}}/>}
 {tab==='dashboard'&&<ReviewDashboard filters={reviewFilters} onFilters={setReviewFilters} userId={session.user.id} onTasks={()=>{setSearch('');setTab('tasks');}} healthFor={healthFor} opportunities={data.opportunities} tasks={data.tasks} companies={data.companies} members={members} busy={busy} onOpen={openDetail} onTask={taskDone} onCreate={type=>setModal({table:type})} onPipeline={(stage)=>{setSearch('');setPipelineStage(stage||'all');setTab('pipeline');}}/>}
 {tab==='pipeline'&&<><ReviewFilterBar filters={reviewFilters} onChange={setReviewFilters} members={members}/><Pipeline stageFilter={pipelineStage} onStageChange={setPipelineStage} healthFor={healthFor} rows={reviewRows} tasks={data.tasks} companies={data.companies} members={members} search={search} setSearch={setSearch} onOpen={openDetail} onCreate={stage=>setModal({table:'opportunities',initialStage:stage})} disabled={readyOrg!==org}/></>}
 {tab==='cockpit'&&<CompanyCockpit companies={data.companies} contacts={data.contacts} opportunities={data.opportunities} events={events} tasks={data.tasks} companyId={cockpitCompany} setCompanyId={setCockpitCompany} enabled={cockpitEnabled} healthFor={healthFor} onCreate={(table,initialCompany)=>setModal({table,initialCompany})} onContact={id=>setRelationshipDetail({kind:'contacts',id})} onEditContact={row=>setModal({table:'contacts',row})} onOpportunity={openDetail} onCompany={id=>setRelationshipDetail({kind:'companies',id})} onEventHistory={id=>setRelationshipDetail({kind:'companies',id})}/>}
 {tab==='leads'&&<Leads rows={data.leads} search={search} setSearch={setSearch} onEdit={row=>setModal({table:'leads',row})} onCreate={()=>setModal({table:'leads'})}/>}
 {['companies','contacts'].includes(tab)&&<><Search value={search} set={setSearch}/>{!relationshipsEnabled&&<p className="alert">{eventsError||'Os cadastros ampliados e o histórico serão habilitados após a atualização do banco com a migração 003.'}</p>}<RelationshipList kind={tab as 'companies'|'contacts'} rows={filtered(data[tab as 'companies'|'contacts'])} companies={data.companies} events={events} onOpen={id=>{setEventsError('');setRelationshipDetail({kind:tab as 'companies'|'contacts',id});}} onEdit={r=>setModal({table:tab as 'companies'|'contacts',row:r})}/></>}
 {tab==='tasks'&&<><ReviewFilterBar filters={reviewFilters} onChange={setReviewFilters} members={members}/><TaskList rows={reviewTasks} opportunities={data.opportunities} companies={data.companies} members={members} search={search} setSearch={setSearch} busy={busy} onTask={taskDone} onEdit={row=>setModal({table:'tasks',row})} onCreate={()=>setModal({table:'tasks'})}/></>}
 </>}</main>
 {modal&&<EntityForm key={modal.table+(modal.row?.id||'new')} entity={modal.table} row={modal.row} initialOpportunity={modal.initialOpportunity} initialStage={modal.initialStage} initialCompany={modal.initialCompany} contacts={data.contacts} hierarchyEnabled={cockpitEnabled} companies={data.companies} opportunities={data.opportunities} members={members} userId={session.user.id} teamEnabled={teamEnabled} relationshipsEnabled={relationshipsEnabled} busy={busy} error={error} onClose={()=>setModal(null)} onSubmit={save}/>}
 {relationshipDetail&&selectedRelationship&&!modal&&<RelationshipDetail key={relationshipDetail.kind+relationshipDetail.id} kind={relationshipDetail.kind} row={selectedRelationship} companies={data.companies} contacts={data.contacts} events={events} members={members} enabled={relationshipsEnabled} eventsError={eventsError} busy={busy} onClose={()=>setRelationshipDetail(null)} onEdit={()=>setModal({table:relationshipDetail.kind,row:selectedRelationship})} onEvent={saveEvent} onFollowUp={updateFollowUp} onRefresh={()=>reload()} onCockpit={()=>{setCockpitCompany(selectedRelationship.id);setRelationshipDetail(null);setTab('cockpit');}} onCreateContact={()=>setModal({table:'contacts',initialCompany:selectedRelationship.id})} onCreateOpportunity={()=>setModal({table:'opportunities',initialCompany:selectedRelationship.id})}/>}
 {detail&&!modal&&<OpportunityDetail key={detail.id} row={detail} qualification={qualification} setQualification={setQualification} context={healthContext} members={members} busy={busy} error={error} enabled={cockpitEnabled} onClose={()=>setDetail(null)} onSave={saveQualification} onEdit={()=>{setModal({table:'opportunities',row:detail});setDetail(null);}} onTask={()=>{setModal({table:'tasks',initialOpportunity:detail.id});setDetail(null);}}/>}
 {commandOpen&&<GlobalSearch results={searchResults} onSelect={selectSearch} onClose={()=>setCommandOpen(false)}/>}
 </div>;
}
