import assert from 'node:assert/strict';
import {test} from 'node:test';
import {aggregateReview,attention,compare,conversationQuestion,dayOf,defaultFilters,nextTask,parseReview,previousRange,rangeFor,scopeOpportunities,scopeTasks,writeReview,type ReviewOpportunity,type ReviewTask} from '../lib/review.ts';
import {opportunityHealth} from '../lib/opportunity-health.ts';
import {money,plural,relativeDue} from '../lib/presentation.ts';
const now=new Date('2026-10-12T12:00:00Z');
const f={...defaultFilters(now),period:'custom' as const,start:'2026-10-01',end:'2026-10-12'};
const health=(row:ReviewOpportunity)=>opportunityHealth(row,{companies:[],contacts:[],events:[],tasks:[],historyAvailable:true},now);
const row=(id:string,patch:Partial<ReviewOpportunity>={}):ReviewOpportunity=>({id,name:id,stage:'Discovery',value:100,assignee_id:'seller-a',created_at:'2026-10-05T12:00:00Z',close_date:'2026-10-20',...patch});
const task=(id:string,patch:Partial<ReviewTask>={}):ReviewTask=>({id,opportunity_id:'a',assignee_id:'seller-a',created_at:'2026-10-05T12:00:00Z',due_date:'2026-10-20',done:false,...patch});
test('calendar windows are inclusive, use Sao Paulo dates and compare equal duration cohorts',()=>{
 assert.equal(dayOf('2026-10-01T01:00:00Z'),'2026-09-30');
 assert.deepEqual(rangeFor({...f,period:'7d'},now),{start:'2026-10-06',end:'2026-10-12'});
 assert.deepEqual(rangeFor({...f,period:'30d'},now),{start:'2026-09-13',end:'2026-10-12'});
 assert.deepEqual(rangeFor({...f,period:'month'},now),{start:'2026-10-01',end:'2026-10-12'});
 assert.deepEqual(rangeFor({...f,period:'quarter'},now),{start:'2026-10-01',end:'2026-10-12'});
 assert.deepEqual(previousRange(f,now),{start:'2026-09-19',end:'2026-09-30'});
});
test('shareable URL preserves unrelated parameters, validates custom dates and restores filters',()=>{
 const expected={...f,owner:'seller-b',staleDays:21};
 const p=writeReview(new URLSearchParams('view=pipeline&stage=Proposta&workspace=org'),expected);
 assert.deepEqual(parseReview(p,now),expected);assert.equal(p.get('stage'),'Proposta');assert.equal(p.get('workspace'),'org');
 assert.equal(writeReview(p,{...expected,period:'7d'}).has('from'),false);
 const invalid=parseReview(new URLSearchParams('period=custom&from=2026-02-30&to=2026-10-01&stale=-1'),now);
 assert.equal(invalid.start,defaultFilters(now).start);assert.equal(invalid.staleDays,1);
 assert.equal(parseReview(new URLSearchParams('stale=999&period=nonsense'),now).staleDays,365);
 assert.equal(parseReview(new URLSearchParams('stale=2.5'),now).staleDays,2);
});
test('dashboard counts, funnel and forecast equal the kanban scope for each owner',()=>{
 const rows=[row('a'),row('b',{assignee_id:'seller-b',stage:'Proposta',value:300}),row('closed',{stage:'Ganha',value:400}),row('outside',{created_at:'2026-09-01T12:00:00Z'}),row('unassigned',{assignee_id:null,stage:'Validação',value:50})];
 for(const owner of ['all','me','seller-b']){
  const filters={...f,owner};const scope=scopeOpportunities(rows,filters,'seller-a',now);const model=aggregateReview(rows,[],filters,'seller-a',health,now);
  assert.deepEqual(model.selected.map(o=>o.id),scope.map(o=>o.id));
  const open=scope.filter(o=>o.stage!=='Ganha');
  assert.equal(model.value,open.reduce((s,o)=>s+Number(o.value),0));
  assert.equal(model.stages.reduce((s,g)=>s+g.count,0),open.length);
  assert.equal(model.months.reduce((s,g)=>s+g.value,0),model.value);
 }
 assert.deepEqual(scopeOpportunities(rows,{...f,owner:'me'},'seller-b',now).map(o=>o.id),['b']);
});
test('forecast sums raw amounts independently of score and shows overdue and undated values',()=>{
 const rows=[row('a',{value:1000,close_date:'2026-10-01'}),row('b',{value:2000,close_date:'2026-10-12'}),row('c',{value:500,close_date:''}),row('won',{value:9000,stage:'Ganha'})];
 const low=aggregateReview(rows,[],f,'seller-a',health,now);const high=aggregateReview(rows,[],f,'seller-a',o=>({...health(o),value:100,coverage:100}),now);
 assert.equal(low.value,3500);assert.equal(high.value,3500);assert.deepEqual(low.months,high.months);
 assert.equal(low.months.find(m=>m.month==='2026-10')?.overdue,1000);assert.equal(low.months.find(m=>m.month==='Sem data')?.value,500);
 assert.ok(low.concentration<=100);assert.equal(low.recent.won.value,9000);
});
test('next step requires a pending linked task with due date today or later',()=>{
 const tasks=[task('done',{done:true}),task('late',{due_date:'2026-10-11'}),task('none',{due_date:''}),task('other',{opportunity_id:'b'}),task('today',{due_date:'2026-10-12'}),task('tomorrow',{due_date:'2026-10-13'})];
 assert.equal(nextTask(row('a'),tasks,now)?.id,'today');assert.equal(nextTask(row('a'),tasks.slice(0,4),now),undefined);
 const all=[...tasks,task('standalone',{opportunity_id:undefined}),task('foreign',{assignee_id:'seller-b',opportunity_id:'a'})];
 assert.equal(scopeTasks(all,[row('a')],{...f,owner:'me'},'seller-a',now).some(t=>t.id==='foreign'),false);
 assert.equal(scopeTasks(all,[row('a')],f,'seller-a',now).some(t=>t.id==='other'),false);
});
test('attention accumulates explanations, sorts severity then amount, never fabricates stage age',()=>{
 const old=row('old',{created_at:'2026-10-01T12:00:00Z',close_date:'2026-10-01',value:100});
 const a=attention(old,[],health(old),14,now);
 assert.deepEqual(a.reasons.map(r=>r.key),['no-next','overdue-close','low-score','context']);
 assert.equal(a.reasons.some(r=>r.key==='stale'),false);
 const real=row('real',{stage_changed_at:'2026-09-01T12:00:00Z'});
 assert.match(attention(real,[],health(real),14,now).reasons.find(r=>r.key==='stale')!.label,/na etapa/);
 const updated=row('updated',{updated_at:'2026-09-01T12:00:00Z'});
 assert.match(attention(updated,[],health(updated),14,now).reasons.find(r=>r.key==='stale')!.label,/Sem atualização/);
 const model=aggregateReview([row('large',{value:10000}),old,row('overdue-large',{value:200,close_date:'2026-10-01'})],[],f,'seller-a',health,now);
 assert.deepEqual(model.risks.map(r=>r.row.id),['overdue-large','old','large']);
});
test('cohort results use current state, not expected close date as an actual winning event',()=>{
 const model=aggregateReview([row('won',{stage:'Ganha',close_date:'2027-01-01'}),row('prior-won',{stage:'Ganha',created_at:'2026-09-25T12:00:00Z',close_date:'2026-10-01'})],[],f,'seller-a',health,now);
 assert.equal(model.recent.won.count,1);assert.equal(model.previous.won.count,1);assert.equal(model.value,0);
 assert.equal(compare(5,0).percent,null);assert.equal(compare(0,0).text,'Sem variação');assert.equal(compare(5,10).percent,-50);
});
test('deterministic conversation questions require evidence and prioritize buying gaps',()=>{
 const o=row('a');assert.equal(conversationQuestion(o),'Quem decide e quando?');
 o.qualification={decision:{confirmed:true,evidence:'Comprador em reunião'}};
 assert.match(conversationQuestion(o),/evento/);
 for(const key of ['timing','problem','budget'])o.qualification[key]={confirmed:true,evidence:'Fato confirmado'};
 assert.match(conversationQuestion(o,[{key:'no-next'}]),/responsável e prazo/);
 assert.match(conversationQuestion(o,[{key:'overdue-close'}]),/nova data/);
});
test('pluralization handles zero, singular and irregular nouns throughout dynamic captions',()=>{
 assert.equal(plural(1,'oportunidade'),'1 oportunidade');assert.equal(plural(0,'oportunidade'),'0 oportunidades');assert.equal(plural(2,'ação'),'2 ações');assert.equal(plural(1,'prazo vencido'),'1 prazo vencido');
 assert.equal(relativeDue('2026-10-11',now),'Atrasado há 1 dia');
});

test('BRL labels preserve cents instead of rounding individual deals away from totals',()=>{
 assert.match(money(1000.55),/1\.000,55/);assert.match(money(0),/0,00/);
});
