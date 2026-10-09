import { redirect } from "next/navigation";
import { listMapCities,getCity } from "@/lib/cities";
import { getUser } from "@/lib/auth";
import { getActiveStay } from "@/lib/stayData";
import { PageShell } from "@/components/ui/PageShell";
import { StartingCity } from "@/components/map/StartingCity";
import { todayInBrasilia } from "@/lib/offers";

export default async function Home() {
 const user=await getUser(),stay=user?await getActiveStay(user.id):null,today=todayInBrasilia();
 if(stay&&stay.arrive_on<=today&&stay.leave_on>=today){const c=await getCity(stay.city.slug);redirect(c?.state==="SP"?`/mapa/sp?city=${stay.city.slug}`:`/mapa/${stay.city.slug}`);}
 return <PageShell title="Sua próxima cidade começa aqui"><StartingCity cities={await listMapCities()}/></PageShell>;
}
