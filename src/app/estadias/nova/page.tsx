import { PageShell } from "@/components/ui/PageShell";
import { card } from "@/components/ui/styles";
import { PlanForm } from "@/components/stay/PlanForm";
import { listMapCities } from "@/lib/cities";
export const dynamic="force-dynamic";
export const metadata={title:"Planejar estadia · SoloRota"};
export default async function NewPlan({searchParams}:{searchParams:Promise<{city?:string}>}){
 const {city}=await searchParams,cities=(await listMapCities()).filter((c):c is typeof c & {id:string}=>Boolean(c.id));
 return <PageShell title="Planejar minha próxima estadia"><p className="mb-5 text-sm text-muted">Comece com uma possibilidade. As datas e necessidades podem mudar; confirmar chegada é outra etapa.</p><div className={`${card} p-5`}>{cities.length?<PlanForm cities={cities} defaultCityId={cities.find(c=>c.slug===city)?.id}/>:<p>Planejamento indisponível no momento. Tente de novo.</p>}</div></PageShell>;
}
