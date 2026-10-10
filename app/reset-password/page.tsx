'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {supabase} from '../../lib/supabase';
export default function ResetPassword(){
 const [ready,setReady]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setReady(!!data.session));const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setReady(!!s));return()=>subscription.unsubscribe();},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!supabase)return;const f=new FormData(e.currentTarget);if(f.get('password')!==f.get('confirm')){setMessage('As senhas precisam ser iguais.');return;}setBusy(true);const {error}=await supabase.auth.updateUser({password:String(f.get('password'))});setMessage(error?error.message:'Senha atualizada. Você já pode voltar para sua base.');setBusy(false);}
 return <main className="center"><form className="auth" onSubmit={submit}><h1>B2Base.</h1><h2>Defina sua nova senha</h2><p>{ready?'Escolha uma senha com pelo menos 8 caracteres.':'Abra o link de recuperação enviado ao seu e-mail.'}</p>{message&&<p role="status">{message}</p>}<label>Nova senha<input name="password" type="password" autoComplete="new-password" required minLength={8}/></label><label>Confirme a senha<input name="confirm" type="password" autoComplete="new-password" required minLength={8}/></label><button disabled={!ready||busy} className="primary">Salvar senha</button><a href="/">Voltar para a B2Base →</a></form></main>;
}
