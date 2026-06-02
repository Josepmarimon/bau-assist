'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { CalendarPlus, Clock, MapPin, X } from 'lucide-react'
import { createReservation, cancelReservation } from '@/lib/reservations/actions'
import { getBusyWeeks } from '@/lib/reservations/availability'
import { ALL_WEEKS, STATUS_LABELS, type ReservationStatus, type TimeSlotRow } from '@/lib/reservations/types'

const DAY_NAMES = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

const fmt = (t: string) => t.slice(0, 5)

const statusColor = (s: ReservationStatus) => ({
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-gray-100 text-gray-600',
}[s])

interface Classroom { id: string; code: string; name: string; type: string; building: string | null }
interface Semester { id: string; number: number }
interface MyReservation {
  id: string; title: string; status: ReservationStatus; review_note: string | null
  classroom: { code: string; name: string } | null
  time_slot: { day_of_week: number; start_time: string; end_time: string } | null
  space_reservation_weeks: { week_number: number }[]
}

export function ReservationRequest() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlotRow[]>([])
  const [myReservations, setMyReservations] = useState<MyReservation[]>([])

  const [classroomId, setClassroomId] = useState<string>('')
  const [semesterId, setSemesterId] = useState<string>('')

  // Diàleg de nova reserva
  const [openSlot, setOpenSlot] = useState<TimeSlotRow | null>(null)
  const [busyWeeks, setBusyWeeks] = useState<number[]>([])
  const [loadingWeeks, setLoadingWeeks] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set())
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const { data: currentAY } = await supabase
        .from('academic_years').select('id').eq('is_current', true).maybeSingle()

      const [roomsRes, semRes, slotsRes] = await Promise.all([
        supabase.from('classrooms').select('id, code, name, type, building').order('building').order('code'),
        supabase.from('semesters').select('id, number').eq('academic_year_id', currentAY?.id ?? '').in('number', [1, 2]).order('number'),
        supabase.from('time_slots').select('id, day_of_week, start_time, end_time, slot_type').order('day_of_week').order('start_time'),
      ])

      setClassrooms(roomsRes.data ?? [])
      setSemesters(semRes.data ?? [])
      setSemesterId(semRes.data?.[0]?.id ?? '')
      setTimeSlots(slotsRes.data ?? [])
      if (user) loadMyReservations(user.id)
    }
    init()
  }, [supabase])

  const loadMyReservations = async (uid: string) => {
    const { data } = await supabase
      .from('space_reservations')
      .select('id, title, status, review_note, classroom:classrooms(code,name), time_slot:time_slots(day_of_week,start_time,end_time), space_reservation_weeks(week_number)')
      .eq('requested_by', uid)
      .order('created_at', { ascending: false })
    setMyReservations((data as any) ?? [])
  }

  const openReserveDialog = async (slot: TimeSlotRow) => {
    if (!classroomId || !semesterId) {
      toast.error('Tria primer una aula i un semestre.')
      return
    }
    setOpenSlot(slot)
    setTitle('')
    setDescription('')
    setSelectedWeeks(new Set())
    setLoadingWeeks(true)
    const busy = await getBusyWeeks(supabase, classroomId, slot.id, semesterId)
    setBusyWeeks(busy)
    setLoadingWeeks(false)
  }

  const toggleWeek = (w: number) => {
    setSelectedWeeks(prev => {
      const next = new Set(prev)
      next.has(w) ? next.delete(w) : next.add(w)
      return next
    })
  }

  const submit = () => {
    if (!openSlot) return
    startTransition(async () => {
      const res = await createReservation({
        classroomId,
        timeSlotId: openSlot.id,
        semesterId,
        title,
        description,
        weeks: Array.from(selectedWeeks),
      })
      if (res.ok) {
        toast.success('Sol·licitud de reserva enviada. Pendent d\'aprovació.')
        setOpenSlot(null)
        if (userId) loadMyReservations(userId)
      } else {
        toast.error(res.error)
      }
    })
  }

  const cancel = (id: string) => {
    startTransition(async () => {
      const res = await cancelReservation(id)
      if (res.ok) {
        toast.success('Reserva cancel·lada.')
        if (userId) loadMyReservations(userId)
      } else {
        toast.error(res.error)
      }
    })
  }

  const slotsByDay = useMemo(() => {
    const map = new Map<number, TimeSlotRow[]>()
    for (const s of timeSlots) {
      if (!map.has(s.day_of_week)) map.set(s.day_of_week, [])
      map.get(s.day_of_week)!.push(s)
    }
    return map
  }, [timeSlots])

  const freeWeeksCount = ALL_WEEKS.length - busyWeeks.length

  return (
    <div className="space-y-8">
      {/* Selecció d'aula i semestre */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Aula</Label>
          <Select value={classroomId} onValueChange={setClassroomId}>
            <SelectTrigger><SelectValue placeholder="Tria una aula" /></SelectTrigger>
            <SelectContent>
              {classrooms.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} · {c.code}{c.building ? ` · ${c.building}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Semestre</Label>
          <Select value={semesterId} onValueChange={setSemesterId}>
            <SelectTrigger><SelectValue placeholder="Semestre" /></SelectTrigger>
            <SelectContent>
              {semesters.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.number}r semestre</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Franges per reservar */}
      {classroomId ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" /> Tria una franja
          </h2>
          <p className="text-sm text-muted-foreground">
            En obrir una franja veuràs les setmanes lliures (les ocupades per classes o
            altres reserves apareixen deshabilitades).
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map(day => (
              <div key={day} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">{DAY_NAMES[day]}</h3>
                <div className="space-y-1.5">
                  {(slotsByDay.get(day) ?? []).map(slot => (
                    <Button
                      key={slot.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start font-normal"
                      onClick={() => openReserveDialog(slot)}
                    >
                      {fmt(slot.start_time)}–{fmt(slot.end_time)}
                    </Button>
                  ))}
                  {(slotsByDay.get(day) ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground/60">—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Tria una aula per veure les franges disponibles.
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
                      {r.time_slot && <span>{DAY_NAMES[r.time_slot.day_of_week]} {fmt(r.time_slot.start_time)}–{fmt(r.time_slot.end_time)}</span>}
                      <span>Setm. {r.space_reservation_weeks.map(w => w.week_number).sort((a, b) => a - b).join(', ')}</span>
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

      {/* Diàleg de nova reserva */}
      <Dialog open={!!openSlot} onOpenChange={(o) => !o && setOpenSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" /> Nova reserva
            </DialogTitle>
            {openSlot && (
              <DialogDescription>
                {DAY_NAMES[openSlot.day_of_week]} · {fmt(openSlot.start_time)}–{fmt(openSlot.end_time)}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="res-title">Activitat lectiva</Label>
              <Input id="res-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Tutoria de projecte" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="res-desc">Descripció (opcional)</Label>
              <Textarea id="res-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Setmanes {loadingWeeks ? '' : `(${freeWeeksCount} lliures)`}</Label>
              {loadingWeeks ? (
                <div className="h-8 bg-muted/40 rounded animate-pulse" />
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {ALL_WEEKS.map(w => {
                    const busy = busyWeeks.includes(w)
                    return (
                      <label
                        key={w}
                        className={`flex items-center justify-center gap-1 rounded border px-1 py-1.5 text-sm ${
                          busy ? 'opacity-40 cursor-not-allowed bg-muted' : 'cursor-pointer hover:bg-accent'
                        }`}
                      >
                        <Checkbox
                          checked={selectedWeeks.has(w)}
                          disabled={busy}
                          onCheckedChange={() => toggleWeek(w)}
                        />
                        {w}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenSlot(null)}>Cancel·lar</Button>
            <Button onClick={submit} disabled={pending || loadingWeeks || selectedWeeks.size === 0 || !title.trim()}>
              {pending ? 'Enviant…' : 'Sol·licitar reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
