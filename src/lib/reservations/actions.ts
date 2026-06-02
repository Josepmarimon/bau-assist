'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CreateReservationInput } from './types'

export type ActionResult = { ok: true } | { ok: false; error: string }

async function isSpaceAdmin(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_space_admin')
  if (error) return false
  return Boolean(data)
}

/** Un professor (usuari autenticat) sol·licita una reserva sobre franges lliures. */
export async function createReservation(input: CreateReservationInput): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'Cal iniciar sessió per fer una reserva.' }
  }

  const title = input.title?.trim()
  if (!title) {
    return { ok: false, error: "Cal indicar el títol de l'activitat." }
  }
  const weeks = Array.from(new Set(input.weeks ?? [])).filter((w) => w >= 1 && w <= 15)
  if (weeks.length === 0) {
    return { ok: false, error: 'Cal seleccionar com a mínim una setmana.' }
  }

  // Re-verificació de disponibilitat (evita reservar una franja que s'acaba d'ocupar)
  const { data: busy } = await supabase.rpc('space_slot_busy_weeks', {
    p_classroom_id: input.classroomId,
    p_time_slot_id: input.timeSlotId,
    p_semester_id: input.semesterId,
    p_exclude_reservation_id: null,
  })
  const busySet = new Set((busy as number[] | null) ?? [])
  const collision = weeks.filter((w) => busySet.has(w))
  if (collision.length > 0) {
    return {
      ok: false,
      error: `Algunes setmanes ja estan ocupades (${collision.join(', ')}). Refresca i torna-ho a provar.`,
    }
  }

  const { data: reservation, error: insertError } = await supabase
    .from('space_reservations')
    .insert({
      classroom_id: input.classroomId,
      time_slot_id: input.timeSlotId,
      semester_id: input.semesterId,
      requested_by: user.id,
      requester_email: user.email ?? null,
      title,
      description: input.description?.trim() || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !reservation) {
    return { ok: false, error: insertError?.message ?? 'No s\'ha pogut crear la reserva.' }
  }

  const { error: weeksError } = await supabase
    .from('space_reservation_weeks')
    .insert(weeks.map((week_number) => ({ reservation_id: reservation.id, week_number })))

  if (weeksError) {
    // Revertim la reserva si no s'han pogut desar les setmanes
    await supabase.from('space_reservations').delete().eq('id', reservation.id)
    return { ok: false, error: weeksError.message }
  }

  revalidatePath('/reserves')
  revalidatePath('/reserves/admin')
  return { ok: true }
}

/** El sol·licitant cancel·la una reserva seva mentre està pendent. */
export async function cancelReservation(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('space_reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }

  revalidatePath('/reserves')
  revalidatePath('/reserves/admin')
  return { ok: true }
}

/** Administració aprova una reserva (re-verificant que no hi hagi col·lisió). */
export async function approveReservation(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  if (!(await isSpaceAdmin(supabase))) {
    return { ok: false, error: 'Només administració pot aprovar reserves.' }
  }

  const { data: reservation, error: loadError } = await supabase
    .from('space_reservations')
    .select('id, classroom_id, time_slot_id, semester_id, status, space_reservation_weeks(week_number)')
    .eq('id', id)
    .single()

  if (loadError || !reservation) {
    return { ok: false, error: loadError?.message ?? 'Reserva no trobada.' }
  }
  if (reservation.status !== 'pending') {
    return { ok: false, error: 'Només es poden aprovar reserves pendents.' }
  }

  const weeks: number[] = (reservation.space_reservation_weeks ?? []).map((w: any) => w.week_number)

  const { data: busy } = await supabase.rpc('space_slot_busy_weeks', {
    p_classroom_id: reservation.classroom_id,
    p_time_slot_id: reservation.time_slot_id,
    p_semester_id: reservation.semester_id,
    p_exclude_reservation_id: id,
  })
  const busySet = new Set((busy as number[] | null) ?? [])
  const collision = weeks.filter((w) => busySet.has(w))
  if (collision.length > 0) {
    return {
      ok: false,
      error: `No es pot aprovar: les setmanes ${collision.join(', ')} ja estan ocupades.`,
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('space_reservations')
    .update({ status: 'approved', reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }

  revalidatePath('/reserves')
  revalidatePath('/reserves/admin')
  return { ok: true }
}

/** Administració refusa una reserva, amb motiu opcional. */
export async function rejectReservation(id: string, note?: string): Promise<ActionResult> {
  const supabase = await createClient()

  if (!(await isSpaceAdmin(supabase))) {
    return { ok: false, error: 'Només administració pot refusar reserves.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('space_reservations')
    .update({
      status: 'rejected',
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_note: note?.trim() || null,
    })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) return { ok: false, error: error.message }

  revalidatePath('/reserves')
  revalidatePath('/reserves/admin')
  return { ok: true }
}
