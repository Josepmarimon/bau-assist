// Reserves públiques (anònimes) per data i hora concretes des de les fitxes d'aula.

export const BAU_EMAIL_REGEX = /^[^@\s]+@(bau\.cat|student\.bau\.cat)$/i

export function isValidBauEmail(email: string): boolean {
  return BAU_EMAIL_REGEX.test((email ?? '').trim())
}

export interface PublicReservationInput {
  classroomId: string
  date: string // 'YYYY-MM-DD'
  startTime: string // 'HH:MM'
  endTime: string // 'HH:MM'
  name: string
  email: string
  description: string
}

export type PublicReservationResult = { ok: true } | { ok: false; error: string }

export async function requestPublicReservation(
  supabase: any,
  input: PublicReservationInput
): Promise<PublicReservationResult> {
  const { error } = await supabase.rpc('request_public_reservation', {
    p_classroom_id: input.classroomId,
    p_date: input.date,
    p_start: input.startTime,
    p_end: input.endTime,
    p_name: input.name,
    p_email: input.email,
    p_description: input.description,
  })

  if (error) {
    return { ok: false, error: error.message || 'No s\'ha pogut enviar la reserva.' }
  }
  return { ok: true }
}
