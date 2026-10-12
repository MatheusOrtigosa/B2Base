export type RelationshipRecord = {
 id:string; name?:string; company_id?:string|null; industry?:string; website?:string;
 legal_name?:string;tax_id?:string;description?:string;company_size?:string;city?:string;state?:string;country?:string;
 business_phone?:string;business_email?:string;products_services?:string;challenges?:string;strategic_objectives?:string;
 account_status?:string;icp_fit?:string;relationship_status?:string;relationship_notes?:string;
 email?:string;job_title?:string;department?:string;phone?:string;whatsapp?:string;linkedin?:string;preferred_channel?:string;
 role?:string;influence?:string;interests?:string;priorities?:string;notes?:string;
};
export type RelationshipEvent = {
 id:string;organization_id:string;company_id:string|null;contact_id:string|null;event_type:string;title:string;description:string;
 outcome:string;occurred_at:string;follow_up_date:string|null;follow_up_description:string;follow_up_done:boolean;created_by:string;created_at:string;
};
export type HealthIndicator={label:string;status:string;tone:'good'|'medium'|'low'|'unknown';reason:string};
export const eventTypes=['Ligação','Reunião','E-mail','WhatsApp','Nota','Outro'];
export const outcomes=['Conversa realizada','Avanço','Sem resposta','Ponto de atenção'];
export const relationshipStatuses=['Não avaliado','Em construção','Saudável','Atenção','Em risco'];
export function localDate(now:Date=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function relevantEvents(kind:'companies'|'contacts',id:string,events:RelationshipEvent[]){
 return events.filter(e=>(kind==='companies'?e.company_id:e.contact_id)===id).sort((a,b)=>Date.parse(b.occurred_at)-Date.parse(a.occurred_at));
}
export function healthIndicators(kind:'companies'|'contacts',r:RelationshipRecord,events:RelationshipEvent[],now:Date=new Date()):HealthIndicator[]{
 const relevant=relevantEvents(kind,r.id,events).filter(e=>Date.parse(e.occurred_at)<=now.getTime());
 // Notes and failed attempts do not pretend that an actual conversation happened.
 const communications=relevant.filter(e=>['Ligação','Reunião','E-mail','WhatsApp'].includes(e.event_type));
 const answered=communications.find(e=>e.outcome!=='Sem resposta');
 const days=answered?Math.floor((now.getTime()-Date.parse(answered.occurred_at))/86400000):null;
 const pending=relevant.filter(e=>e.follow_up_date&&!e.follow_up_done);
 const overdue=pending.filter(e=>e.follow_up_date!<localDate(now));
 const relationship=r.relationship_status||'Não avaliado';
 const recentConcern=communications[0]?.outcome==='Ponto de atenção';
 const failedAfterAnswer=communications.filter(e=>e.outcome==='Sem resposta'&&(!answered||Date.parse(e.occurred_at)>Date.parse(answered.occurred_at))&&now.getTime()-Date.parse(e.occurred_at)<=30*86400000).length;
 const relation:HealthIndicator={label:'Relacionamento',status:relationship,tone:relationship==='Saudável'?'good':relationship==='Em risco'?'low':['Atenção','Em construção'].includes(relationship)?'medium':'unknown',reason:r.relationship_notes||'Avaliação manual. Registre o contexto para sustentar esta leitura.'};
 if(recentConcern&&relationship!=='Em risco'){relation.status='Atenção';relation.tone='medium';relation.reason='A interação de comunicação mais recente registra um ponto de atenção.';}
 const fields=kind==='companies'?[
 ['Ramo',r.industry],['Descrição',r.description],['Porte',r.company_size==='Não informado'?'':r.company_size],['Cidade',r.city],['Site',r.website],['Produtos/serviços',r.products_services]
 ]:[['Empresa',r.company_id],['Cargo',r.job_title],['Área',r.department],['Canal de contato',r.email||r.phone||r.whatsapp],['Papel na compra',r.role==='Contato'?'':r.role],['Prioridades',r.priorities]];
 const missing=fields.filter(([,v])=>!v?.trim()).map(([k])=>k);
 const profile:HealthIndicator={label:'Conhecimento do cadastro',status:missing.length===0?'Completo':missing.length<=2?'Parcial':'A enriquecer',tone:missing.length===0?'good':missing.length<=2?'medium':'unknown',reason:missing.length?`Falta registrar: ${missing.join(', ')}.`:'As informações essenciais de contexto estão preenchidas.'};
 const cadence:HealthIndicator={label:'Contato e engajamento',status:failedAfterAnswer>=2?'Sem retorno':days===null?'Sem interação':days<=30?'Ativo':days<=60?'Retomar contato':'Distante',tone:failedAfterAnswer>=2?'medium':days===null?'unknown':days<=30?'good':days<=60?'medium':'low',reason:failedAfterAnswer>=2?'Duas ou mais tentativas sem resposta nos últimos 30 dias, sem conversa posterior.':days===null?'Nenhuma conversa registrada. Notas e tentativas sem resposta não contam como contato realizado.':`Última conversa há ${days} dia(s). Até 30 dias: ativo; 31–60: retomar; acima de 60: distante.`};
 const fitValue=kind==='companies'?(r.icp_fit||'Não avaliada'):(r.influence||'Não mapeada');
 const fit:HealthIndicator={label:kind==='companies'?'Aderência ao cliente ideal':'Influência na compra',status:fitValue,tone:fitValue==='Alta'?'good':fitValue==='Média'?'medium':fitValue==='Baixa'?'low':'unknown',reason:kind==='companies'?'Avaliação manual da aderência ao perfil de cliente que sua equipe busca.':'Avaliação manual do impacto desta pessoa nas decisões da conta.'};
 const action:HealthIndicator={label:'Próximos passos',status:overdue.length?'Atrasados':pending.length?'Planejados':'Sem ação pendente',tone:overdue.length?'low':pending.length?'good':'unknown',reason:overdue.length?`${overdue.length} acompanhamento(s) com prazo vencido.`:pending.length?`${pending.length} acompanhamento(s) ainda pendente(s).`:'Registre uma interação e combine um próximo passo quando necessário.'};
 return [relation,profile,cadence,fit,action];
}
export function overallHealth(indicators:HealthIndicator[]):HealthIndicator{
 const relation=indicators[0],cadence=indicators[2],action=indicators[4];
 if(relation.status==='Em risco')return {...relation,label:'Saúde geral'};
 if([relation,cadence,action].some(i=>i.tone==='low'||i.status==='Atenção'||i.status==='Sem retorno'||i.status==='Retomar contato'))return {label:'Saúde geral',status:'Atenção',tone:'medium',reason:'Há sinais no relacionamento, no contato ou nos próximos passos que merecem revisão.'};
 if(relation.status==='Saudável'&&cadence.status==='Ativo')return {label:'Saúde geral',status:'Saudável',tone:'good',reason:'Relacionamento avaliado como saudável e conversa registrada nos últimos 30 dias.'};
 return {label:'Saúde geral',status:'A conhecer',tone:'unknown',reason:'Ainda falta contexto para afirmar que o relacionamento está saudável.'};
}
