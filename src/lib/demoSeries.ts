// Demo weekly series (SPEC_V2 §11, adapted to Santos): two community series and the
// official welcome meetup (S5). All is_demo and labeled "(Demo)".
const CITY = "00000000-0000-4000-8000-000000000001";

export const DEMO_SERIES = [
  {
    id: "00000000-0000-4000-8000-0000000000e1",
    city_id: CITY,
    creator_id: "00000000-0000-4000-8000-0000000000a4", // Admin (Demo)
    title: "Boas-vindas aos nômades (Demo)",
    description: "Encontro semanal para quem acabou de chegar: apresentações rápidas, dicas da cidade e combinados da semana.",
    category: "meetup",
    weekday: 4,
    start_time: "18:30",
    duration_min: 90,
    meeting_lat: -23.9668,
    meeting_lng: -46.3329,
    meeting_label: "Praça da Independência, Gonzaga",
    capacity: 12,
    is_official: true,
    is_demo: true,
  },
  {
    id: "00000000-0000-4000-8000-0000000000e2",
    city_id: CITY,
    creator_id: "00000000-0000-4000-8000-0000000000a1", // Ana (Demo)
    place_id: "00000000-0000-4000-8000-0000000000c1",
    title: "Dia de trabalho conjunto semanal (Demo)",
    description: "Toda quinta à tarde no coworking, foco e uma pausa juntos às 16h.",
    category: "work_together",
    weekday: 4,
    start_time: "14:00",
    duration_min: 240,
    meeting_lat: -23.9655,
    meeting_lng: -46.3338,
    meeting_label: "Cowork Demo Gonzaga",
    capacity: 6,
    is_official: false,
    is_demo: true,
  },
  {
    id: "00000000-0000-4000-8000-0000000000e3",
    city_id: CITY,
    creator_id: "00000000-0000-4000-8000-0000000000a2", // Bruno (Demo)
    title: "Corrida na orla (Demo)",
    description: "5 km leves pela ciclovia da praia, ritmo de conversa.",
    category: "outdoor",
    weekday: 6,
    start_time: "07:00",
    duration_min: 60,
    meeting_lat: -23.9705,
    meeting_lng: -46.3389,
    meeting_label: "Canal 2, calçadão da praia",
    capacity: 10,
    is_official: false,
    is_demo: true,
  },
] as const;
