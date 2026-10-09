import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui/PageShell";
import { PlanForm } from "@/components/stay/PlanForm";
import { card } from "@/components/ui/styles";
import { listMapCities } from "@/lib/cities";
import { getUser } from "@/lib/auth";
import { getDestinationPlan } from "@/lib/destinationData";
import { UUID } from "@/lib/destinations";
export const dynamic="force-dynamic";
export default async function EditPlan({params}:{params:Promise<{id:string}>}){
 const {id}=await params,u=await getUser();if(!u||!UUID.test(id))notFound();const p=await getDestinationPlan(id,u.id);if(!p||p.status==="arrived")notFound();
 const cities=(await listMapCities()).filter((c):c is typeof c & {id:string}=>Boolean(c.id));
 return <PageShell title={`Editar estadia em ${p.city.name}`}><div className={`${card} p-5`}><PlanForm cities={cities} initial={p}/></div></PageShell>;
}
