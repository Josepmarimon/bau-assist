'use client'

import { useMemo } from 'react'
import type { Database } from '@/types/database.types'

type MasterSchedule = Database['public']['Tables']['master_schedules']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type Classroom = Database['public']['Tables']['classrooms']['Row']
type Teacher = Database['public']['Tables']['teachers']['Row']
type Semester = Database['public']['Tables']['semesters']['Row']

interface MasterScheduleWithRelations extends Omit<MasterSchedule, 'program_id' | 'classroom_id' | 'teacher_id' | 'semester_id'> {
  programs: Program
  classrooms: Classroom
  teachers: Teacher | null
  semesters: Semester | null
  program_id: string
  classroom_id: string
  teacher_id: string | null
  semester_id: string | null
}

interface MastersCalendarViewProps {
  schedules: MasterScheduleWithRelations[]
  onScheduleClick: (schedule: MasterScheduleWithRelations) => void
}

const DAYS = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
const START_HOUR = 15
const END_HOUR = 21.5 // 21:30
const HOURS = [] // Generate hours from 15:00 to 21:30
for (let hour = START_HOUR; hour <= END_HOUR; hour += 0.5) {
  HOURS.push(hour)
}
const HOUR_HEIGHT = 80 // pixels per hour

interface ScheduleBlock {
  schedule: MasterScheduleWithRelations
  startHour: number
  endHour: number
  duration: number
  column: number
  totalColumns: number
}

export function MastersCalendarView({ schedules, onScheduleClick }: MastersCalendarViewProps) {
  // Process schedules to determine positioning
  const scheduleBlocks = useMemo(() => {
    const blocks: { [key: number]: ScheduleBlock[] } = {}
    
    // Initialize blocks for each day
    for (let day = 1; day <= 5; day++) {
      blocks[day] = []
    }
    
    // Group schedules by day
    schedules.forEach(schedule => {
      const [startH, startM] = schedule.start_time.split(':').map(Number)
      const [endH, endM] = schedule.end_time.split(':').map(Number)
      const startHour = startH + startM / 60
      const endHour = endH + endM / 60
      const duration = endHour - startHour
      
      blocks[schedule.day_of_week].push({
        schedule,
        startHour,
        endHour,
        duration,
        column: 0,
        totalColumns: 1
      })
    })
    
    // Calculate columns for overlapping schedules
    Object.keys(blocks).forEach(day => {
      const dayBlocks = blocks[parseInt(day)]
      
      // Sort by start time
      dayBlocks.sort((a, b) => a.startHour - b.startHour)
      
      // Calculate overlaps and assign columns
      dayBlocks.forEach((block, index) => {
        const overlapping: ScheduleBlock[] = [block]
        
        // Find all blocks that overlap with this one
        for (let j = 0; j < dayBlocks.length; j++) {
          if (j === index) continue
          const other = dayBlocks[j]
          
          // Check if times overlap
          if (
            (other.startHour >= block.startHour && other.startHour < block.endHour) ||
            (other.endHour > block.startHour && other.endHour <= block.endHour) ||
            (other.startHour <= block.startHour && other.endHour >= block.endHour)
          ) {
            overlapping.push(other)
          }
        }
        
        // Assign columns to overlapping blocks
        const totalColumns = overlapping.length
        overlapping.forEach((overlapBlock, colIndex) => {
          overlapBlock.totalColumns = Math.max(overlapBlock.totalColumns, totalColumns)
          
          // Find first available column
          const usedColumns = new Set<number>()
          overlapping.forEach(ob => {
            if (ob !== overlapBlock && ob.column !== undefined) {
              usedColumns.add(ob.column)
            }
          })
          
          let column = 0
          while (usedColumns.has(column)) {
            column++
          }
          overlapBlock.column = column
        })
      })
    })
    
    return blocks
  }, [schedules])

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1000px]">
        {/* Header */}
        <div className="grid grid-cols-[80px_1fr] border-b">
          <div className="p-2 font-medium text-center border-r">Hora</div>
          <div className="grid grid-cols-5">
            {DAYS.map((day, index) => (
              <div key={index} className="p-2 font-medium text-center border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
        </div>
        
        {/* Time grid */}
        <div className="relative">
          {/* Hour rows */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-[80px_1fr] border-b" style={{ height: HOUR_HEIGHT / 2 }}>
              <div className="p-2 text-sm text-center border-r text-gray-600">
                {Math.floor(hour)}:{hour % 1 === 0 ? '00' : '30'}
              </div>
              <div className="grid grid-cols-5">
                {DAYS.map((_, dayIndex) => (
                  <div key={dayIndex} className="border-r last:border-r-0 relative" />
                ))}
              </div>
            </div>
          ))}
          
          {/* Schedule blocks */}
          <div className="absolute inset-0 grid grid-cols-[80px_1fr]">
            <div /> {/* Time column spacer */}
            <div className="grid grid-cols-5">
              {DAYS.map((_, dayIndex) => (
                <div key={dayIndex} className="relative">
                  {scheduleBlocks[dayIndex + 1]?.map((block, blockIndex) => {
                    const top = (block.startHour - START_HOUR) * HOUR_HEIGHT
                    const height = block.duration * HOUR_HEIGHT
                    const width = `${100 / block.totalColumns}%`
                    const left = `${(100 / block.totalColumns) * block.column}%`
                    
                    return (
                      <div
                        key={`${block.schedule.id}-${blockIndex}`}
                        className="absolute p-1 cursor-pointer transition-all hover:z-10 hover:shadow-lg"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          width: width,
                          left: left,
                        }}
                        onClick={() => onScheduleClick(block.schedule)}
                      >
                        <div
                          className="h-full rounded-md p-2 overflow-hidden"
                          style={{
                            backgroundColor: block.schedule.programs.color ? `${block.schedule.programs.color}20` : '#DBEAFE',
                            borderLeft: `4px solid ${block.schedule.programs.color || '#3B82F6'}`,
                          }}
                        >
                          <div className="font-semibold text-xs mb-1 truncate">
                            {block.schedule.programs.name}
                          </div>
                          {block.schedule.subject_name && (
                            <div className="text-xs text-gray-700 truncate">
                              {block.schedule.subject_name}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            <div className="truncate">{block.schedule.classrooms.name}</div>
                            {block.schedule.teachers && (
                              <div className="truncate">
                                {block.schedule.teachers.first_name} {block.schedule.teachers.last_name}
                              </div>
                            )}
                            <div className="font-medium mt-1">
                              {block.schedule.start_time.slice(0, 5)} - {block.schedule.end_time.slice(0, 5)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}