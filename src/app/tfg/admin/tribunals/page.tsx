import { createClient } from '@/lib/supabase/server'
import { TribunalsManager } from './tribunals-manager'

export default async function AdminTribunalsPage() {
  const supabase = await createClient()

  const { data: tribunals } = await supabase
    .from('tfg_tribunals')
    .select('id, name, itinerari, display_order, active')
    .order('display_order', { ascending: true })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <TribunalsManager initialTribunals={tribunals ?? []} />
    </div>
  )
}
