'use client'

import { Fragment, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

interface ClassroomWeeklyScheduleProps {
  classroomId: string
}

interface Semester {
  id: string
  number: number
}

type SlotType = 'class' | 'reservation'

interface RawSlot {
  semesterId: string
  dayOfWeek: number
  startHour: number
  endHour: number
  type: SlotType
}

// Files de la graella: una per hora, de 8:00 a 21:00.
const START_HOUR = 8
const END_HOUR = 21
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAYS = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
const DAYS_SHORT = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv']

export function ClassroomWeeklySchedule({ classroomId }: ClassroomWeeklyScheduleProps) {
  const [slots, setSlots] = useState<RawSlot[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      try {
        // Semestres del curs acadèmic actual
        const { data: currentAY } = await supabase
          .from('academic_years')
          .select('id')
          .eq('is_current', true)
          .maybeSingle()

        let loadedSemesters: Semester[] = []
        if (currentAY?.id) {
          const { data: sems } = await supabase
            .from('semesters')
            .select('id, number')
            .eq('academic_year_id', currentAY.id)
            .in('number', [1, 2])
            .order('number')
          loadedSemesters = sems || []
        }
        setSemesters(loadedSemesters)
        setSelectedSemester(loadedSemesters[0]?.id ?? null)

        // Ocupació de l'aula: tots els blocs amb la seva franja horària
        const { data: assignments } = await supabase
          .from('assignment_classrooms')
          .select(`
            assignment:assignments!inner (
              semester_id,
              time_slot:time_slots!inner (
                day_of_week,
                start_time,
                end_time
              )
            )
          `)
          .eq('classroom_id', classroomId)

        const rawSlots: RawSlot[] = []
        for (const ac of assignments || []) {
          const assignment = (ac as any).assignment
          const timeSlot = assignment?.time_slot
          if (!timeSlot) continue
          rawSlots.push({
            semesterId: assignment.semester_id,
            dayOfWeek: timeSlot.day_of_week,
            startHour: parseInt(timeSlot.start_time.split(':')[0]),
            endHour: parseInt(timeSlot.end_time.split(':')[0]),
            type: 'class'
          })
        }

        // Reserves aprovades (apareixen igual que les classes a la graella)
        const { data: reservations } = await supabase
          .from('classroom_reservation_occupancy')
          .select('semester_id, day_of_week, start_time, end_time')
          .eq('classroom_id', classroomId)

        for (const r of (reservations as any[]) || []) {
          rawSlots.push({
            semesterId: r.semester_id,
            dayOfWeek: r.day_of_week,
            startHour: parseInt(r.start_time.split(':')[0]),
            endHour: parseInt(r.end_time.split(':')[0]),
            type: 'reservation'
          })
        }
        setSlots(rawSlots)
      } catch (error) {
        console.error('Error loading classroom schedule:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [classroomId])

  const occupancyAt = (day: number, hour: number): SlotType | null => {
    let result: SlotType | null = null
    for (const slot of slots) {
      if (selectedSemester && slot.semesterId !== selectedSemester) continue
      if (slot.dayOfWeek === day && hour >= slot.startHour && hour < slot.endHour) {
        // Una classe té prioritat visual sobre una reserva si coincidissin
        if (slot.type === 'class') return 'class'
        result = 'reservation'
      }
    }
    return result
  }

  if (loading) {
    return <div className="w-full h-64 bg-muted/30 rounded-lg animate-pulse" />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Ocupació setmanal
        </h2>

        {semesters.length > 0 && (
          <div className="flex gap-1 rounded-lg border p-0.5">
            {semesters.map(sem => (
              <Button
                key={sem.id}
                variant={selectedSemester === sem.id ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setSelectedSemester(sem.id)}
              >
                {sem.number}r sem.
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Llegenda */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 border border-emerald-300" />
          <span className="text-muted-foreground">Lliure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-rose-400 border border-rose-500" />
          <span className="text-muted-foreground">Ocupat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-400 border border-amber-500" />
          <span className="text-muted-foreground">Reservat</span>
        </div>
      </div>

      {/* Graella compacta: 5 dies + columna d'hores, sense scroll a mòbil */}
      <div
        className="grid gap-px rounded-md overflow-hidden bg-border text-center"
        style={{ gridTemplateColumns: '1.6rem repeat(5, 1fr)' }}
      >
        {/* Capçalera */}
        <div className="bg-background" />
        {DAYS_SHORT.map((day, i) => (
          <div
            key={day}
            className="bg-background py-1 text-[11px] font-semibold text-muted-foreground"
            title={DAYS[i]}
          >
            {day}
          </div>
        ))}

        {/* Files per hora */}
        {HOURS.map(hour => (
          <Fragment key={hour}>
            <div className="bg-background flex items-center justify-end pr-1 text-[9px] leading-none text-muted-foreground">
              {hour}
            </div>
            {DAYS.map((_, dayIndex) => {
              const occ = occupancyAt(dayIndex + 1, hour)
              const bg = occ === 'class' ? 'bg-rose-400' : occ === 'reservation' ? 'bg-amber-400' : 'bg-emerald-50'
              const label = occ === 'class' ? 'Ocupat' : occ === 'reservation' ? 'Reservat' : 'Lliure'
              return (
                <div
                  key={dayIndex}
                  className={`h-5 ${bg}`}
                  title={`${DAYS[dayIndex]} ${hour}:00 — ${label}`}
                />
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
