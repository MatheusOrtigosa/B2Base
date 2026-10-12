import type {Qualification} from './score.ts';
import type {OpportunityHealth} from './opportunity-health.ts';
import {plural} from './presentation.ts';
import {localDate} from './relationships.ts';
export type ReviewOpportunity={id:string;name?:string;company_id?:string|null;stage?:string;value?:number;assignee_id?:string|null;owner_name?:string;created_at?:string;close_date?:string;qualification?:Qualification;updated_at?:string;stage_changed_at?:string};
export type ReviewTask={id:string;title?:string;opportunity_id?:string;assignee_id?:string|null;owner_name?:string;created_at?:string;due_date?:string;done?:boolean};
export type ReviewFilters={period:'7d'|'30d'|'month'|'quarter'|'custom';start:string;end:string;owner:string;staleDays:number};
export type AttentionItem={row:ReviewOpportunity;reasons:{key:string;label:string;severity:number}[];severity:number;question:string};
export const OPEN_STAGES=['Discovery','Validação','Proposta','Negociação'];
export function dayOf(value?:string){if(!value)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;if(!Number.isFinite(Date.parse(value)))return '';return localDate(new Date(value));}
export function shiftDay(day:string,days:number){return new Date(Date.parse(day+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);}
function validDay(s:string){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
export function defaultFilters(now=new Date()):ReviewFilters{return {period:'30d',start:shiftDay(localDate(now),-29),end:localDate(now),owner:'all',staleDays:14};}
export function rangeFor(f:ReviewFilters,now=new Date()){
 const end=localDate(now);let start=f.start;
 if(f.period==='7d')start=shiftDay(end,-6);
 if(f.period==='30d')start=shiftDay(end,-29);
 if(f.period==='month')start=end.slice(0,7)+'-01';
 if(f.period==='quarter'){const m=Math.floor((Number(end.slice(5,7))-1)/3)*3+1;start=end.slice(0,4)+'-'+String(m).padStart(2,'0')+'-01';}
 return f.period==='custom'?{start:f.start,end:f.end}:{start,end};
}
export function previousRange(f:ReviewFilters,now=new Date()){const r=rangeFor(f,now),days=Math.round((Date.parse(r.end+'T12:00:00Z')-Date.parse(r.start+'T12:00:00Z'))/86400000)+1;return {start:shiftDay(r.start,-days),end:shiftDay(r.start,-1)};}
export function parseReview(params:URLSearchParams,now=new Date()):ReviewFilters{
 const base=defaultFilters(now),period=params.get('period');const start=params.get('from')||'',end=params.get('to')||'';const customValid=validDay(start)&&validDay(end)&&end>=start;
 return {period:['7d','30d','month','quarter','custom'].includes(period||'')?period as ReviewFilters['period']:base.period,start:customValid?start:base.start,end:customValid?end:base.end,owner:params.get('owner')||'all',staleDays:Math.min(365,Math.max(1,Math.floor(Number(params.get('stale'))||14)))};
}
export function writeReview(params:URLSearchParams,f:ReviewFilters){const next=new URLSearchParams(params);next.set('period',f.period);next.set('owner',f.owner);next.set('stale',String(f.staleDays));if(f.period==='custom'){next.set('from',f.start);next.set('to',f.end);}else{next.delete('from');next.delete('to');}return next;}
export function inRange(day:string,r:{start:string;end:string}){return !!day&&day>=r.start&&day<=r.end;}
export function ownerMatches(r:{assignee_id?:string|null},owner:string,userId:string){return owner==='all'||r.assignee_id===(owner==='me'?userId:owner);}
export function scopeOpportunities(rows:ReviewOpportunity[],f:ReviewFilters,userId:string,now=new Date()){
 const range=rangeFor(f,now);return rows.filter(r=>ownerMatches(r,f.owner,userId)&&inRange(dayOf(r.created_at),range));
}
export function scopeTasks(tasks:ReviewTask[],rows:ReviewOpportunity[],f:ReviewFilters,userId:string,now=new Date()){
 const ids=new Set(rows.map(r=>r.id)),range=rangeFor(f,now);
 return tasks.filter(t=>ownerMatches(t,f.owner,userId)&&(t.opportunity_id?ids.has(t.opportunity_id):inRange(dayOf(t.created_at),range)));
}
export function nextTask(o:ReviewOpportunity,tasks:ReviewTask[],now=new Date()){
 const today=localDate(now);return tasks.filter(t=>t.opportunity_id===o.id&&!t.done&&t.due_date&&t.due_date>=today).sort((a,b)=>a.due_date!.localeCompare(b.due_date!))[0];
}
export function conversationQuestion(o:ReviewOpportunity,reasons:{key:string}[]=[]){
 const q=o.qualification||{};
 if(!q.decision?.confirmed||!q.decision.evidence?.trim())return 'Quem decide e quando?';
 if(!q.timing?.confirmed||!q.timing.evidence?.trim())return 'Qual é o evento que define a data de decisão?';
 if(!q.problem?.confirmed||!q.problem.evidence?.trim())return 'Qual problema precisa ser resolvido e qual é o impacto?';
 if(!q.budget?.confirmed||!q.budget.evidence?.trim())return 'Como o investimento será aprovado e por quem?';
 if(reasons.some(r=>r.key==='no-next'))return 'Qual próximo passo podemos combinar com responsável e prazo?';
 if(reasons.some(r=>r.key==='overdue-close'))return 'O que mudou no prazo e qual é a nova data realista?';
 return 'O que precisa acontecer para este negócio avançar?';
}
export function attention(o:ReviewOpportunity,tasks:ReviewTask[],h:OpportunityHealth,days:number,now=new Date()):AttentionItem{
 const today=localDate(now),reasons:AttentionItem['reasons']=[];
 if(!nextTask(o,tasks,now))reasons.push({key:'no-next',label:'Sem próximo passo futuro',severity:2});
 if(o.close_date&&o.close_date<today)reasons.push({key:'overdue-close',label:'Fechamento vencido',severity:3});
 const changed=o.stage_changed_at||o.updated_at;
 if(changed){const elapsed=Math.floor((now.getTime()-Date.parse(changed))/86400000);if(elapsed>days)reasons.push({key:'stale',label:o.stage_changed_at?`Parado há ${plural(elapsed,'dia')} na etapa`:`Sem atualização há ${plural(elapsed,'dia')}`,severity:2});}
 if(h.value<50)reasons.push({key:'low-score',label:'Score abaixo de 50',severity:1});
 if(h.coverage<50)reasons.push({key:'context',label:'Pouco contexto registrado',severity:1});
 return {row:o,reasons,severity:reasons.reduce((n,r)=>n+r.severity,0),question:conversationQuestion(o,reasons)};
}
export function compare(current:number,previous:number){if(previous===0)return {percent:null,text:current===0?'Sem variação':'Sem base anterior'};const p=(current-previous)/previous*100;return {percent:p,text:`${p>0?'↑':p<0?'↓':'→'} ${Math.abs(p).toFixed(0)}% vs safra anterior`};}
export function aggregateReview(rows:ReviewOpportunity[],tasks:ReviewTask[],f:ReviewFilters,userId:string,healthFor:(r:ReviewOpportunity)=>OpportunityHealth,now=new Date()){
 const selected=scopeOpportunities(rows,f,userId,now),open=selected.filter(r=>OPEN_STAGES.includes(r.stage||'')),actions=scopeTasks(tasks,selected,f,userId,now).filter(t=>!t.done);
 const risks=open.map(o=>attention(o,tasks,healthFor(o),f.staleDays,now)).filter(i=>i.reasons.length).sort((a,b)=>b.severity-a.severity||Number(b.row.value)-Number(a.row.value));
 const value=open.reduce((n,r)=>n+Number(r.value||0),0),top3=open.slice().sort((a,b)=>Number(b.value)-Number(a.value)).slice(0,3).reduce((n,r)=>n+Number(r.value||0),0);
 const stages=OPEN_STAGES.map(stage=>{const deals=open.filter(r=>r.stage===stage);return {stage,rows:deals,count:deals.length,value:deals.reduce((n,r)=>n+Number(r.value||0),0)};});
 const months=new Map<string,{month:string;value:number;overdue:number;rows:ReviewOpportunity[]}>();const today=localDate(now);
 for(const row of open){const key=row.close_date?.slice(0,7)||'Sem data';const group=months.get(key)||{month:key,value:0,overdue:0,rows:[]};group.value+=Number(row.value||0);if(row.close_date&&row.close_date<today)group.overdue+=Number(row.value||0);group.rows.push(row);months.set(key,group);}
 const prev=previousRange(f,now),prior=rows.filter(r=>ownerMatches(r,f.owner,userId)&&inRange(dayOf(r.created_at),prev));
 const movement=(list:ReviewOpportunity[],stage?:string)=>{const group=stage?list.filter(r=>r.stage===stage):list;return {count:group.length,value:group.reduce((n,r)=>n+Number(r.value||0),0)};};
 const recent={new:movement(selected),won:movement(selected,'Ganha'),lost:movement(selected,'Perdida')};
 const previous={new:movement(prior),won:movement(prior,'Ganha'),lost:movement(prior,'Perdida')};
 const priorOpen=prior.filter(r=>OPEN_STAGES.includes(r.stage||''));
 const knownStale=risks.filter(i=>i.reasons.some(r=>r.key==='stale'));
 const aging=open.filter(o=>!o.stage_changed_at&&!o.updated_at&&o.created_at&&Math.floor((now.getTime()-Date.parse(o.created_at))/86400000)>f.staleDays);
 return {selected,open,actions,risks,knownStale,aging,value,avg:open.length?Math.round(open.reduce((n,o)=>n+healthFor(o).value,0)/open.length):0,concentration:value?top3/value*100:0,stages,months:[...months.values()].sort((a,b)=>a.month.localeCompare(b.month)),noNext:risks.filter(i=>i.reasons.some(r=>r.key==='no-next')),recent,previous,priorOpenValue:priorOpen.reduce((n,o)=>n+Number(o.value||0),0),priorAvg:priorOpen.length?Math.round(priorOpen.reduce((n,o)=>n+healthFor(o).value,0)/priorOpen.length):0,priorActionCount:scopeTasks(tasks,prior,{...f,period:'custom',start:prev.start,end:prev.end},userId,now).filter(t=>!t.done).length,priorNoNext:priorOpen.filter(o=>!nextTask(o,tasks,now)).length,priorRiskCount:priorOpen.filter(o=>attention(o,tasks,healthFor(o),f.staleDays,now).reasons.length).length};
}
