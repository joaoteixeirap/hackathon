import type { BBox } from "./geo";
import { haversine, isInsideBBox } from "./geo";
import type { ActivitySummary } from "./places";
export const SP_BOUNDS:BBox=[-53.2,-25.4,-44.1,-19.7];
export type EventPeriod="upcoming"|"now"|"today"|"week"|"custom";
export function eventWindow(period:EventPeriod,from="",to="",now=new Date()):{from:string;to:string}|null {
 const today=now.toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
 if(period==="custom"){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||to<from||Date.parse(to)-Date.parse(from)>366*86400000)return null;
  const start=new Date(`${from}T00:00:00-03:00`),end=new Date(`${to}T00:00:00-03:00`);
  if(Number.isNaN(+start)||Number.isNaN(+end)||start.toISOString().slice(0,10)!==from||end.toISOString().slice(0,10)!==to)return null;
  return {from:start.toISOString(),to:new Date(+end+86400000).toISOString()};
 }
 if(period==="now")return {from:now.toISOString(),to:now.toISOString()};
 if(period==="today")return {from:new Date(`${today}T00:00:00-03:00`).toISOString(),to:new Date(Date.parse(`${today}T00:00:00-03:00`)+86400000).toISOString()};
 return {from:now.toISOString(),to:new Date(+now+(period==="week"?7:90)*86400000).toISOString()};
}
export function eventsInWindow(events:ActivitySummary[],window:{from:string;to:string}):ActivitySummary[]{
 return events.filter(a=>Date.parse(a.ends_at)>Date.parse(window.from)&&(window.from===window.to?Date.parse(a.starts_at)<=Date.parse(window.to):Date.parse(a.starts_at)<Date.parse(window.to)));
}
export function parseBounds(raw:string|null):BBox|null {
 const ns=(raw??"").split(",").map(Number);
 if(ns.length!==4||!ns.every(Number.isFinite)||ns[0]>=ns[2]||ns[1]>=ns[3])return null;
 const b:BBox=[Math.max(SP_BOUNDS[0],ns[0]),Math.max(SP_BOUNDS[1],ns[1]),Math.min(SP_BOUNDS[2],ns[2]),Math.min(SP_BOUNDS[3],ns[3])];
 return b[0]<b[2]&&b[1]<b[3]?b:null;
}
export type CityPoint={slug:string;name:string;state:string;center_lat:number;center_lng:number};
export function nearestCity(point:{lat:number;lng:number},cities:CityPoint[]):CityPoint|null{
 if(!isInsideBBox(point,SP_BOUNDS))return null;
 return [...cities].filter(c=>c.state==="SP").sort((a,b)=>haversine(point,{lat:a.center_lat,lng:a.center_lng})-haversine(point,{lat:b.center_lat,lng:b.center_lng}))[0]??null;
}
