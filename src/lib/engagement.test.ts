import { expect,it } from "vitest";
import { surveyResults,usageCounts,engagementFunnels } from "./engagement";
it("deduplicates device events and requires three distinct completed tasks",()=>{
 const e=(name:string,props={})=>({name,props:{sid:"a",...props}});
 const rows=[e("view_radar"),e("view_radar"),e("open_place",{source:"map"}),e("open_place",{source:"radar"}),e("stay_task_toggle",{task_id:"1",done:"true"}),e("stay_task_toggle",{task_id:"1",done:"true"}),e("stay_task_toggle",{task_id:"2",done:"true"})];
 expect(usageCounts(rows).work.map(s=>s.n).slice(0,2)).toEqual([1,1]);
 expect(usageCounts(rows).week[1].n).toBe(0);
 rows.push(e("stay_task_toggle",{task_id:"3",done:"true"}));expect(usageCounts(rows).week[1].n).toBe(1);
});
it("funnels require the same device and events in order",()=>{
 const e=(name:string,sid="a",props={})=>({name,props:{sid,...props}});
 const f=engagementFunnels([e("checkin_submit"),e("view_radar"),e("open_place","a",{source:"map"}),e("open_place","a",{source:"radar"}),e("checkin_start","b"),e("checkin_start"),e("checkin_submit"),e("checkin_submit")]);
 expect(f.work.map(s=>s.n)).toEqual([1,1,1,1]);
 expect(engagementFunnels([e("checkin_submit")]).work.map(s=>s.n)).toEqual([0,0,0,0]);
});
it("reports survey sample size and excludes invalid answers and duplicates",()=>{
 const r=surveyResults([{question_key:"q_pain",answer_key:"wifi",session_id:"a"},{question_key:"q_pain",answer_key:"wifi",session_id:"a"},{question_key:"q_pain",answer_key:"bad",session_id:"b"}])[0];
 expect(r.n).toBe(1);expect(r.small).toBe(true);expect(r.options[0].fraction).toBe(1);expect(surveyResults([])[0].n).toBe(0);
});
