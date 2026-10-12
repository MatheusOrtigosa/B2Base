'use client';
import type {OpportunityHealth} from '../lib/opportunity-health';
import {useEffect,useId,useRef,useState,type ReactNode,type FormEvent,type InputHTMLAttributes} from 'react';

export function Icon({name,size=20}:{name:string;size?:number}){
 const paths:Record<string,ReactNode>={
 cockpit:<><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4M7 9h3M7 13h3M15 8v6M13 11h4"/></>,
 dashboard:<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
 pipeline:<><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="14" rx="1"/></>,
 leads:<><circle cx="11" cy="11" r="7"/><circle cx="11" cy="11" r="3"/><path d="m16 16 5 5"/></>,
 companies:<><path d="M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h3v3"/></>,
 contacts:<><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2"/><path d="M8 16c0-4 8-4 8 0M2 7h3M2 12h3M2 17h3"/></>,
 team:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/></>,
 tasks:<><path d="m4 6 2 2 4-4M13 6h7M4 13l2 2 4-4M13 13h7M4 20l2 2 4-4M13 20h7"/></>,
 search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,close:<path d="m6 6 12 12M18 6 6 18"/>,chevron:<path d="m7 10 5 5 5-5"/>,arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>,logout:<><path d="M9 4H4v16h5M9 12h12m-5-5 5 5-5 5"/></>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,warning:<><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,check:<path d="m5 12 4 4L20 5"/>,clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
 eye:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,menu:<path d="M4 6h16M4 12h16M4 18h16"/>,spark:<path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z"/>,list:<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.info}</svg>;
}
export function Brand(){return <div className="brand"><span className="brand-symbol">B²</span><b>B2Base<span>.</span></b></div>;}
export function ScoreBadge({value,kind='opportunity',assessment}:{value:number;kind?:'opportunity'|'lead';assessment?:OpportunityHealth}){return <span title={assessment?`${assessment.label}. ${assessment.coverage}% do peso tem dados disponíveis. Abra a oportunidade para ver os fatores.`:kind==='lead'?'Score do lead: 60% aderência ao perfil ideal + 40% intenção de compra. Avaliação manual.':'Saúde contextual: qualificação, percepção, textos e relacionamento. Abra a oportunidade para ver a composição. Não é probabilidade de fechamento.'} className={`badge ${assessment?.tone||(value>=75?'good':value>=50?'medium':'low')}`}><Icon name={value>=75?'check':value>=50?'clock':'warning'} size={14}/>{value}/100</span>;}
export function StageBadge({stage}:{stage?:string}){const tone=stage==='Ganha'?'good':stage==='Perdida'?'low':stage==='Negociação'?'medium':stage==='Validação'||stage==='Proposta'?'info':'unknown';return <span className={`badge ${tone}`}>{stage||'Sem etapa'}</span>;}
export function Avatar({name}:{name:string}){return <span className="avatar" aria-hidden="true">{name.slice(0,2).toUpperCase()}</span>;}
export function Empty({text,action,onAction,icon='spark'}:{text:string;action?:string;onAction?:()=>void;icon?:string}){return <div className="empty"><span className="empty-symbol"><Icon name={icon} size={32}/></span><p>{text}</p>{action&&onAction&&<button className="secondary" onClick={onAction}><Icon name="plus"/>{action}</button>}</div>;}
export function Search({value,set}:{value:string;set:(v:string)=>void}){return <div className="search-control"><Icon name="search"/><input aria-label="Buscar registros" placeholder="Buscar na sua base…" value={value} onChange={e=>set(e.target.value)}/></div>;}
export function Skeleton(){return <div className="skeleton-page" aria-label="Carregando sua base" role="status"><div className="skeleton skeleton-heading"/><div className="metrics">{[1,2,3,4].map(n=><div key={n} className="skeleton skeleton-card"/>)}</div><div className="skeleton skeleton-panel"/><span className="sr-only">Carregando sua base</span></div>;}
function validationMessage(input:HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement){if(input.validity.valueMissing)return 'Preencha este campo.';if(input.validity.typeMismatch)return 'Informe um e-mail válido.';if(input.validity.rangeUnderflow||input.validity.rangeOverflow)return `Use um valor entre ${input.getAttribute('min')||'0'} e ${input.getAttribute('max')||'o limite permitido'}.`;if(input.validity.tooShort)return `Use pelo menos ${input.getAttribute('minlength')} caracteres.`;return input.validationMessage?'Confira o valor informado.':'';}
export function FormField({label,helper,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;helper?:string}){
 const id=useId(),[error,setError]=useState('');return <label htmlFor={id} className="form-field">{label}{props.required&&<span className="required-mark"> *</span>}<input {...props} id={id} aria-invalid={!!error} aria-describedby={helper||error?id+'-help':undefined} onInvalid={e=>setError(validationMessage(e.currentTarget))} onBlur={e=>{setError(validationMessage(e.target));props.onBlur?.(e);}}/>{(helper||error)&&<small id={id+'-help'} className={error?'field-error':'field-helper'}>{error||helper}</small>}</label>;
}
export function FormSection({title,children}:{title:string;children:ReactNode}){return <fieldset className="form-section"><legend>{title}</legend>{children}</fieldset>;}
export function FormFooter({busy,action,onCancel}:{busy:boolean;action:string;onCancel:()=>void}){return <footer className="form-footer"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button><button className="primary" type="submit" disabled={busy}>{busy?<><span className="spinner"/>Salvando…</>:action}</button></footer>;}
export function useDialog(ref:React.RefObject<HTMLElement|null>,onClose:()=>void,initialFocus:'control'|'first'='control'){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const element=ref.current;if(!element)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';
 const focusable=()=>Array.from(element.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')).filter(e=>e.getClientRects().length>0&&!e.matches(':disabled'));
 const first=initialFocus==='first'?focusable()[0]:element.querySelector<HTMLElement>('input:not([type="hidden"]),select,textarea')||focusable()[0];first?.focus();
 function key(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();}if(e.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 element.addEventListener('keydown',key);return()=>{element.removeEventListener('keydown',key);document.body.style.overflow=old;previous?.focus();};
 },[ref,initialFocus]);
}
export function FormModal({title,subtitle,icon,children,busy,error,action,onClose,onSubmit,drawer=false}:{title:string;subtitle:string;icon:string;children:ReactNode;busy:boolean;error:string;action:string;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>Promise<void>;drawer?:boolean}){
 const ref=useRef<HTMLElement>(null),dirty=useRef(false),sending=useRef(false),id=useId();const [errors,setErrors]=useState<string[]>([]);
 function close(){if(busy)return;if(dirty.current&&!window.confirm('Descartar as alterações não salvas?'))return;onClose();}
 useDialog(ref,close);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy||sending.current)return;const controls=Array.from(e.currentTarget.elements).filter((c):c is HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement=>c instanceof HTMLInputElement||c instanceof HTMLSelectElement||c instanceof HTMLTextAreaElement);const invalid=controls.filter(c=>!c.checkValidity());setErrors(invalid.map(c=>validationMessage(c)));if(invalid.length){invalid[0].focus();return;}sending.current=true;try{await onSubmit(e);}finally{sending.current=false;}}
 return <div className={`overlay ${drawer?'drawer-overlay':''}`}><section ref={ref} className={`dialog form-dialog ${drawer?'drawer':''}`} role="dialog" aria-modal="true" aria-labelledby={id+'-title'} aria-describedby={id+'-desc'}><div className="form-header"><span className="entity-icon"><Icon name={icon}/></span><div><h2 id={id+'-title'}>{title}</h2><p id={id+'-desc'}>{subtitle}</p></div><button className="icon-button" aria-label="Fechar" disabled={busy} onClick={close}><Icon name="close"/></button></div><form noValidate onSubmit={submit} onChange={()=>{dirty.current=true;}}><div className="form-body">{error&&<p className="alert error" role="alert"><Icon name="warning"/>{error}</p>}{errors.length>0&&<div className="alert error" role="alert"><Icon name="warning"/><div><b>Confira os campos destacados.</b><ul>{[...new Set(errors)].map(s=><li key={s}>{s}</li>)}</ul></div></div>}<fieldset className="form-controls" disabled={busy}>{children}</fieldset></div><FormFooter busy={busy} action={action} onCancel={close}/></form></section></div>;
}
export function DetailDialog({title,children,onClose,dirty=false,busy=false,wide=true}:{title:string;children:ReactNode;onClose:()=>void;dirty?:boolean;busy?:boolean;wide?:boolean}){
 const ref=useRef<HTMLElement>(null);function close(){if(busy)return;if(dirty&&!window.confirm('Descartar as alterações não salvas?'))return;onClose();}useDialog(ref,close,'first');
 return <div className="overlay"><section ref={ref} className={`dialog ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();}}}>{children}</section></div>;
}
