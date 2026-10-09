"use client";
import { useEffect } from "react";
import { track } from "@/lib/track";
import type { EventName,EventProps } from "@/lib/analytics";
export function TrackView({name,props}:{name:EventName;props:EventProps}) {
 const serialized=JSON.stringify(props);
 useEffect(()=>track(name,JSON.parse(serialized)),[name,serialized]);return null;
}
