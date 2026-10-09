/** Whether the Supabase project allows anonymous sign-ins (Authentication → Sign In / Providers). */
export async function anonymousSignInsEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  const json = (await res.json()) as { external?: { anonymous_users?: boolean } };
  return json.external?.anonymous_users === true;
}
