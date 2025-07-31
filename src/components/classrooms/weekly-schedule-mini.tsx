'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WeeklyScheduleMiniProps {
  classroomId: string
}

interface TimeSlot {
  day: number
  hour: number
  occupied: boolean
}

export function WeeklyScheduleMini({ classroomId }: WeeklyScheduleMiniProps) {
  const [schedule, setSchedule] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadSchedule()
  }, [classroomId])

  const loadSchedule = async () => {
    try {
      // Get all assignments for this classroom
      const { data: assignments } = await supabase
        .from('assignment_classrooms')
        .select(`
          assignment:assignments!inner(
            time_slot:time_slots!inner(
              day_of_week,
              start_time,
              end_time
            )
          )
        `)
        .eq('classroom_id', classroomId)

      // Create a grid: 5 days x 13 hours (8-21)
      const scheduleGrid: TimeSlot[] = []
      
      for (let day = 1; day <= 5; day++) {
        for (let hour = 8; hour < 21; hour++) {
          const isOccupied = assignments?.some(ac => {
            const timeSlot = (ac.assignment as any)?.time_slot
            if (!timeSlot) return false
            
            const startHour = parseInt(timeSlot.start_time.split(':')[0])
            const endHour = parseInt(timeSlot.end_time.split(':')[0])
            
            return timeSlot.day_of_week === day && 
                   hour >= startHour && 
                   hour < endHour
          }) || false

          scheduleGrid.push({
            day,
            hour,
            occupied: isOccupied
          })
        }
      }

      setSchedule(scheduleGrid)
    } catch (error) {
      console.error('Error loading schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const days = ['Dl', 'Dm', 'Dc', 'Dj', 'Dv']
  const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8-20

  if (loading) {
    return (
      <div className="w-full h-16 bg-muted/30 rounded animate-pulse" />
    )
  }

  return (
    <div className="w-full">
      <div className="flex gap-0.5">
        {days.map((day, dayIndex) => (
          <div key={day} className="flex-1">
            <div className="text-[10px] text-center text-muted-foreground mb-0.5">
              {day}
            </div>
            <div className="flex flex-col gap-0.5">
              {hours.map((hour) => {
                const slot = schedule.find(
                  s => s.day === dayIndex + 1 && s.hour === hour
                )
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={`h-1 rounded-sm transition-colors ${
                      slot?.occupied 
                        ? 'bg-primary' 
                        : 'bg-muted'
                    }`}
                    title={`${day} ${hour}:00-${hour + 1}:00`}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">8h</span>
        <span className="text-[9px] text-muted-foreground">21h</span>
      </div>
    </div>
  )
}