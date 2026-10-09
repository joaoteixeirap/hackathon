import {expect,test} from "vitest";
import {decisionEvidence,type DecisionPlace} from "./cityDecision";
test("city decision does not treat Demo, declared wifi or stale single-user tests as city internet evidence",()=>{
 const now=Date.parse("2026-10-09T12:00:00Z"),base={category:"work",subcategory:"coworking",wifi_source:"user_test",wifi_mbps:50,distinct_users_90d:2,last_verified_at:"2026-10-09T11:00:00Z",is_demo:false,neighborhood:null} as DecisionPlace;
 const rows=[base,{...base,wifi_mbps:100},{...base,is_demo:true,wifi_mbps:999},{...base,wifi_source:"partner",wifi_mbps:999},{...base,distinct_users_90d:1},{...base,last_verified_at:"2025-01-01T00:00:00Z"}];expect(decisionEvidence(rows,now).median).toBe(75);expect(decisionEvidence([base],now).median).toBeNull();expect(decisionEvidence(rows,now).measured).toHaveLength(2);
});
