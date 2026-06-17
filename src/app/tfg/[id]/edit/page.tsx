import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { TfgEditForm } from '@/components/tfg/tfg-edit-form'
import type { TfgSubmission } from '@/lib/tfg/types'

export default async function EditTfgPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/tfg/login')

  const { data: submission, error } = await supabase
    .from('tfg_submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !submission) notFound()

  const { data: tribunals } = await supabase
    .from('tfg_tribunals')
    .select('id, name, itinerari, display_order')
    .eq('active', true)
    .order('display_order', { ascending: true })

  return (
    <TfgEditForm
      submission={submission as TfgSubmission}
      tribunals={tribunals ?? []}
      userId={user.id}
    />
  )
}
