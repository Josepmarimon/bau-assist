'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ITINERARIS } from '@/lib/tfg/constants'

export async function createTribunal(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const itinerariRaw = String(formData.get('itinerari') ?? '').trim()
  const itinerari = (ITINERARIS as readonly string[]).includes(itinerariRaw)
    ? itinerariRaw
    : null
  const display_order = Number(formData.get('display_order') ?? 0) || 0

  if (!name) return { ok: false as const, error: 'El nom és obligatori.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tfg_tribunals').insert({
    name,
    itinerari,
    display_order,
  })

  if (error) return { ok: false as const, error: error.message }

  revalidatePath('/tfg/admin/tribunals')
  return { ok: true as const }
}

export async function updateTribunal(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const itinerariRaw = String(formData.get('itinerari') ?? '').trim()
  const itinerari = (ITINERARIS as readonly string[]).includes(itinerariRaw)
    ? itinerariRaw
    : null
  const display_order = Number(formData.get('display_order') ?? 0) || 0
  const active = formData.get('active') === 'on' || formData.get('active') === 'true'

  if (!id || !name) return { ok: false as const, error: 'Falten dades.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tfg_tribunals')
    .update({ name, itinerari, display_order, active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { ok: false as const, error: error.message }

  revalidatePath('/tfg/admin/tribunals')
  return { ok: true as const }
}

export async function deleteTribunal(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tfg_tribunals').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/tfg/admin/tribunals')
}
