import assert from 'node:assert/strict';
import {test} from 'node:test';
import {healthIndicators,overallHealth,relevantEvents,type RelationshipEvent} from '../lib/relationships.ts';
const now=new Date('2026-10-12T12:00:00Z');
function event(p:Partial<RelationshipEvent>={}):RelationshipEvent{return {id:'event',organization_id:'org',company_id:'company',contact_id:'contact',event_type:'Ligação',title:'Contato',description:'',outcome:'Conversa realizada',occurred_at:'2026-10-10T12:00:00Z',follow_up_date:null,follow_up_description:'',follow_up_done:false,created_by:'user',created_at:'2026-10-10T12:00:00Z',...p};}
test('empty records remain unknown instead of claiming a healthy relationship',()=>{
 const h=healthIndicators('companies',{id:'company'},[],now);
 assert.equal(h[0].status,'Não avaliado');assert.equal(h[2].status,'Sem interação');assert.equal(overallHealth(h).status,'A conhecer');
});
test('notes and unanswered attempts do not count as actual conversations',()=>{
 const h=healthIndicators('contacts',{id:'contact'},[event({event_type:'Nota'}),event({outcome:'Sem resposta'})],now);
 assert.equal(h[2].status,'Sem interação');
});
test('healthy relationship requires explicit assessment and recent conversation',()=>{
 const h=healthIndicators('contacts',{id:'contact',relationship_status:'Saudável'},[event()],now);
 assert.equal(h[2].status,'Ativo');assert.equal(overallHealth(h).status,'Saudável');
});
test('old conversations and overdue follow-ups require attention',()=>{
 const h=healthIndicators('companies',{id:'company',relationship_status:'Saudável'},[event({occurred_at:'2026-07-01T12:00:00Z',follow_up_date:'2026-10-11'})],now);
 assert.equal(h[2].status,'Distante');assert.equal(h[4].status,'Atrasados');assert.equal(overallHealth(h).status,'Atenção');
});
test('completed follow-ups do not remain overdue',()=>{
 const h=healthIndicators('contacts',{id:'contact'},[event({follow_up_date:'2026-10-01',follow_up_done:true})],now);
 assert.equal(h[4].status,'Sem ação pendente');
});
test('a new negative conversation is not hidden by a subsequent note',()=>{
 const h=healthIndicators('companies',{id:'company',relationship_status:'Saudável'},[event({outcome:'Ponto de atenção'}),event({event_type:'Nota',occurred_at:'2026-10-11T12:00:00Z'})],now);
 assert.equal(h[0].status,'Atenção');assert.equal(overallHealth(h).status,'Atenção');
});
test('two unanswered attempts after the last conversation show lack of response',()=>{
 const h=healthIndicators('contacts',{id:'contact'},[event({occurred_at:'2026-10-01T12:00:00Z'}),event({id:'one',outcome:'Sem resposta',occurred_at:'2026-10-09T12:00:00Z'}),event({id:'two',outcome:'Sem resposta'})],now);
 assert.equal(h[2].status,'Sem retorno');
});
test('an older negative outcome does not override a new successful conversation',()=>{
 const h=healthIndicators('contacts',{id:'contact',relationship_status:'Saudável'},[event({outcome:'Ponto de atenção',occurred_at:'2026-10-01T12:00:00Z'}),event()],now);
 assert.equal(h[0].status,'Saudável');
});
test('company aggregates direct and contact events while contact excludes other people',()=>{
 const events=[event(),event({id:'direct',contact_id:null}),event({id:'another',contact_id:'other-contact'}),event({id:'other',company_id:'other-company',contact_id:'other-contact'})];
 assert.equal(relevantEvents('companies','company',events).length,3);
 assert.equal(relevantEvents('contacts','contact',events).length,1);
});
test('unknown qualification is explicit and future records do not inflate engagement',()=>{
 const h=healthIndicators('companies',{id:'company'},[event({occurred_at:'2027-01-01T12:00:00Z'})],now);
 assert.equal(h[3].status,'Não avaliada');assert.equal(h[2].status,'Sem interação');
});
