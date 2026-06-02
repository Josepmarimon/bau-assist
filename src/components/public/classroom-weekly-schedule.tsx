'use client'

import { useEffect, useState } from 'react'
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

interface RawSlot {
  semesterId: string
  dayOfWeek: number
  startHour: number
  endHour: number
}

// Files de la graella: una per hora, de 8:00 a 21:00.
const START_HOUR = 8
const END_HOUR = 21
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAYS = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

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
            endHour: parseInt(timeSlot.end_time.split(':')[0])
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

  const isOccupied = (day: number, hour: number): boolean => {
    return slots.some(slot => {
      if (selectedSemester && slot.semesterId !== selectedSemester) return false
      return slot.dayOfWeek === day && hour >= slot.startHour && hour < slot.endHour
    })
  }

  if (loading) {
    return <div className="w-full h-64 bg-muted/30 rounded-lg animate-pulse" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Ocupació setmanal
        </h2>

        {semesters.length > 0 && (
          <div className="flex gap-1 rounded-lg border p-1">
            {semesters.map(sem => (
              <Button
                key={sem.id}
                variant={selectedSemester === sem.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSemester(sem.id)}
              >
                {sem.number}r semestre
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Llegenda */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-sm bg-emerald-100 border border-emerald-300" />
          <span className="text-muted-foreground">Lliure</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-sm bg-rose-400 border border-rose-500" />
          <span className="text-muted-foreground">Ocupat</span>
        </div>
      </div>

      {/* Graella */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[560px]">
          <thead>
            <tr>
              <th className="w-20 p-2 text-left font-medium text-muted-foreground">Hora</th>
              {DAYS.map(day => (
                <th key={day} className="p-2 text-center font-medium border-l">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 2)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour} className="border-t">
                <td className="p-2 align-top text-xs text-muted-foreground whitespace-nowrap">
                  {hour.toString().padStart(2, '0')}:00
                </td>
                {DAYS.map((_, dayIndex) => {
                  const occupied = isOccupied(dayIndex + 1, hour)
                  return (
                    <td
                      key={dayIndex}
                      className={`border-l h-9 transition-colors ${
                        occupied
                          ? 'bg-rose-400'
                          : 'bg-emerald-50'
                      }`}
                      title={`${DAYS[dayIndex]} ${hour}:00 - ${occupied ? 'Ocupat' : 'Lliure'}`}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
