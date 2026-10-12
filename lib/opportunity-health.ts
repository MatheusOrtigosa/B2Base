import {score,type Qualification} from './score.ts';
import {localDate,type RelationshipRecord,type RelationshipEvent} from './relationships.ts';
export const feelingOptions=['Não avaliado','Muito desfavorável','Desfavorável','Neutro','Favorável','Muito favorável'];
export type HealthOpportunity={id:string;company_id?:string|null;notes?:string;qualification?:Qualification;seller_feeling?:string;seller_feeling_notes?:string;seller_feeling_updated_at?:string|null};
export type HealthTask={opportunity_id?:string|null;due_date?:string|null;done?:boolean};
export type HealthContext={companies:RelationshipRecord[];contacts:RelationshipRecord[];events:RelationshipEvent[];tasks:HealthTask[];historyAvailable?:boolean};
export type HealthFactor={key:string;label:string;weight:number;value:number|null;contribution:number;reason:string;source:string};
export type OpportunityHealth={value:number;label:string;tone:'good'|'medium'|'low'|'unknown';coverage:number;factors:HealthFactor[];alerts:string[];version:string;signals:TextSignal[];penalty:number};
export type TextSignal={phrase:string;tone:'positive'|'negative';excerpt:string};
const positives=['orcamento aprovado','verba aprovada','prioridade confirmada','cliente engajado','patrocinador interno','decisor envolvido','reuniao agendada','proposta aprovada','retorno positivo','dor clara','urgencia confirmada','interesse confirmado'];
const negatives=['sem orcamento','nao tem orcamento','nao temos orcamento','nao ha orcamento','orcamento nao aprovado','verba nao aprovada','sem prioridade','nao e prioridade','nao ha prioridade','sem interesse','nao tem interesse','nao demonstrou interesse','sem retorno','sem resposta','projeto suspenso','projeto cancelado','adiou a decisao','adiamento','concorrente favorito','bloqueio','resistencia','insatisfeito','sem decisor'];
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function textSentiment(text:string):{value:number|null;signals:TextSignal[];reason:string}{
 if(text.trim().length<20)return {value:null,signals:[],reason:'Pouco texto para identificar sinais. Enriqueça o contexto com fatos e observações.'};
 const sentences=text.split(/(?<=[.!?;\n])\s*/).filter(Boolean),signals:TextSignal[]=[];
 for(const sentence of sentences){const s=normalize(sentence);for(const phrase of negatives)if(s.includes(phrase))signals.push({phrase,tone:'negative',excerpt:sentence.trim().slice(0,200)});
 for(const phrase of positives){const index=s.indexOf(phrase);if(index<0)continue;const before=s.slice(Math.max(0,index-45),index);const after=s.slice(index+phrase.length,index+phrase.length+45);
 // Do not count negated, hypothetical or unresolved positive language as proof.
 if(/\b(nao|sem|nunca|talvez|se|aguardando|esperando|quando)\b/.test(before)||/\b(nao|ainda nao)\b/.test(after))continue;
 signals.push({phrase,tone:'positive',excerpt:sentence.trim().slice(0,200)});
 }}
 const unique=signals.filter((signal,i)=>signals.findIndex(x=>x.phrase===signal.phrase&&x.tone===signal.tone)===i);
 const positive=unique.filter(s=>s.tone==='positive').length,negative=unique.filter(s=>s.tone==='negative').length;
 if(!unique.length)return {value:null,signals:[],reason:'Nenhuma expressão conclusiva reconhecida. A leitura por regras não compreende todo o texto; não inferimos um sentimento positivo.'};
 const value=Math.round(Math.max(0,Math.min(100,50+20*positive-25*negative)));
 return {value,signals:unique,reason:`${positive} sinal(is) favorável(is) e ${negative} sinal(is) de atenção reconhecido(s) nos textos. Leitura por regras em português, sujeita a contexto e negação.`};
}
function bounded(n:number){return Math.max(0,Math.min(100,n));}
export function opportunityHealth(o:HealthOpportunity,context:HealthContext,now:Date=new Date()):OpportunityHealth{
 const contacts=o.company_id?context.contacts.filter(c=>c.company_id===o.company_id):[];
 const events=o.company_id?context.events.filter(e=>e.company_id===o.company_id&&Date.parse(e.occurred_at)<=now.getTime()).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at)):[];
 const company=context.companies.find(c=>c.id===o.company_id);
 const communications=events.filter(e=>['Ligação','Reunião','E-mail','WhatsApp'].includes(e.event_type));
 const answered=communications.filter(e=>e.outcome!=='Sem resposta');
 const newest=answered[0];const daysSince=newest?Math.floor((now.getTime()-Date.parse(newest.occurred_at))/86400000):null;
 const ownPending=context.tasks.filter(t=>t.opportunity_id===o.id&&!t.done);
 const late=ownPending.filter(t=>t.due_date&&t.due_date<localDate(now));
 // Share account signals without attributing unrelated contact notes to this deal.
 const sourceText=[o.notes||'',o.seller_feeling_notes||'',...Object.values(o.qualification||{}).map(q=>q.evidence||'')].join('\n');
 const sentiment=textSentiment(sourceText);
 const feelingMap:Record<string,number>={'Muito desfavorável':5,'Desfavorável':25,'Neutro':50,'Favorável':75,'Muito favorável':95};
 const feelingRaw=feelingMap[o.seller_feeling||''];
 const feelingAge=o.seller_feeling_updated_at?Math.max(0,Math.floor((now.getTime()-Date.parse(o.seller_feeling_updated_at))/86400000)):null;
 const feelingKnown=feelingRaw!==undefined&&!!o.seller_feeling_notes?.trim();
 const feelingValue=feelingKnown?(feelingAge!==null&&feelingAge>60?50+(feelingRaw-50)*.5:feelingRaw):null;
 const recent=communications.filter(e=>now.getTime()-Date.parse(e.occurred_at)<=30*86400000);
 const recentAnswered=recent.filter(e=>e.outcome!=='Sem resposta');
 const recency=daysSince===null?0:daysSince<=14?70:daysSince<=30?55:daysSince<=60?25:5;
 const engagement=(context.historyAvailable===false||!o.company_id)?null:bounded(recency+Math.min(30,recentAnswered.length*10)-recent.filter(e=>e.outcome==='Sem resposta').length*10);
 const span=answered.length>=2?Math.max(0,Math.floor((Date.parse(answered[0].occurred_at)-Date.parse(answered.at(-1)!.occurred_at))/86400000)):0;
 const familiarity=(context.historyAvailable===false||!o.company_id)?null:bounded(Math.min(60,span/90*60)+Math.min(40,answered.length*10))*(daysSince!==null&&daysSince>60?.5:1);
 const roles=new Set(contacts.map(c=>c.role));
 const coverage=o.company_id?bounded(Math.min(50,contacts.length*15)+(roles.has('Decisor')?25:0)+(roles.has('Apoiador')?15:0)+(roles.has('Influenciador')?10:0)):null;
 const evidenceEntries=Object.values(o.qualification||{});const evidenceKnown=evidenceEntries.some(q=>q.evidence?.trim());
 const factors:HealthFactor[]=[];
 const add=(key:string,label:string,weight:number,value:number|null,reason:string,source:string)=>factors.push({key,label,weight,value:value===null?null:Math.round(value),contribution:value===null?0:Math.round(weight*value)/100,reason,source});
 add('evidence','Qualificação e contexto',25,evidenceKnown?score(o.qualification):null,'Critérios confirmados com evidência continuam úteis, mas agora representam apenas 25% da composição. Marcar sem texto não pontua.','Oportunidade');
 add('feeling','Percepção do vendedor',25,feelingValue,feelingKnown?`Avaliação: ${o.seller_feeling}. ${feelingAge!==null&&feelingAge>60?'Avaliação com mais de 60 dias: influência reduzida até ser revista.':'A justificativa registra a leitura do vendedor.'}`:'Escolha uma percepção e justifique. Uma opinião sem contexto permanece desconhecida.','Avaliação manual da oportunidade');
 add('sentiment','Sinais nos textos',15,sentiment.value,sentiment.reason,'Discovery, evidências e justificativa desta oportunidade');
 add('engagement','Engajamento recente',15,engagement,engagement===null?'Histórico indisponível ou oportunidade sem conta vinculada.':`Última conversa ${daysSince===null?'ainda não registrada':`há ${daysSince} dias`}; ${recentAnswered.length} conversa(s) e ${recent.filter(e=>e.outcome==='Sem resposta').length} tentativa(s) sem resposta nos últimos 30 dias.`,'Histórico compartilhado da conta');
 add('coverage','Cobertura de pessoas',10,coverage,coverage===null?'Vincule uma empresa para mapear as pessoas.':`${contacts.length} contato(s). ${roles.has('Decisor')?'Decisor mapeado.':'Decisor não mapeado.'} ${roles.has('Apoiador')?'Apoiador mapeado.':''} Ter muitos contatos não comprova apoio ao negócio.`,'Contatos atuais da conta');
 add('familiarity','Histórico do relacionamento',10,familiarity,familiarity===null?'Histórico indisponível ou conta não vinculada.':`${answered.length} conversa(s) distribuída(s) em ${span} dias. Tempo sozinho não pontua; relacionamento distante perde influência.`,'Conversas realizadas com a conta');
 const alerts:string[]=[];
 if(company?.relationship_status==='Em risco')alerts.push('A conta foi avaliada manualmente como Em risco.');
 if(communications[0]?.outcome==='Ponto de atenção')alerts.push('A comunicação mais recente da conta registra um ponto de atenção.');
 if(late.length)alerts.push(`${late.length} próximo(s) passo(s) desta oportunidade com prazo vencido.`);
 const penalty=Math.min(20,(company?.relationship_status==='Em risco'?10:0)+(communications[0]?.outcome==='Ponto de atenção'?5:0)+Math.min(5,late.length*2));
 const value=Math.round(bounded(factors.reduce((sum,f)=>sum+f.contribution,0)-penalty));
 const knownWeight=factors.filter(f=>f.value!==null).reduce((sum,f)=>sum+f.weight,0);
 const label=knownWeight<50?'Pouco contexto':value>=75?'Forte':value>=50?'Em construção':'Atenção';
 const tone=knownWeight<50?'unknown':value>=75?'good':value>=50?'medium':'low';
 return {value,label,tone,coverage:knownWeight,factors,alerts,version:'context-v1',signals:sentiment.signals,penalty};
}
