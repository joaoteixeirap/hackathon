import { expect,test } from "vitest";
import { emergencyFact,offersEmergencyOr24h } from "./essentialServices";
test("emergency and 24/7 qualify separately; missing hours remain missing",()=>{
  const p={subcategory:"hospital",opening_hours:null,emergency_fact:{source:"osm",value:true,observed_at:"2026-10-09"}};
  expect(offersEmergencyOr24h(p)).toBe(true);expect(p.opening_hours).toBeNull();
  expect(offersEmergencyOr24h({...p,emergency_fact:{source:"osm",value:false}})).toBe(false);
  expect(offersEmergencyOr24h({...p,emergency_fact:null,opening_hours:"24/7"})).toBe(true);
  expect(offersEmergencyOr24h({...p,subcategory:"pharmacy"})).toBe(false);
  expect(emergencyFact({source:"user",value:true})).toBeNull();
  expect(emergencyFact("yes")).toBeNull();
});
