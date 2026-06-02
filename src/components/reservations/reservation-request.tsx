'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { MapPin, X } from 'lucide-react'
import { ClassroomWeeklySchedule } from '@/components/public/classroom-weekly-schedule'
import { cancelReservation } from '@/lib/reservations/actions'
import { STATUS_LABELS, type ReservationStatus } from '@/lib/reservations/types'

const DAY_NAMES = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
const fmt = (t: string) => t.slice(0, 5)

const statusColor = (s: ReservationStatus) => ({
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-gray-100 text-gray-600',
}[s])

interface Classroom { id: string; code: string; name: string; type: string; building: string | null }
interface MyReservation {
  id: string
  title: string
  status: ReservationStatus
  review_note: string | null
  reservation_date: string | null
  start_time: string | null
  end_time: string | null
  classroom: { code: string; name: string } | null
  time_slot: { day_of_week: number; start_time: string; end_time: string } | null
  space_reservation_weeks: { week_number: number }[]
}

function whenLabel(r: MyReservation): string {
  if (r.reservation_date) {
    return `${r.reservation_date} · ${r.start_time ? fmt(r.start_time) : ''}–${r.end_time ? fmt(r.end_time) : ''}`
  }
  if (r.time_slot) {
    const weeks = r.space_reservation_weeks.map(w => w.week_number).sort((a, b) => a - b).join(', ')
    return `${DAY_NAMES[r.time_slot.day_of_week]} ${fmt(r.time_slot.start_time)}–${fmt(r.time_slot.end_time)} · Setm. ${weeks}`
  }
  return ''
}

export function ReservationRequest() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [classroomId, setClassroomId] = useState<string>('')
  const [myReservations, setMyReservations] = useState<MyReservation[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const { data: rooms } = await supabase
        .from('classrooms')
        .select('id, code, name, type, building')
        .order('building').order('code')
      setClassrooms(rooms ?? [])

      if (user) loadMyReservations(user.id)
    }
    init()
  }, [supabase])

  const loadMyReservations = async (uid: string) => {
    const { data } = await supabase
      .from('space_reservations')
      .select('id, title, status, review_note, reservation_date, start_time, end_time, classroom:classrooms(code,name), time_slot:time_slots(day_of_week,start_time,end_time), space_reservation_weeks(week_number)')
      .eq('requested_by', uid)
      .order('created_at', { ascending: false })
    setMyReservations((data as any) ?? [])
  }

  const refreshMine = () => { if (userId) loadMyReservations(userId) }

  const cancel = (id: string) => {
    startTransition(async () => {
      const res = await cancelReservation(id)
      if (res.ok) { toast.success('Reserva cancel·lada.'); refreshMine() }
      else toast.error(res.error)
    })
  }

  const selectedClassroom = classrooms.find(c => c.id === classroomId)

  return (
    <div className="space-y-8">
      {/* Selecció d'aula */}
      <div className="max-w-md space-y-1">
        <Label>Aula</Label>
        <Select value={classroomId} onValueChange={setClassroomId}>
          <SelectTrigger><SelectValue placeholder="Tria una aula per veure el calendari" /></SelectTrigger>
          <SelectContent>
            {classrooms.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} · {c.code}{c.building ? ` · ${c.building}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Calendari visual de l'aula (mateixa graella que les pàgines públiques) */}
      {classroomId ? (
        <Card>
          <CardContent className="pt-6">
            <ClassroomWeeklySchedule
              classroomId={classroomId}
              reservable
              classroomName={selectedClassroom?.name}
              onReservationCreated={refreshMine}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Tria una aula per veure el calendari i reservar franges lliures.
          </CardContent>
        </Card>
      )}

      {/* Les meves reserves */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Les meves reserves</h2>
        {myReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Encara no has fet cap reserva.</p>
        ) : (
          <div className="space-y-2">
            {myReservations.map(r => (
              <Card key={r.id}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.title}</span>
                      <Badge className={statusColor(r.status)}>{STATUS_LABELS[r.status]}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                      {r.classroom && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.classroom.name} ({r.classroom.code})</span>}
                      <span>{whenLabel(r)}</span>
                    </div>
                    {r.status === 'rejected' && r.review_note && (
                      <p className="text-sm text-rose-700">Motiu: {r.review_note}</p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <Button variant="ghost" size="sm" onClick={() => cancel(r.id)} disabled={pending}>
                      <X className="h-4 w-4 mr-1" /> Cancel·lar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
