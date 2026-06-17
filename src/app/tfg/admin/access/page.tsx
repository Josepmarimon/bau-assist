import { createClient } from '@/lib/supabase/server'
import { AccessManager } from './access-manager'

export default async function AdminAccessPage() {
  const supabase = await createClient()
  const { data: emails } = await supabase
    .from('tfg_allowed_emails')
    .select('id, email, full_name, itinerari, tutor, notes, created_at')
    .order('email', { ascending: true })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <AccessManager emails={emails ?? []} />
    </div>
  )
}
