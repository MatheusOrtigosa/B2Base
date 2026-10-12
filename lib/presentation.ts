export function plural(count:number,singular:string,pluralForm?:string){
 const irregular:Record<string,string>={'ação':'ações','sinal':'sinais','mês':'meses','prazo vencido':'prazos vencidos','dia':'dias'};
 return `${count} ${count===1?singular:pluralForm||irregular[singular]||singular+'s'}`;
}
export function money(value:number){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);}
export function fullDate(value?:string){return value?new Date(value.length===10?value+'T12:00:00':value).toLocaleDateString('pt-BR'):'Sem prazo';}
export function relativeDue(value?:string,now=new Date()){
 if(!value)return 'Sem prazo';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const days=Math.round((Date.parse(value.slice(0,10)+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
 return days<0?`Atrasado há ${plural(-days,'dia')}`:days===0?'Hoje':days===1?'Amanhã':`Em ${plural(days,'dia')}`;
}
export function overdue(value?:string){return relativeDue(value).startsWith('Atrasado');}
export function createdAgo(value?:string){if(!value)return '';const days=Math.max(0,Math.floor((Date.now()-Date.parse(value))/86400000));return days===0?'Criada hoje':`Criada há ${plural(days,'dia')}`;}
