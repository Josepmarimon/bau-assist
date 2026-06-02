export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export const ALL_WEEKS: number[] = Array.from({ length: 15 }, (_, i) => i + 1)

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pendent',
  approved: 'Aprovada',
  rejected: 'Refusada',
  cancelled: 'Cancel·lada',
}

export interface SpaceReservation {
  id: string
  classroom_id: string
  time_slot_id: string
  semester_id: string
  requested_by: string
  requester_email: string | null
  title: string
  description: string | null
  status: ReservationStatus
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

export interface TimeSlotRow {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_type: string
}

export interface CreateReservationInput {
  classroomId: string
  timeSlotId: string
  semesterId: string
  title: string
  description?: string
  weeks: number[]
}
