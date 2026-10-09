import { expect,test } from "vitest";
import { activityCompatLines } from "./activityCompat";
test("compatibility never displays counts that could single out a participant",()=>{
  expect(activityCompatLines(null)).toEqual([]);
  expect(activityCompatLines({same_rhythm:1,overlap:1})).toEqual([]);
  expect(activityCompatLines({same_rhythm:2,overlap:1})).toEqual(["2 pessoas com a mesma rotina que você"]);
  expect(activityCompatLines({same_rhythm:0,overlap:3})).toEqual(["3 estarão na cidade nas suas datas"]);
});
