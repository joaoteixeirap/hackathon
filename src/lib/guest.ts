// Routes that need a Supabase user. With the login screen postponed (hackathon mode),
// visitors get an anonymous session here instead of being sent to /entrar.
export const GUEST_SESSION_PATHS = ["/perfil", "/atividade/nova", "/parceiro", "/verificar"];

export function needsGuestSession(pathname: string): boolean {
  return GUEST_SESSION_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
