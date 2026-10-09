import { expect,it } from "vitest";
import { cityStatistics } from "./cityStats";
it("returns honest empty statistics and derives freshness, medians and active seals",()=>{
 expect(cityStatistics([],0)).toMatchObject({work:0,median:null,verified:0,seals:0,activities:0,demo:0});
 const now=Date.parse("2026-10-09T12:00:00Z");
 const p={category:"work",subcategory:"coworking",wifi_mbps:50,wifi_source:"user_test",last_verified_at:new Date(now-2*86400000).toISOString(),distinct_users_90d:2,seal_valid_until:new Date(now+20*86400000).toISOString(),facts_meta:{wifi:{source:"user" as const,observed_at:new Date(now-2*86400000).toISOString(),confirmations_90d:2,outdated_30d:0}},opening_hours:null,is_demo:true};
 expect(cityStatistics([p],1,now).median).toBeNull();
 expect(cityStatistics([p,{...p,wifi_mbps:100}],1,now)).toMatchObject({work:2,median:75,seals:2,fresh:{fresh:2,aging:0,stale:0,unknown:0},demo:2});
});
it("counts emergency-tagged care separately from pharmacy and excludes demo providers",()=>{
 const p={category:"health",subcategory:"hospital",wifi_mbps:null,wifi_source:null,last_verified_at:null,distinct_users_90d:0,seal_valid_until:null,facts_meta:{},opening_hours:null,is_demo:false,emergency_fact:{value:true,source:"osm" as const,observed_at:"2026-10-09",confirmations_90d:0,outdated_30d:0}};
 expect(cityStatistics([p,{...p,is_demo:true},{...p,subcategory:"pharmacy"},{...p,emergency_fact:{...p.emergency_fact,value:false}}],0)).toMatchObject({emergency:1,pharmacies:1});
});
