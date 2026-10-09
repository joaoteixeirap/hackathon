"use client";
import { LocateFixed } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { buttonSecondary } from "@/components/ui/styles";
import { track } from "@/lib/track";
/** Coordinates exist only in this callback; never profile/storage/analytics/URLs. */
export function UseLocation({onLocated,compact=false}:{onLocated:(point:{lat:number;lng:number})=>void|Promise<void>;compact?:boolean}){
 const [status,setStatus]=useState(""),[pending,setPending]=useState(false);const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 return <div><button type="button" disabled={pending} className={compact?"inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-primary hover:underline disabled:opacity-60":`${buttonSecondary} w-full gap-2`} onClick={()=>{
  track("location_request");
  if(!navigator.geolocation){setStatus("Localização indisponível. Escolha uma cidade.");return;}
  setPending(true);setStatus("");
  navigator.geolocation.getCurrentPosition(async p=>{if(!alive.current)return;try{await onLocated({lat:p.coords.latitude,lng:p.coords.longitude});if(alive.current)setStatus("Localização consultada. Você pode escolher outra cidade.");track("location_result",{result:"granted"});}catch{if(alive.current)setStatus("Não conseguimos centralizar o mapa. Escolha uma cidade.");}finally{if(alive.current)setPending(false);}},()=>{if(!alive.current)return;setPending(false);setStatus("Não conseguimos usar sua localização. Escolha a cidade manualmente.");track("location_result",{result:"unavailable"});},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 }}><LocateFixed size={compact?15:18} aria-hidden/>{pending?"Localizando…":"Usar minha localização"}</button><p role="status" className="mt-1 text-xs text-muted empty:hidden">{status}</p>{!compact&&<p className="mt-2 text-xs text-muted">Só para centralizar o mapa neste aparelho. Você escolhe quando compartilhar presença.</p>}</div>;
}
