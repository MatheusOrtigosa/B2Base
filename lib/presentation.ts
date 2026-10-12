export function money(value:number){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(value);}
export function fullDate(value?:string){return value?new Date(value.length===10?value+'T12:00:00':value).toLocaleDateString('pt-BR'):'Sem prazo';}
export function relativeDue(value?:string,now=new Date()){
 if(!value)return 'Sem prazo';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const days=Math.round((Date.parse(value.slice(0,10)+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
 return days<0?`Atrasado há ${-days} dia(s)`:days===0?'Hoje':days===1?'Amanhã':`Em ${days} dias`;
}
export function overdue(value?:string){return relativeDue(value).startsWith('Atrasado');}
export function createdAgo(value?:string){if(!value)return '';const days=Math.max(0,Math.floor((Date.now()-Date.parse(value))/86400000));return days===0?'Criada hoje':`Criada há ${days} dia(s)`;}
