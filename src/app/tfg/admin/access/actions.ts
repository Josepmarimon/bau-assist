'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Row = {
  email: string
  full_name?: string | null
  itinerari?: string | null
  tutor?: string | null
  notes?: string | null
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function importAllowedEmails(formData: FormData) {
  const raw = String(formData.get('rows') ?? '').trim()
  if (!raw) return { ok: false as const, error: 'No has introduït cap dada.' }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows: Row[] = []
  const errors: string[] = []

  for (const line of lines) {
    // Skip header
    if (line.toLowerCase().startsWith('email,')) continue

    const parts = line.split(',').map((p) => p.trim())
    const email = parts[0]?.toLowerCase()
    if (!email) continue

    if (!EMAIL_RX.test(email)) {
      errors.push(`Email no vàlid: ${email}`)
      continue
    }

    rows.push({
      email,
      full_name: parts[1] || null,
      itinerari: parts[2] || null,
      tutor: parts[3] || null,
      notes: parts[4] || null,
    })
  }

  if (rows.length === 0) {
    return {
      ok: false as const,
      error: 'No s\'ha pogut interpretar cap email vàlid. ' + (errors[0] ?? ''),
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tfg_allowed_emails')
    .upsert(rows, { onConflict: 'email', ignoreDuplicates: false })

  if (error) return { ok: false as const, error: error.message }

  revalidatePath('/tfg/admin/access')
  return {
    ok: true as const,
    inserted: rows.length,
    skipped: errors,
  }
}

export async function deleteAllowedEmail(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tfg_allowed_emails').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/tfg/admin/access')
}
