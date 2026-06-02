'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReservationAdminTable, type AdminReservation } from './reservation-admin-table'

const STATUS_ORDER: Record<string, number> = { pending: 0, approved: 1, rejected: 2, cancelled: 3 }

const SELECT =
  'id, title, description, status, requester_email, requester_name, reservation_date, start_time, end_time, review_note, created_at, classroom:classrooms(code,name,building), time_slot:time_slots(day_of_week,start_time,end_time), space_reservation_weeks(week_number)'

/** Gestió de reserves per a administració, autocarregant (per usar a /reserves). */
export function ReservationAdminManager() {
  const supabase = useMemo(() => createClient(), [])
  const [reservations, setReservations] = useState<AdminReservation[]>([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('space_reservations')
      .select(SELECT)
      .order('created_at', { ascending: false })
    const sorted = ((data as any[]) ?? []).sort(
      (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    )
    setReservations(sorted as AdminReservation[])
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  return <ReservationAdminTable reservations={reservations} onChanged={load} />
}
