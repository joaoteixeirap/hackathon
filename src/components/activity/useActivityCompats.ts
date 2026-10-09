"use client";
import { useEffect,useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { ActivityCompat } from "@/lib/activityCompat";
export function useActivityCompats(ids:string[]) {
  const key=[...new Set(ids)].slice(0,300).sort().join(",");
  const [authVersion,setAuthVersion]=useState(0);
  const [counts,setCounts]=useState<Record<string,ActivityCompat|null>>({});
  useEffect(()=>{
    if(!isSupabaseConfigured())return;
    const {data}=createClient().auth.onAuthStateChange(()=>{setCounts({});setAuthVersion(v=>v+1);});
    return ()=>data.subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    setCounts({});if(!key||!isSupabaseConfigured())return;
    let alive=true;
    void createClient().rpc("activity_compats",{p_activity_ids:key.split(",")}).then(({data,error})=>{
      if(alive&&!error)setCounts(data??{});
    });
    return ()=>{alive=false;};
  },[key,authVersion]);
  return counts;
}
