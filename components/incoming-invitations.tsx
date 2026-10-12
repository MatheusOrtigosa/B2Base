'use client';
import type {IncomingInvitation} from '../lib/team';
export default function IncomingInvitations({invitations,busy,onAccept,onRefresh}:{invitations:IncomingInvitation[];busy:boolean;onAccept:(id:string)=>Promise<void>;onRefresh:()=>Promise<void>}){
 return <section className="panel incoming"><div className="section-heading"><h2>Convites para você</h2><button type="button" className="text-button" disabled={busy} onClick={onRefresh}>Atualizar convites</button></div>{invitations.length?invitations.map(i=><div className="record" key={i.id}><div><b>{i.organization_name}</b><small>Válido até {new Date(i.expires_at).toLocaleDateString('pt-BR')}</small></div><button type="button" className="primary" disabled={busy} onClick={()=>onAccept(i.id)}>Aceitar convite</button></div>):<p className="muted">Se você foi convidado, confirme o e-mail da conta e atualize esta lista.</p>}</section>;
}
