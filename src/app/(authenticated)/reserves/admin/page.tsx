import { createClient } from '@/lib/supabase/server'
import { ReservationAdminTable, type AdminReservation } from '@/components/reservations/reservation-admin-table'

export const metadata = {
  title: 'Reserves · Administració',
}

// Ordre: pendents primer, després la resta per data de creació descendent
const STATUS_ORDER: Record<string, number> = { pending: 0, approved: 1, rejected: 2, cancelled: 3 }

export default async function ReservesAdminPage() {
  const supabase = await createClient()

  const { data: isAdmin } = await supabase.rpc('is_space_admin')
  if (!isAdmin) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Reserves · Administració</h1>
        <p className="text-muted-foreground">No tens permisos per gestionar reserves.</p>
      </div>
    )
  }

  const { data } = await supabase
    .from('space_reservations')
    .select('id, title, description, status, requester_email, requester_name, reservation_date, start_time, end_time, review_note, created_at, classroom:classrooms(code,name,building), time_slot:time_slots(day_of_week,start_time,end_time), space_reservation_weeks(week_number)')
    .order('created_at', { ascending: false })

  const reservations = ((data as any[]) ?? []).sort((a, b) => {
    const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    return s !== 0 ? s : 0
  }) as AdminReservation[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reserves · Administració</h1>
        <p className="text-muted-foreground">
          Accepta o refusa les sol·licituds de reserva. Les aprovades apareixen
          automàticament a les graelles d&apos;ocupació.
        </p>
      </div>
      <ReservationAdminTable reservations={reservations} />
    </div>
  )
}
