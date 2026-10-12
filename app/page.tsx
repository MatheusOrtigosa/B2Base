'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, configured } from '../lib/supabase';
import { criteria, score, leadScore, type Qualification } from '../lib/score';
import TeamPanel from '../components/team-panel';
import IncomingInvitations from '../components/incoming-invitations';
import { assigneeLabel, type TeamMember, type IncomingInvitation } from '../lib/team';

type Row = { id: string; organization_id?: string; name?: string; title?: string; email?: string; industry?: string; website?: string; role?: string; company_id?: string; opportunity_id?: string; value?: number; stage?: string; status?: string; fit?: number; intent?: number; source?: string; close_date?: string; due_date?: string; done?: boolean; owner_name?: string; assignee_id?: string | null; notes?: string; qualification?: Qualification };
type Table = 'companies' | 'contacts' | 'leads' | 'opportunities' | 'tasks';
const tables: Table[] = ['companies', 'contacts', 'leads', 'opportunities', 'tasks'];
const stages = ['Discovery', 'Validação', 'Proposta', 'Negociação', 'Ganha', 'Perdida'];
const nav = [{id:'dashboard',label:'Visão geral',icon:'◈'},{id:'pipeline',label:'Oportunidades',icon:'▦'},{id:'leads',label:'Leads',icon:'◎'},{id:'companies',label:'Empresas',icon:'▤'},{id:'contacts',label:'Contatos',icon:'♧'},{id:'tasks',label:'Próximos passos',icon:'✓'},{id:'team',label:'Equipe',icon:'♧'}];
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
 const [search,setSearch] = useState('');
 const [authMode,setAuthMode] = useState('login');
 const [modal,setModal] = useState<{table:Table;row?:Row;initialOpportunity?:string}|null>(null);
 const [detail,setDetail] = useState<Row|null>(null);
 const [qualification,setQualification] = useState<Qualification>({});
 const [readyOrg,setReadyOrg] = useState('');
 const [members,setMembers]=useState<TeamMember[]>([]);
 const [invitations,setInvitations]=useState<IncomingInvitation[]>([]);
 const [teamEnabled,setTeamEnabled]=useState(false);
 const [orgLoading,setOrgLoading]=useState(true);
 const identity=useRef<string|null>(null);
 const requestVersion=useRef(0);
 useEffect(() => {
  if (!supabase) {setAuthLoading(false);return;}
  supabase.auth.getSession().then(({data,error}) => {identity.current=data.session?.user.id||null;setSession(data.session);if(error)setError(error.message);setAuthLoading(false);});
  const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s) => {const next=s?.user.id||null;if(identity.current!==next){identity.current=next;requestVersion.current++;setOrg('');setOrgs([]);setData(blankData);setReadyOrg('');setDetail(null);setModal(null);setMembers([]);setInvitations([]);setOrgLoading(!!s);}setSession(s);});
  return () => subscription.unsubscribe();
 },[]);
 useEffect(() => {
  if(!session?.user.id || !supabase)return;
  let active=true;setOrgLoading(true);
  supabase.from('organizations').select('*').order('created_at').then(({data,error})=>{if(!active)return;if(error)setError('Não foi possível carregar as empresas. '+error.message);else{setOrgs(data||[]);setOrg(current=>data?.some(o=>o.id===current)?current:data?.[0]?.id||'');}setOrgLoading(false);});
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
  const results=await Promise.all(tables.map(t=>supabase!.from(t).select('*').eq('organization_id',target).order('created_at',{ascending:false})));
  if(version!==requestVersion.current)return;
  const team=await supabase.rpc('get_team',{org_id:target});
  if(version!==requestVersion.current)return;
  setTeamEnabled(!team.error);setMembers(team.error?[]:team.data||[]);
  const failure=results.find(r=>r.error);
  if(failure)setError(failure.error!.message);
  else{setData(Object.fromEntries(tables.map((t,i)=>[t,results[i].data||[]])) as Record<Table,Row[]>);setReadyOrg(target);}
  setLoading(false);
 }
 useEffect(()=>{requestVersion.current++;setData(blankData);setMembers([]);setDetail(null);setModal(null);void reload(org);},[org]); // eslint-disable-line
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
  for(const [k,v] of f.entries())payload[k]=['value','fit','intent'].includes(k)?Number(v):['company_id','opportunity_id','close_date','due_date','assignee_id'].includes(k)?(v||null):String(v).trim();
  if(teamEnabled&&['opportunities','tasks'].includes(modal.table)&&payload.assignee_id)payload.owner_name='';
  const result=modal.row?await supabase.from(modal.table).update(payload).eq('id',modal.row.id).eq('organization_id',org):await supabase.from(modal.table).insert(payload);
  if(result.error)setError(result.error.message);else{setModal(null);setNotice('Registro salvo.');await reload();}setBusy(false);
 }
 async function taskDone(row:Row) {
  if(!supabase)return;setBusy(true);const {error}=await supabase.from('tasks').update({done:!row.done}).eq('id',row.id).eq('organization_id',org);if(error)setError(error.message);else await reload();setBusy(false);
 }
 async function saveQualification() {
  if(!supabase||!detail)return;setBusy(true);setError('');
  const {error}=await supabase.from('opportunities').update({qualification}).eq('id',detail.id).eq('organization_id',org);
  if(error)setError(error.message);else{setDetail({...detail,qualification});setNotice('Qualificação atualizada.');await reload();}setBusy(false);
 }
 const open=data.opportunities.filter(r=>!['Ganha','Perdida'].includes(r.stage||''));
 const activeTasks=data.tasks.filter(r=>!r.done);
 const risks=open.filter(r=>score(r.qualification)<50);
 const companyName=(id?:string)=>data.companies.find(c=>c.id===id)?.name||'Empresa não vinculada';
 const filtered=(rows:Row[])=>rows.filter(r=>([r.name,r.title,r.email,companyName(r.company_id)].join(' ')).toLowerCase().includes(search.toLowerCase()));
 const openDetail=(r:Row)=>{setDetail(r);setQualification(structuredClone(r.qualification||{}));};
 const banners=<>{error&&<div className="alert error" role="alert">{error}<button aria-label="Fechar erro" onClick={()=>setError('')}>×</button></div>}{notice&&<div className="alert" role="status">{notice}<button aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button></div>}</>;
 if(authLoading||(session&&orgLoading))return <main className="center">Carregando B2Base…</main>;
 if(!configured)return <main className="center"><div className="auth"><Brand/><h1>Vamos conectar sua base.</h1><p>Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel e publique novamente.</p></div></main>;
 if(!session)return <main className="login"><section className="pitch"><Brand/><div><span className="eyebrow">SEU PRÓXIMO NEGÓCIO COMEÇA AQUI</span><h1>Mais clareza.<br/>Melhores conversas.<br/><em>Vendas com direção.</em></h1><p>Qualifique oportunidades, enxergue os riscos e transforme estratégia em próximos passos.</p></div><span className="footnote">B2Base · CRM para equipes B2B</span></section><section className="login-form"><form onSubmit={auth} className="auth"><span className="eyebrow">BEM-VINDO À SUA BASE</span><h2>{authMode==='signup'?'Crie sua conta':authMode==='reset'?'Recupere o acesso':'Bom te ver por aqui.'}</h2><p>Organize seu pipeline e concentre energia no que pode avançar.</p>{banners}<label>E-mail<input name="email" type="email" autoComplete="email" required/></label>{authMode!=='reset'&&<label>Senha<input name="password" type="password" minLength={8} autoComplete={authMode==='signup'?'new-password':'current-password'} required/></label>}<button className="primary" disabled={busy}>{busy?'Aguarde…':authMode==='signup'?'Criar conta':authMode==='reset'?'Enviar recuperação':'Entrar na B2Base →'}</button><button type="button" className="text-button" onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Primeiro acesso? Crie uma conta':'Já tenho uma conta'}</button>{authMode==='login'&&<button type="button" className="text-button" onClick={()=>setAuthMode('reset')}>Esqueci minha senha</button>}</form></section></main>;
 if(!org)return <main className="center"><div className="onboarding">{banners}<IncomingInvitations invitations={invitations} busy={busy} onAccept={acceptInvitation} onRefresh={loadInvitations}/><form className="auth" onSubmit={createOrg}><Brand/><h2>Crie sua base de vendas.</h2><p>Se você recebeu um convite, aceite-o acima. Para começar uma empresa nova, preencha o nome abaixo.</p><label>Nome da sua empresa<input name="name" required maxLength={120}/></label><button className="primary" disabled={busy}>Criar espaço de trabalho</button><button type="button" className="text-button" onClick={()=>supabase!.auth.signOut()}>Sair</button></form></div></main>;
 const activeNav=nav.find(n=>n.id===tab)!;
 return <div className="shell"><aside><Brand/><span className="workspace-label">ESPAÇO DE TRABALHO</span><select aria-label="Empresa ativa" value={org} onChange={e=>setOrg(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><nav>{nav.map(n=><button key={n.id} className={tab===n.id?'selected':''} onClick={()=>{setTab(n.id);setSearch('');}}><span>{n.icon}</span>{n.label}{n.id==='tasks'&&<small>{activeTasks.length}</small>}</button>)}</nav><div className="sidebar-bottom"><span>{session.user.email}</span><button onClick={()=>supabase!.auth.signOut()}>Sair da conta ↗</button><small>B2Base · MVP 0.2</small></div></aside><main className="content"><header><span>Seu workspace <b>/ {activeNav.label}</b></span><div className="header-actions"><select className="mobile-org" aria-label="Empresa ativa no celular" value={org} onChange={e=>setOrg(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select><span className="avatar">{session.user.email?.slice(0,2).toUpperCase()}</span><button className="text-button mobile-signout" onClick={()=>supabase!.auth.signOut()}>Sair</button></div></header><div className="page-heading"><div><span className="eyebrow">VENDAS COM DIREÇÃO</span><h1>{activeNav.label}</h1><p>{tab==='dashboard'?'Um olhar para o que importa. Um próximo passo para cada negócio.':'Mantenha o contexto e faça cada conversa avançar.'}</p></div>{tab!=='team'&&<button className="primary" disabled={loading||readyOrg!==org} onClick={()=>setModal({table:tab==='dashboard'||tab==='pipeline'?'opportunities':tab as Table})}>＋ {tab==='dashboard'||tab==='pipeline'?'Nova oportunidade':tab==='tasks'?'Nova tarefa':'Novo registro'}</button>}</div>{banners}{invitations.length>0&&<IncomingInvitations invitations={invitations} busy={busy} onAccept={acceptInvitation} onRefresh={loadInvitations}/>}{loading?<div className="empty">Atualizando sua base…</div>:<>
 {tab==='team'&&<TeamPanel orgId={org} userId={session.user.id} members={members} enabled={teamEnabled} onRefresh={async()=>{await Promise.all([reload(),loadInvitations()]);}}/>}
 {tab==='dashboard'&&<><div className="metrics"><Metric label="PIPELINE ABERTO" value={money(open.reduce((a,r)=>a+Number(r.value),0))} text={`${open.length} oportunidades em andamento`}/><Metric label="SAÚDE MÉDIA" value={`${open.length?Math.round(open.reduce((a,r)=>a+score(r.qualification),0)/open.length):0}/100`} text="Qualificação com evidências"/><Metric label="PRECISAM DE ATENÇÃO" value={String(risks.length)} text="Oportunidades com score abaixo de 50"/><Metric label="PRÓXIMOS PASSOS" value={String(activeTasks.length)} text={`${activeTasks.filter(t=>t.due_date&&t.due_date<today()).length} tarefas atrasadas`}/></div><div className="dashboard-grid"><section className="panel"><div className="section-heading"><h2>Priorize as próximas conversas</h2><button className="text-button" onClick={()=>setTab('pipeline')}>Ver funil →</button></div>{open.length?open.slice().sort((a,b)=>score(a.qualification)-score(b.qualification)).slice(0,5).map(r=><button className="deal-row" key={r.id} onClick={()=>openDetail(r)}><div><b>{r.name}</b><small>{companyName(r.company_id)} · {r.stage} · {assigneeLabel(r,members)}</small></div><ScoreBadge value={score(r.qualification)}/><strong>{money(Number(r.value))}</strong></button>):<Empty text="Seu pipeline começa com a primeira oportunidade."/>}</section><section className="panel"><h2>Seu plano de ação</h2>{activeTasks.length?activeTasks.slice(0,5).map(r=><div className="task-row" key={r.id}><input aria-label={`Concluir ${r.title}`} type="checkbox" disabled={busy} onChange={()=>taskDone(r)}/><div><b>{r.title}</b><small>{date(r.due_date)} · {assigneeLabel(r,members)}</small></div></div>):<Empty text="Crie tarefas com prazo e responsável para avançar as vendas."/>}</section></div><div className="note"><b>O score orienta a conversa.</b> Ele mede a qualificação registrada e não representa probabilidade de fechamento.</div></>}
 {tab==='pipeline'&&<><Search value={search} set={setSearch}/><div className="pipeline">{stages.map(stage=><section className="stage" key={stage}><div className="stage-title"><b>{stage}</b><span>{data.opportunities.filter(r=>r.stage===stage).length}</span></div><small>{money(data.opportunities.filter(r=>r.stage===stage).reduce((a,r)=>a+Number(r.value),0))}</small>{filtered(data.opportunities).filter(r=>r.stage===stage).map(r=><button className="deal-card" key={r.id} onClick={()=>openDetail(r)}><small>{companyName(r.company_id)}</small><h3>{r.name}</h3><strong>{money(Number(r.value))}</strong><small className="card-assignee">{assigneeLabel(r,members)}</small><div className="card-bottom"><ScoreBadge value={score(r.qualification)}/><small>{date(r.close_date)}</small></div></button>)}<button className="add-card" disabled={readyOrg!==org} onClick={()=>setModal({table:'opportunities'})}>＋ Adicionar</button></section>)}</div></>}
 {['companies','contacts','leads','tasks'].includes(tab)&&<><Search value={search} set={setSearch}/><section className="panel records">{filtered(data[tab as Table]).length?filtered(data[tab as Table]).map(r=><div className="record" key={r.id}>{tab==='tasks'&&<input type="checkbox" aria-label={`Concluir ${r.title}`} checked={!!r.done} disabled={busy} onChange={()=>taskDone(r)}/>}<div><b className={r.done?'done':''}>{r.name||r.title}</b><small>{tab==='companies'?`${r.industry||'Sem segmento'} · ${r.website||'Sem site'}`:tab==='contacts'?`${companyName(r.company_id)} · ${r.role} · ${r.email||'Sem e-mail'}`:tab==='leads'?`${r.status} · ${r.source||'Sem origem'} · ${r.email||'Sem e-mail'}`:`${date(r.due_date)} · ${assigneeLabel(r,members)} · ${data.opportunities.find(o=>o.id===r.opportunity_id)?.name||'Sem oportunidade'}`}</small></div>{tab==='leads'&&<ScoreBadge value={leadScore(r.fit||0,r.intent||0)}/>}<button className="secondary" onClick={()=>setModal({table:tab as Table,row:r})}>Editar</button></div>):<Empty text={search?'Nenhum registro encontrado.':'Sua base ainda está vazia. Adicione o primeiro registro.'}/>}</section>{tab==='leads'&&<p className="muted">Score do lead = 60% aderência + 40% intenção. Avaliação manual de 0 a 100.</p>}</>}
 </>}</main>
 {modal&&<div className="overlay"><section className="dialog" role="dialog" aria-modal="true" aria-label="Editar registro"><div className="section-heading"><h2>{modal.row?'Editar':'Adicionar'} registro</h2><button className="icon-button" aria-label="Fechar" onClick={()=>setModal(null)}>×</button></div><form onSubmit={save}>{error&&<p className="error">{error}</p>}<Field label={modal.table==='tasks'?'Tarefa':'Nome'} name={modal.table==='tasks'?'title':'name'} value={modal.row?.name||modal.row?.title} required/>{modal.table==='companies'&&<><Field label="Segmento" name="industry" value={modal.row?.industry}/><Field label="Site" name="website" value={modal.row?.website}/></>}{['contacts','leads'].includes(modal.table)&&<Field label="E-mail" name="email" type="email" value={modal.row?.email}/>}{['contacts','opportunities'].includes(modal.table)&&<label>Empresa<select name="company_id" defaultValue={modal.row?.company_id||''}><option value="">Sem vínculo</option>{data.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}{modal.table==='contacts'&&<label>Papel na compra<select name="role" defaultValue={modal.row?.role||'Contato'}>{['Contato','Decisor','Influenciador','Apoiador','Bloqueador'].map(s=><option key={s}>{s}</option>)}</select></label>}{modal.table==='leads'&&<><Field label="Origem" name="source" value={modal.row?.source}/><div className="two"><Field label="Aderência (0–100)" name="fit" type="number" value={modal.row?.fit||0} min="0" max="100"/><Field label="Intenção (0–100)" name="intent" type="number" value={modal.row?.intent||0} min="0" max="100"/></div><label>Status<select name="status" defaultValue={modal.row?.status||'Novo'}>{['Novo','Em contato','Qualificado','Descartado'].map(s=><option key={s}>{s}</option>)}</select></label></>}{modal.table==='opportunities'&&<><div className="two"><Field label="Valor (R$)" name="value" type="number" min="0" step="0.01" value={modal.row?.value||0}/><Field label="Previsão de fechamento" name="close_date" type="date" value={modal.row?.close_date}/></div><label>Etapa<select name="stage" defaultValue={modal.row?.stage||'Discovery'}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><label>Discovery e contexto<textarea name="notes" defaultValue={modal.row?.notes}/></label></>}{['opportunities','tasks'].includes(modal.table)&&(teamEnabled?<label>Responsável<select name="assignee_id" defaultValue={modal.row?.assignee_id||''}><option value="">Sem responsável vinculado</option>{members.map(m=><option key={m.user_id} value={m.user_id}>{m.email}{m.user_id===session.user.id?' (Você)':''}</option>)}</select>{modal.row?.owner_name&&!modal.row.assignee_id&&<small>Responsável anterior: {modal.row.owner_name}. Escolha um membro para vincular.</small>}</label>:<Field label="Responsável" name="owner_name" value={modal.row?.owner_name}/>)} {modal.table==='tasks'&&<><Field label="Prazo" name="due_date" type="date" value={modal.row?.due_date}/><label>Oportunidade<select name="opportunity_id" defaultValue={modal.row?.opportunity_id||modal.initialOpportunity||''}><option value="">Sem vínculo</option>{data.opportunities.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label></>}<button className="primary" disabled={busy}>{busy?'Salvando…':'Salvar registro'}</button></form></section></div>}
 {detail&&!modal&&<div className="overlay"><section className="dialog wide" role="dialog" aria-modal="true" aria-label="Qualificação da oportunidade"><div className="section-heading"><div><span className="eyebrow">QUALIFICAÇÃO DA OPORTUNIDADE</span><h2>{detail.name}</h2><p>{companyName(detail.company_id)} · {detail.stage} · {money(Number(detail.value))}</p></div><button className="icon-button" aria-label="Fechar" onClick={()=>setDetail(null)}>×</button></div>{error&&<p className="error">{error}</p>}<div className="score-summary"><ScoreBadge value={score(qualification)}/><p>Confirme cada critério e registre uma evidência. Informações desconhecidas não recebem pontos.</p></div>{criteria.map(c=><div className="criterion" key={c.key}><label className="check-label"><input type="checkbox" checked={!!qualification[c.key]?.confirmed} onChange={e=>setQualification({...qualification,[c.key]:{evidence:qualification[c.key]?.evidence||'',confirmed:e.target.checked}})}/>{c.label}<small>+{c.weight}</small></label><input aria-label={`Evidência: ${c.label}`} placeholder="O que o cliente confirmou? Quando e com quem?" value={qualification[c.key]?.evidence||''} onChange={e=>setQualification({...qualification,[c.key]:{confirmed:!!qualification[c.key]?.confirmed,evidence:e.target.value}})}/></div>)}<div className="note">Lacunas: {criteria.filter(c=>!qualification[c.key]?.confirmed||!qualification[c.key]?.evidence?.trim()).map(c=>c.label).join('; ')||'Todos os critérios têm evidência registrada.'}</div><p><b>Responsável:</b> {assigneeLabel(detail,members)}</p><h3>Discovery e contexto</h3><p className="prewrap">{detail.notes||'Ainda não há anotações.'}</p><h3>Pessoas da conta</h3>{data.contacts.filter(c=>c.company_id===detail.company_id&&detail.company_id).map(c=><p key={c.id}>{c.name} · {c.role}</p>)}<h3>Próximos passos</h3>{data.tasks.filter(t=>t.opportunity_id===detail.id).map(t=><p key={t.id}>{t.done?'✓':'○'} {t.title} · {date(t.due_date)}</p>)}<div className="actions"><button className="primary" disabled={busy} onClick={saveQualification}>Salvar qualificação</button><button className="secondary" onClick={()=>{setModal({table:'opportunities',row:detail});setDetail(null);}}>Editar oportunidade</button><button className="secondary" onClick={()=>{setModal({table:'tasks',initialOpportunity:detail.id});setDetail(null);}}>Criar tarefa</button></div></section></div>}
 </div>;
}
function Brand(){return <div className="brand"><span className="brand-symbol">B²</span><b>B2Base<span>.</span></b></div>;}
function Metric({label,value,text}:{label:string;value:string;text:string}){return <section className="metric"><span>{label}</span><strong>{value}</strong><small>{text}</small></section>;}
function ScoreBadge({value}:{value:number}){return <span className={`badge ${value>=75?'good':value>=50?'medium':'low'}`}>{value}/100</span>;}
function Empty({text}:{text:string}){return <div className="empty"><span>◎</span><p>{text}</p></div>;}
function Search({value,set}:{value:string;set:(v:string)=>void}){return <input className="search" aria-label="Buscar registros" placeholder="Buscar na sua base…" value={value} onChange={e=>set(e.target.value)}/>;}
function Field({label,name,type='text',value,required=false,min,max,step}:{label:string;name:string;type?:string;value?:string|number;required?:boolean;min?:string;max?:string;step?:string}){return <label>{label}<input name={name} type={type} defaultValue={value??''} required={required} min={min} max={max} step={step}/></label>;}
