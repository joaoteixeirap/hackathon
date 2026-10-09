"use client";
import { inMunicipality,type MunicipalGeometry } from "./municipality";
import { nearestCity,type CityPoint } from "./stateMap";
type Shape={properties:{codarea:string};geometry:MunicipalGeometry};
let geometries:Promise<Shape[]>|null=null;
/** All containment checks happen in the browser against a static public IBGE file. */
export async function locateCity(point:{lat:number;lng:number},cities:(CityPoint&{ibge_code?:string|null})[]):Promise<CityPoint|null>{
 try{
  geometries??=fetch("/data/sp-municipalities.geojson",{signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw new Error("Catalogue unavailable");return (await r.json()).features as Shape[];});
  const feature=(await geometries).find(f=>inMunicipality(point,f.geometry));
  if(!feature)return null;
  return cities.find(c=>c.ibge_code===String(feature.properties.codarea))??nearestCity(point,cities);
 }catch{geometries=null;return nearestCity(point,cities);}
}
