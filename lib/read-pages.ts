import type {SupabaseClient} from '@supabase/supabase-js';
// Phase A uses existing tables only. Exact counts prevent silent API row caps.
export async function readAllRows(client:SupabaseClient,table:string,organizationId:string,isCurrent:()=>boolean=()=>true){
 const rows:Record<string,unknown>[]=[];let expected:number|null=null;let offset=0;
 while(true){
  if(!isCurrent())return {data:[],error:null};
  const query=offset===0?client.from(table).select('*',{count:'exact'}):client.from(table).select('*');
  const result=await query.eq('organization_id',organizationId).order('created_at',{ascending:false}).order('id',{ascending:true}).range(offset,offset+499);
  if(result.error)return {data:null,error:result.error};
  if(offset===0)expected=result.count;
  const page=result.data||[];rows.push(...page);offset+=page.length;
  if(expected!==null&&offset>=expected)return {data:rows,error:null};
  if(page.length===0){if(expected!==null&&offset<expected)return {data:null,error:{message:'A base mudou durante a leitura. Atualize para recalcular com dados completos.'}};return {data:rows,error:null};}
  if(expected===null&&page.length<500)return {data:rows,error:null};
 }
}
