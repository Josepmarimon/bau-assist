'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type LoginResult = { ok: true } | { ok: false; error: string }

export async function requestMagicLink(formData: FormData): Promise<LoginResult> {
  const rawEmail = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return { ok: false, error: 'Introdueix un correu electrònic vàlid.' }
  }

  const supabase = await createClient()

  const { data: allowed, error: allowlistError } = await supabase.rpc(
    'is_email_in_tfg_allowlist',
    { p_email: rawEmail }
  )

  if (allowlistError) {
    return { ok: false, error: 'No hem pogut verificar el teu accés. Torna-ho a provar.' }
  }

  if (!allowed) {
    return {
      ok: false,
      error:
        'Aquest correu no està autoritzat. Si creus que hi ha un error, contacta amb el coordinador del TFG.',
    }
  }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: rawEmail,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/tfg`,
      shouldCreateUser: true,
    },
  })

  if (otpError) {
    return { ok: false, error: otpError.message }
  }

  return { ok: true }
}
