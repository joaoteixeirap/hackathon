// Resumable sequential municipal import, with cache and throttle; never a statewide Overpass query.
import { spawnSync } from "node:child_process";
import { mkdirSync,readFileSync,writeFileSync,existsSync } from "node:fs";
const catalogue=JSON.parse(readFileSync("src/data/sp-cities.json","utf8"));
const args=process.argv.slice(2),all=args.includes("--all");
const slugs=args.filter(a=>!a.startsWith("--"));
if(!all&&!slugs.length){console.error("Use pnpm import:sp santos sao-paulo campinas, or --all to resume all municipalities.");process.exit(1);}
const cities=all?catalogue.cities.map(c=>c.slug):slugs;
if(cities.some(s=>!catalogue.cities.some(c=>c.slug===s))){console.error("Unknown SP city slug");process.exit(1);}
mkdirSync(".cache",{recursive:true});const path=".cache/sp-import-progress.json";
const state=existsSync(path)?JSON.parse(readFileSync(path,"utf8")):{};
const limit=Number(args.find(a=>a.startsWith("--limit="))?.split("=")[1]??cities.length);
if(!Number.isInteger(limit)||limit<1)throw new Error("Invalid limit");
let attempted=0;
for(const slug of cities){
 if(!args.includes("--refresh")&&state[slug]?.ok)continue;if(attempted>=limit)break;
 if(attempted)await new Promise(r=>setTimeout(r,15000));attempted++;
 const r=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","scripts/import-osm.ts",slug,...(args.includes("--refresh")?["--refresh"]:[])],{stdio:"inherit"});
 state[slug]={ok:r.status===0,checked_at:new Date().toISOString()};writeFileSync(path,JSON.stringify(state,null,2));
 if(r.status!==0){console.error(`Stopped at ${slug}; rerun to resume.`);process.exit(1);}
}
console.log(`Batch complete: ${attempted} imports. Progress: ${path}`);
