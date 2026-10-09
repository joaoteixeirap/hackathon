import { NextResponse, type NextRequest } from "next/server";
import { PLACE_COLUMNS, toPlaceSummary } from "@/lib/mapData";
import { createPublicClient } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { eventWindow, parseBounds, type EventPeriod } from "@/lib/stateMap";
import { clientKey, createLimiter } from "@/lib/rateLimit";
import type { ActivitySummary } from "@/lib/places";
const limiter=createLimiter({requests:60,bytes:Infinity});
const PLACE_LIMIT=750,ACTIVITY_LIMIT=200;
export async function GET(req:NextRequest){
 if(!limiter.take(clientKey(req.headers),0))return NextResponse.json({message:"Aguarde um instante para buscar novamente."},{status:429});
 const q=req.nextUrl.searchParams,b=parseBounds(q.get("bbox")),period=q.get("period")??"upcoming";
 if(!b||!["now","today","week","custom","upcoming"].includes(period))return NextResponse.json({message:"Área ou período inválido."},{status:400});
 const window=eventWindow(period as EventPeriod,q.get("from")??"",q.get("to")??"");
 if(!window)return NextResponse.json({message:"Escolha um intervalo válido de até um ano."},{status:400});
 if(!isSupabaseConfigured())return NextResponse.json({places:[],activities:[],truncated:false,unavailable:true});
 const db=createPublicClient();
 const category=q.get("category"),sub=q.get("sub");
 let placeQuery=db.from("places").select(`${PLACE_COLUMNS},cities!inner(state)`,{count:"exact"}).eq("cities.state","SP").gte("lng",b[0]).lte("lng",b[2]).gte("lat",b[1]).lte("lat",b[3]);
 if(category&&["work","eat","health","stay","tour","service"].includes(category))placeQuery=placeQuery.eq("category",category);
 if(sub&&/^[a-z_]{1,32}$/.test(sub))placeQuery=placeQuery.eq("subcategory",sub);
 if(q.get("wifi")==="1")placeQuery=placeQuery.gte("wifi_mbps",25);
 if(q.get("calls")==="1")placeQuery=placeQuery.gt("call_ready_valid_until",new Date().toISOString());
 if(q.get("seal")==="1")placeQuery=placeQuery.gt("seal_valid_until",new Date().toISOString());
 const [ps,as]=await Promise.all([
  category==="activities"?Promise.resolve({data:[],count:0,error:null}):placeQuery.order("id").limit(PLACE_LIMIT),
  db.from("activities").select("id,title,category,starts_at,ends_at,meeting_lat,meeting_lng,meeting_label,capacity,status,is_demo,series_id,activity_series(weekday,start_time,is_official),cities!inner(state)",{count:"exact"}).eq("cities.state","SP").in("status",["open","full"]).gte("meeting_lng",b[0]).lte("meeting_lng",b[2]).gte("meeting_lat",b[1]).lte("meeting_lat",b[3]).gt("ends_at",window.from).filter("starts_at",period==="now"?"lte":"lt",window.to).order("starts_at").limit(ACTIVITY_LIMIT),
 ]);
 if(ps.error||as.error)return NextResponse.json({message:"Não foi possível carregar esta área. Tente de novo."},{status:503});
 const rows=ps.data??[],ids=rows.map(p=>p.id);
 const counts=new Map<string,number>();
 if(ids.length){const batches=Array.from({length:Math.ceil(ids.length/100)},(_,i)=>ids.slice(i*100,i*100+100));const responses=await Promise.all(batches.map(batch=>db.from("offers").select("place_id").in("place_id",batch).limit(1000)));if(responses.some(r=>r.error))return NextResponse.json({message:"Não foi possível carregar as ofertas."},{status:503});for(const res of responses)for(const o of res.data??[])counts.set(o.place_id,(counts.get(o.place_id)??0)+1);}
 const places=rows.map(({cities:_cities,...p})=>{void _cities;return toPlaceSummary(p as Parameters<typeof toPlaceSummary>[0],counts.get(p.id)??0);});
 type Row={id:string;title:string;category:ActivitySummary["category"];starts_at:string;ends_at:string;meeting_lat:number;meeting_lng:number;meeting_label:string|null;capacity:number;status:"open"|"full";is_demo:boolean;series_id:string|null;activity_series:{weekday:number;start_time:string;is_official:boolean}|null};
 const activities=((as.data??[]) as unknown as Row[]).map(a=>({id:a.id,title:a.title,category:a.category,starts_at:a.starts_at,ends_at:a.ends_at,lat:a.meeting_lat,lng:a.meeting_lng,meeting_label:a.meeting_label,capacity:a.capacity,status:a.status,is_demo:a.is_demo,series:a.series_id&&a.activity_series ? {id:a.series_id,...a.activity_series,start_time:a.activity_series.start_time.slice(0,5)}:null}));
 return NextResponse.json({places,activities,truncated:(ps.count??0)>PLACE_LIMIT||(as.count??0)>ACTIVITY_LIMIT,unavailable:false,counts:{places:ps.count,activities:as.count},window},{headers:{"Cache-Control":"public, max-age=20, s-maxage=30"}});
}
