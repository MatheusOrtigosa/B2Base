import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {SupabaseClient} from '@supabase/supabase-js';
import {readAllRows} from '../lib/read-pages.ts';
function stub(total:number,cap:number,emptyAt?:number){
 const ranges:number[]=[];const counts:unknown[]=[];
 const client={from(table:string){assert.equal(table,'opportunities');return {select(_columns:string,options?:unknown){counts.push(options);return {eq(key:string,id:string){assert.equal(key,'organization_id');assert.equal(id,'org');const q={order(){return q;},async range(start:number,end:number){ranges.push(start);const length=start===emptyAt?0:Math.max(0,Math.min(total-start,cap,end-start+1));return {data:Array.from({length},(_,i)=>({id:start+i})),count:options?total:null,error:null};}};return q;}};}};}};
 return {client:client as unknown as SupabaseClient,ranges,counts};
}
test('loads more than 1000 rows without accepting a truncated Supabase response',async()=>{
 const s=stub(1201,100);const result=await readAllRows(s.client,'opportunities','org');
 assert.equal(result.error,null);assert.equal(result.data?.length,1201);assert.equal(result.data?.at(-1)?.id,1200);
 assert.deepEqual(s.ranges,[0,100,200,300,400,500,600,700,800,900,1000,1100,1200]);assert.deepEqual(s.counts[0],{count:'exact'});assert.equal(s.counts[1],undefined);
});
test('empty tables terminate in one query and data loss during paging produces an error',async()=>{
 const empty=stub(0,500);assert.deepEqual(await readAllRows(empty.client,'opportunities','org'),{data:[],error:null});assert.equal(empty.ranges.length,1);
 const changed=stub(1000,500,500);const r=await readAllRows(changed.client,'opportunities','org');assert.equal(r.data,null);assert.match(r.error!.message,/base mudou/);
});
test('workspace switches cancel remaining pages before they can overwrite the next workspace',async()=>{
 const s=stub(1000,500);let calls=0;const result=await readAllRows(s.client,'opportunities','org',()=>++calls===1);
 assert.deepEqual(result,{data:[],error:null});assert.deepEqual(s.ranges,[0]);
});
