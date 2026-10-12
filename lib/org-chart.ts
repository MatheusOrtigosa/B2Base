import type {RelationshipRecord} from './relationships.ts';
export type OrgNode={contact:RelationshipRecord;children:OrgNode[];unmapped:boolean};
export function descendants(contacts:RelationshipRecord[],id:string):Set<string>{
 const found=new Set<string>();const pending=[id];
 while(pending.length){const current=pending.pop()!;for(const c of contacts)if(c.reports_to_id===current&&!found.has(c.id)){found.add(c.id);pending.push(c.id);}}
 return found;
}
export function orgForest(contacts:RelationshipRecord[]):OrgNode[]{
 const byId=new Map(contacts.map(c=>[c.id,c]));const seen=new Set<string>();
 function build(c:RelationshipRecord,path:Set<string>):OrgNode{
  seen.add(c.id);const next=new Set(path);next.add(c.id);
  return {contact:c,unmapped:!c.reports_to_id||!byId.has(c.reports_to_id),children:contacts.filter(child=>child.reports_to_id===c.id&&!next.has(child.id)).map(child=>build(child,next))};
 }
 const roots=contacts.filter(c=>!c.reports_to_id||!byId.has(c.reports_to_id)).map(c=>build(c,new Set()));
 // Imported malformed data should remain visible, never cause endless recursion.
 for(const c of contacts)if(!seen.has(c.id))roots.push(build(c,new Set()));
 return roots;
}
