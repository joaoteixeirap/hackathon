export const COMMUNITY_TOPICS={
 remote_work:{title:"Trabalho remoto e cafés",description:"Troque medições de internet e combine sessões de trabalho."},
 arrival:{title:"Chegando na cidade",description:"Conheça outros nômades e organize encontros de boas-vindas."},
 housing:{title:"Moradia por temporada",description:"Troque referências e perguntas sobre estadias mais longas."},
 families:{title:"Nômades com filhos",description:"Converse sobre escolas, rotina em família e serviços locais."},
 outdoor:{title:"Trilhas e ao ar livre",description:"Combine passeios e pausas depois do trabalho."},
 culture:{title:"Cultura, música e encontros",description:"Encontre companhia para explorar a cidade."},
} as const;
export type CommunityTopic=keyof typeof COMMUNITY_TOPICS;
export type CommunityCount={id:string;topic:CommunityTopic;members:number};
export type CommunityMessage={id:string;community_id:string;user_id:string;body:string;created_at:string;author:string};
export type CommunityGroup={id:string;topic:CommunityTopic;city:{slug:string;name:string};muted:boolean;last_read_at:string;unread:number;latest:CommunityMessage|null};
