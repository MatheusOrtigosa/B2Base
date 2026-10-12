'use client';
import {useRef,useState} from 'react';
import {Icon,useDialog} from './ui';
export type SearchResult={id:string;kind:string;name:string;context:string};
export default function GlobalSearch({results,onSelect,onClose}:{results:SearchResult[];onSelect:(r:SearchResult)=>void;onClose:()=>void}){
 const [query,setQuery]=useState(''),ref=useRef<HTMLElement>(null);useDialog(ref,onClose);
 const visible=results.filter(r=>(r.name+' '+r.context).toLowerCase().includes(query.toLowerCase())).slice(0,12);
 return <div className="overlay"><section ref={ref} role="dialog" aria-modal="true" aria-label="Busca global" className="dialog command-dialog"><div className="command-input"><Icon name="search"/><input aria-label="Buscar empresas, contatos, leads, oportunidades e tarefas" placeholder="O que você procura na sua base?" value={query} onChange={e=>setQuery(e.target.value)}/><button className="icon-button" aria-label="Fechar busca" onClick={onClose}><Icon name="close"/></button></div><div className="command-results">{visible.map(r=><button className="command-result" key={r.kind+r.id} onClick={()=>{onSelect(r);onClose();}}><Icon name={r.kind==='opportunities'?'pipeline':r.kind}/><div><b>{r.name}</b><small>{r.context}</small></div><Icon name="arrow"/></button>)}{!visible.length&&<p>Nenhum resultado na empresa ativa.</p>}</div><p className="muted">Busca nos cadastros carregados da empresa ativa. Use Tab para navegar e Esc para fechar.</p></section></div>;
}
