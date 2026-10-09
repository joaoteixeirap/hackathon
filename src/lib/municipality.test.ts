import {expect,test} from "vitest";
import {inMunicipality,type MunicipalGeometry} from "./municipality";
test("municipal assignment respects polygon holes and separated islands",()=>{const g:MunicipalGeometry={type:"MultiPolygon",coordinates:[[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]],[[[20,20],[22,20],[22,22],[20,22],[20,20]]]]};expect(inMunicipality({lat:1,lng:1},g)).toBe(true);expect(inMunicipality({lat:5,lng:5},g)).toBe(false);expect(inMunicipality({lat:21,lng:21},g)).toBe(true);expect(inMunicipality({lat:15,lng:15},g)).toBe(false);});
