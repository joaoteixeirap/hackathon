/** IBGE simplified geometry. Used locally for municipality assignment, never user tracking. */
export type MunicipalGeometry={type:"Polygon"|"MultiPolygon";coordinates:number[][][]|number[][][][]};
function inRing(lng:number,lat:number,ring:number[][]):boolean{
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(((a[1]>lat)!==(b[1]>lat))&&(lng<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
 }
 return inside;
}
export function inMunicipality(point:{lat:number;lng:number},geometry:MunicipalGeometry):boolean{
 const polygons=geometry.type==="Polygon"?[geometry.coordinates as number[][][]]:geometry.coordinates as number[][][][];
 return polygons.some(rings=>inRing(point.lng,point.lat,rings[0])&&!rings.slice(1).some(r=>inRing(point.lng,point.lat,r)));
}
