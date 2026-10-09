"use client";
import { Send,BellOff } from "lucide-react";
import { useEffect,useMemo,useRef,useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient,syncRealtimeAuth } from "@/lib/supabase/client";
import type { CommunityMessage } from "@/lib/communities";
import { cleanMessage,MESSAGE_MAX } from "@/lib/membership";
import { buttonSecondary,field } from "@/components/ui/styles";
import { changeCommunity } from "@/app/comunidades/actions";
import { ReportButton } from "./ReportButton";
import { track } from "@/lib/track";
export function CommunityChat({id,userId,initial,muted}:{id:string;userId:string;initial:CommunityMessage[];muted:boolean}){
 const db=useMemo(()=>createClient(),[]),router=useRouter();
 const [messages,setMessages]=useState(initial),[draft,setDraft]=useState(""),[error,setError]=useState(""),[sending,setSending]=useState(false),[pending,start]=useTransition(),[leaving,setLeaving]=useState(false);
 const list=useRef<HTMLOListElement>(null);
 useEffect(()=>{
  let alive=true;
  const reload=async()=>{
   const r=await db.from("community_messages").select("id,community_id,user_id,body,created_at,profiles(display_name)").eq("community_id",id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(100);
   if(!alive)return;if(r.error){setError("Não conseguimos atualizar as mensagens. Tente recarregar.");return;}
   setMessages((r.data??[]).map(({profiles,...m})=>({...m,author:(profiles as unknown as {display_name:string}|null)?.display_name??"Participante"})).reverse());
   if(document.visibilityState==="visible")await db.from("community_members").update({last_read_at:new Date().toISOString()}).eq("community_id",id).eq("user_id",userId);
  };
  const channel=db.channel(`community:${id}`).on("postgres_changes",{event:"*",schema:"public",table:"community_messages",filter:`community_id=eq.${id}`},()=>void reload());
  syncRealtimeAuth(db).then(()=>{if(alive)channel.subscribe();});void reload();
  const timer=setInterval(()=>void reload(),10000);
  return()=>{alive=false;clearInterval(timer);void db.removeChannel(channel);};
 },[db,id,userId]);
 useEffect(()=>{const el=list.current;if(el)el.scrollTop=el.scrollHeight;},[messages.length]);
 const update=(action:"leave"|"mute"|"unmute")=>start(async()=>{const r=await changeCommunity(id,action);if(!r.ok)setError(r.message??"Tente novamente.");else if(action==="leave")router.push("/comunidades");else router.refresh();});
 const send=async(e:React.FormEvent)=>{
  e.preventDefault();const body=cleanMessage(draft);if(!body||sending)return;setSending(true);setError("");
  const r=await db.rpc("send_community_message",{p_community_id:id,p_body:body});setSending(false);
  if(r.error||!r.data){setError("Mensagem não enviada. Confira sua participação e aguarde um instante para tentar novamente.");return;}
  setDraft("");setMessages(prev=>prev.some(m=>m.id===r.data.id)?prev:[...prev,{...r.data,author:"Você"}]);track("community_message");
 };
 return <div className="space-y-4"><div className="flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={()=>update(muted?"unmute":"mute")} className={`${buttonSecondary} gap-2 text-sm`}>{muted&&<BellOff size={16} aria-hidden/>}{muted?"Mostrar mensagens novas":"Silenciar indicadores"}</button><button type="button" onClick={()=>setLeaving(s=>!s)} className={`${buttonSecondary} text-sm`}>Sair da comunidade</button></div>{leaving&&<div className="rounded-2xl bg-surface-2 p-4"><p className="mb-3 text-sm">Ao sair, você perde acesso ao chat. Suas mensagens já enviadas permanecem no grupo.</p><button type="button" disabled={pending} onClick={()=>update("leave")} className={buttonSecondary}>Confirmar saída</button></div>}
 <ol ref={list} aria-label="Mensagens da comunidade" aria-live="polite" className="max-h-[55dvh] min-h-48 space-y-3 overflow-y-auto overscroll-contain rounded-2xl bg-surface-2 p-3">{!messages.length&&<li className="py-8 text-center text-sm text-muted">Ninguém falou ainda. Apresente-se e combine um encontro.</li>}{messages.map(m=><li key={m.id} className={`flex flex-col ${m.user_id===userId?"items-end":"items-start"}`}><div className={`max-w-[90%] rounded-2xl px-4 py-3 ${m.user_id===userId?"bg-primary text-on-fill":"bg-surface"}`}><p className="text-xs font-bold">{m.user_id===userId?"Você":m.author}</p><p className="break-words whitespace-pre-line">{m.body}</p></div><div className="flex items-center gap-2 text-[11px] text-muted"><time dateTime={m.created_at}>{new Date(m.created_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</time>{m.user_id!==userId&&<ReportButton targetType="community_message" targetId={m.id}/>}</div></li>)}</ol><p className="text-xs text-muted">Mostrando as 100 mensagens recentes. Combine encontros em lugares públicos.</p>
 <form onSubmit={send} className="flex items-end gap-2"><label className="sr-only" htmlFor="community-message">Mensagem para a comunidade</label><textarea id="community-message" rows={2} maxLength={MESSAGE_MAX} value={draft} onChange={e=>setDraft(e.target.value)} className={field} placeholder="Troque dicas com o grupo"/><button type="submit" disabled={sending||!cleanMessage(draft)} aria-label="Enviar mensagem" className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-fill disabled:opacity-50"><Send size={18} aria-hidden/></button></form><p role="status" className="text-sm text-danger empty:hidden">{error}</p><ReportButton targetType="community" targetId={id} label="Denunciar comunidade"/></div>;
}
