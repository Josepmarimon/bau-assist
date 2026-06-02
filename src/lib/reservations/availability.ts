import { ALL_WEEKS } from './types'

/**
 * Setmanes ocupades (per classes o reserves pendents/aprovades) d'una franja.
 * Crida la funció Postgres space_slot_busy_weeks. Pensada per a components client.
 */
export async function getBusyWeeks(
  supabase: any,
  classroomId: string,
  timeSlotId: string,
  semesterId: string,
  excludeReservationId?: string
): Promise<number[]> {
  const { data, error } = await supabase.rpc('space_slot_busy_weeks', {
    p_classroom_id: classroomId,
    p_time_slot_id: timeSlotId,
    p_semester_id: semesterId,
    p_exclude_reservation_id: excludeReservationId ?? null,
  })
  if (error || !data) return []
  return data as number[]
}

export function freeWeeksFrom(busy: number[]): number[] {
  const busySet = new Set(busy)
  return ALL_WEEKS.filter((w) => !busySet.has(w))
}
