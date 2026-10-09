import {expect,test} from "vitest";
import {eventWindow,parseBounds,eventsInWindow,nearestCity} from "./stateMap";
import type { ActivitySummary } from "./places";
import catalogue from "@/data/sp-cities.json";
test("IBGE SP catalogue is complete, unique, and keeps centres inside real bboxes",()=>{expect(catalogue.cities.length).toBe(645);expect(new Set(catalogue.cities.map(c=>c.slug)).size).toBe(645);for(const c of catalogue.cities){expect(c.ibge_code).toMatch(/^35\d{5}$/);expect(c.center_lng).toBeGreaterThanOrEqual(c.bbox[0]);expect(c.center_lat).toBeLessThanOrEqual(c.bbox[3]);}});
test("today uses Brazilian midnight even when UTC is on the following day",()=>{const w=eventWindow("today","","",new Date("2026-10-10T01:00:00Z"));expect(w).toEqual({from:"2026-10-09T03:00:00.000Z",to:"2026-10-10T03:00:00.000Z"});});
test("custom includes the last local day and rejects reversed/invalid/unbounded intervals",()=>{expect(eventWindow("custom","2026-10-09","2026-10-10")).toEqual({from:"2026-10-09T03:00:00.000Z",to:"2026-10-11T03:00:00.000Z"});expect(eventWindow("custom","2026-02-30","2026-03-01")).toBeNull();expect(eventWindow("custom","2026-10-10","2026-10-09")).toBeNull();});
test("in-progress events overlap the window even when their start is earlier",()=>{const a={starts_at:"2026-10-09T09:00:00Z",ends_at:"2026-10-09T17:00:00Z"} as ActivitySummary;expect(eventsInWindow([a],{from:"2026-10-09T12:00:00Z",to:"2026-10-09T12:00:00Z"})).toEqual([a]);});
test("bounds are clamped to SP and malformed/outside bounds rejected",()=>{expect(parseBounds("-90,-50,0,0")).toEqual([-53.2,-25.4,-44.1,-19.7]);for(const s of [null,"NaN,0,0,0","-46,-23,-47,-22","1,1,2,2"])expect(parseBounds(s)).toBeNull();expect(nearestCity({lat:45,lng:10},catalogue.cities)).toBeNull();});
