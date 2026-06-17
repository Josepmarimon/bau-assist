'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { TfgEditableFields } from './types'

export type ActionResult = { ok: true } | { ok: false; error: string }

export async function createDraft(): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/tfg/login')
  }

  const { data, error } = await supabase
    .from('tfg_submissions')
    .insert({
      user_id: user.id,
      correu_electrponic: user.email ?? null,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`No s'ha pogut crear l'esborrany: ${error?.message ?? 'unknown'}`)
  }

  redirect(`/tfg/${data.id}/edit`)
}

// Auto-save d'un subconjunt de camps. No valida camps obligatoris (això es fa al submit).
export async function saveDraftFields(
  id: string,
  patch: Partial<TfgEditableFields>
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tfg_submissions')
    .update(patch)
    .eq('id', id)
    // L'RLS ja restringeix a l'usuari + draft; aquest filtre és redundant però explícit.
    .eq('status', 'draft')

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

export async function submitTfg(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tfg_submissions')
    .update({ status: 'submitted' })
    .eq('id', id)
    .eq('status', 'draft')

  if (error) {
    // El check constraint de SQL retorna un error si falten camps obligatoris.
    return { ok: false, error: error.message }
  }

  revalidatePath('/tfg')
  return { ok: true }
}

export async function deleteDraft(id: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tfg_submissions')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')

  if (error) {
    throw new Error(`No s'ha pogut esborrar l'esborrany: ${error.message}`)
  }

  revalidatePath('/tfg')
  redirect('/tfg')
}
