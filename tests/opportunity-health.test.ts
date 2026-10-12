import assert from 'node:assert/strict';
import {test} from 'node:test';
import {opportunityHealth,textSentiment,type HealthContext} from '../lib/opportunity-health.ts';
import {criteria} from '../lib/score.ts';
import {orgForest,descendants} from '../lib/org-chart.ts';
import type {RelationshipEvent} from '../lib/relationships.ts';
const now=new Date('2026-10-12T12:00:00Z');
const context:HealthContext={companies:[{id:'a',name:'Account'}],contacts:[],events:[],tasks:[],historyAvailable:true};
function event(p:Partial<RelationshipEvent>={}):RelationshipEvent{return {id:'event',organization_id:'org',company_id:'a',contact_id:null,event_type:'Ligação',title:'Conversa',description:'',outcome:'Conversa realizada',occurred_at:'2026-10-10T12:00:00Z',follow_up_date:null,follow_up_description:'',follow_up_done:false,created_by:'user',created_at:'2026-10-10T12:00:00Z',...p};}
test('confirmed evidence contributes at most 25 points, never a full opportunity score',()=>{
 const q=Object.fromEntries(criteria.map(c=>[c.key,{confirmed:true,evidence:'Confirmado em reunião'}]));
 const h=opportunityHealth({id:'opp',qualification:q},context,now);
 assert.equal(h.value,25);assert.equal(h.factors.find(f=>f.key==='evidence')?.contribution,25);
 assert.equal(h.label,'Pouco contexto');assert.equal(h.factors.reduce((s,f)=>s+f.weight,0),100);
});
test('unsupported checks and opinions do not earn points',()=>{
 const h=opportunityHealth({id:'opp',seller_feeling:'Muito favorável',seller_feeling_notes:'',qualification:{problem:{confirmed:true,evidence:''}}},context,now);
 assert.equal(h.value,0);assert.equal(h.factors.find(f=>f.key==='feeling')?.value,null);assert.equal(h.factors.find(f=>f.key==='evidence')?.value,null);
});
test('negative and negated text does not count as an approved budget',()=>{
 const h=textSentiment('O cliente não tem orçamento aprovado. O projeto foi discutido na reunião de hoje.');
 assert.equal(h.signals.some(s=>s.tone==='positive'),false);assert.ok((h.value??50)<50);
});
test('hypothetical or unresolved positive language remains unknown',()=>{
 assert.equal(textSentiment('Se tivermos orçamento aprovado, poderemos iniciar a implementação.').value,null);
 assert.equal(textSentiment('Estamos aguardando orçamento aprovado para decidir os próximos passos.').value,null);
});
test('repeating an expression does not inflate text sentiment',()=>{
 const a=textSentiment('Cliente engajado durante toda a conversa.');
 const b=textSentiment('Cliente engajado. Cliente engajado. Cliente engajado durante toda a conversa.');
 assert.equal(a.value,b.value);assert.equal(b.signals.length,1);
});
test('text without recognizable evidence is not assumed positive',()=>{
 assert.equal(textSentiment('Conversamos sobre vários temas em uma reunião de acompanhamento.').value,null);
});
test('seller feeling requires rationale and stale assessments lose influence',()=>{
 const current=opportunityHealth({id:'opp',seller_feeling:'Muito favorável',seller_feeling_notes:'Conhecemos bem o cenário e a reação da pessoa.',seller_feeling_updated_at:'2026-10-11T12:00:00Z'},context,now);
 const old=opportunityHealth({id:'opp',seller_feeling:'Muito favorável',seller_feeling_notes:'Conhecemos bem o cenário e a reação da pessoa.',seller_feeling_updated_at:'2026-06-01T12:00:00Z'},context,now);
 assert.ok(current.value>old.value);
});
test('notes and non-responses do not fabricate years of relationship',()=>{
 const h=opportunityHealth({id:'opp',company_id:'a'},{...context,events:[event({event_type:'Nota',occurred_at:'2020-01-01T12:00:00Z'}),event({outcome:'Sem resposta'})]},now);
 assert.equal(h.factors.find(f=>f.key==='familiarity')?.value,0);assert.equal(h.factors.find(f=>f.key==='engagement')?.value,0);
});
test('contacts and conversations from another account do not influence the score',()=>{
 const own=opportunityHealth({id:'opp',company_id:'a'},context,now);
 const other=opportunityHealth({id:'opp',company_id:'a'},{...context,contacts:[{id:'outside',company_id:'b',role:'Decisor'}],events:[event({company_id:'b'})]},now);
 assert.equal(own.value,other.value);
});
test('more contacts alone remain bounded and do not claim full confidence',()=>{
 const h=opportunityHealth({id:'opp',company_id:'a'},{...context,contacts:Array.from({length:100},(_,i)=>({id:String(i),company_id:'a',role:'Contato'}))},now);
 assert.equal(h.factors.find(f=>f.key==='coverage')?.contribution,5);assert.ok(h.value<20);
});
test('missing history remains unknown and future events are excluded',()=>{
 const unavailable=opportunityHealth({id:'opp',company_id:'a'},{...context,historyAvailable:false},now);
 assert.equal(unavailable.factors.find(f=>f.key==='engagement')?.value,null);
 const future=opportunityHealth({id:'opp',company_id:'a'},{...context,events:[event({occurred_at:'2027-01-01T12:00:00Z'})]},now);
 assert.equal(future.factors.find(f=>f.key==='engagement')?.value,0);
});
test('overdue actions affect only their own opportunity and explain the adjustment',()=>{
 const clean=opportunityHealth({id:'opp',company_id:'a'},{...context,events:[event()]},now);
 const unrelated=opportunityHealth({id:'opp',company_id:'a'},{...context,events:[event()],tasks:[{opportunity_id:'other',due_date:'2026-10-01',done:false}]},now);
 const late=opportunityHealth({id:'opp',company_id:'a'},{...context,events:[event()],tasks:[{opportunity_id:'opp',due_date:'2026-10-01',done:false}]},now);
 assert.equal(clean.value,unrelated.value);assert.ok(late.value<clean.value);assert.equal(late.penalty,2);assert.ok(late.alerts[0].includes('prazo vencido'));
});
test('score stays within bounds with rich account history and contextual factors',()=>{
 const q=Object.fromEntries(criteria.map(c=>[c.key,{confirmed:true,evidence:'Orçamento aprovado. Cliente engajado. Decisor envolvido.'}]));
 const h=opportunityHealth({id:'opp',company_id:'a',qualification:q,seller_feeling:'Muito favorável',seller_feeling_notes:'Cliente engajado. Proposta aprovada. Retorno positivo.'},{...context,contacts:['Decisor','Apoiador','Influenciador','Contato'].map((role,i)=>({id:String(i),company_id:'a',role})),events:[event(),event({occurred_at:'2026-10-01T12:00:00Z'}),event({occurred_at:'2026-07-01T12:00:00Z'}),event({occurred_at:'2026-03-01T12:00:00Z'})]},now);
 assert.ok(h.value>=75&&h.value<=100);assert.equal(h.coverage,100);assert.equal(h.label,'Forte');
});
test('hierarchy renders multiple roots, descendants and detached contacts without inventing superiors',()=>{
 const people=[{id:'boss',name:'Diretor'},{id:'child',reports_to_id:'boss'},{id:'leaf',reports_to_id:'child'},{id:'unknown',reports_to_id:'outside'}];
 const tree=orgForest(people);assert.equal(tree.length,2);assert.equal(tree[0].children[0].children[0].contact.id,'leaf');assert.equal(tree[1].unmapped,true);
 assert.deepEqual([...descendants(people,'boss')].sort(),['child','leaf']);
});
test('malformed imported hierarchy does not recurse endlessly',()=>{
 const tree=orgForest([{id:'a',reports_to_id:'b'},{id:'b',reports_to_id:'a'}]);assert.equal(tree.length,1);assert.equal(tree[0].children.length,1);
});
