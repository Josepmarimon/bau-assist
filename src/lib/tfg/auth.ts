import type { createClient as createServerClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Truca a la funció Postgres is_tfg_admin() que mira user_profiles.role
// (i, com a fallback, raw_user_meta_data->>'role').
export async function isTfgAdmin(supabase: ServerClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_tfg_admin')
  if (error) return false
  return Boolean(data)
}
