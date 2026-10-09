import { expect, it } from "vitest";
import { budgetSummary } from "./budget";
it("calculates only recorded expenses to date and a prorated monthly budget", () => {
  const stay={arrive_on:"2026-10-01",leave_on:"2026-11-30"};
  const e=[{id:"a",category:"food" as const,amount_cents:10000,spent_on:"2026-10-02",note:null},{id:"b",category:"food" as const,amount_cents:50000,spent_on:"2026-10-20",note:null}];
  expect(budgetSummary(stay,e,300000,"2026-10-10")).toMatchObject({total:10000,lived:10,daily:1000,proportional:100000,fraction:0.1});
  expect(budgetSummary(stay,e,null,"2026-09-30")).toMatchObject({total:0,lived:0,daily:null,proportional:null,fraction:null});
});
