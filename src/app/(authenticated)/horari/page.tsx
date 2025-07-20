'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Clock,
  Users,
  Building2,
  GraduationCap,
  GripVertical
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ca } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from '@dnd-kit/core'
import { DraggableAssignment } from '@/components/schedule/draggable-assignment'
import { DroppableTimeSlot } from '@/components/schedule/droppable-time-slot'
import { UnassignedPanel } from '@/components/schedule/unassigned-panel'

interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  day_of_week: number
}

interface Assignment {
  id: string
  subject: { name: string; code: string }
  teacher: { first_name: string; last_name: string }
  student_group: { name: string }
  classroom: { name: string; building: { code: string } }
  time_slot: TimeSlot
}

interface DropZone {
  day: number
  hour: number
}

const DAYS = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8:00 to 21:00

const COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
]

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [unassignedAssignments, setUnassignedAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [activeId, setActiveId] = useState<string | null>(null)
  const supabase = createClient()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    loadAssignments()
  }, [selectedDate])

  const loadAssignments = async () => {
    try {
      setLoading(true)
      
      // Load real assignments from the database
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          id,
          subject:subjects(name, code),
          teacher:teachers(first_name, last_name),
          student_group:student_groups(name),
          classroom:classrooms(name, building),
          time_slot:time_slots(id, start_time, end_time, day_of_week)
        `)
        .not('time_slot_id', 'is', null)
        .not('classroom_id', 'is', null)

      if (error) {
        console.error('Error loading assignments:', error)
        setAssignments([])
        setUnassignedAssignments([])
        return
      }

      // Load unassigned assignments (no time slot or classroom)
      const { data: unassignedData, error: unassignedError } = await supabase
        .from('assignments')
        .select(`
          id,
          subject:subjects(name, code),
          teacher:teachers(first_name, last_name),
          student_group:student_groups(name),
          classroom:classrooms(name, building),
          time_slot:time_slots(id, start_time, end_time, day_of_week)
        `)
        .or('time_slot_id.is.null,classroom_id.is.null')

      if (unassignedError) {
        console.error('Error loading unassigned assignments:', unassignedError)
      }

      // Transform data to match Assignment interface
      const transformedAssignments = (assignmentsData || []).map(item => {
        const classroom = Array.isArray(item.classroom) ? item.classroom[0] : item.classroom
        const subject = Array.isArray(item.subject) ? item.subject[0] : item.subject
        const teacher = Array.isArray(item.teacher) ? item.teacher[0] : item.teacher
        const student_group = Array.isArray(item.student_group) ? item.student_group[0] : item.student_group
        const time_slot = Array.isArray(item.time_slot) ? item.time_slot[0] : item.time_slot
        
        return {
          ...item,
          classroom: classroom ? {
            ...classroom,
            building: { code: classroom.building?.charAt(0) || 'U' }
          } : null,
          subject,
          teacher,
          student_group,
          time_slot
        }
      })

      const transformedUnassigned = (unassignedData || []).map(item => {
        const classroom = Array.isArray(item.classroom) ? item.classroom[0] : item.classroom
        const subject = Array.isArray(item.subject) ? item.subject[0] : item.subject
        const teacher = Array.isArray(item.teacher) ? item.teacher[0] : item.teacher
        const student_group = Array.isArray(item.student_group) ? item.student_group[0] : item.student_group
        const time_slot = Array.isArray(item.time_slot) ? item.time_slot[0] : item.time_slot
        
        return {
          ...item,
          classroom: classroom ? {
            ...classroom,
            building: { code: classroom.building?.charAt(0) || 'U' }
          } : null,
          subject,
          teacher,
          student_group,
          time_slot: time_slot || { id: '', start_time: '00:00', end_time: '00:00', day_of_week: 0 }
        }
      })
      
      setAssignments(transformedAssignments as any)
      setUnassignedAssignments(transformedUnassigned as any)
    } catch (error) {
      console.error('Error loading assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAssignmentForSlot = (day: number, hour: number) => {
    return assignments.find(assignment => {
      const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
      const endHour = parseInt(assignment.time_slot.end_time.split(':')[0])
      return assignment.time_slot.day_of_week === day && hour >= startHour && hour < endHour
    })
  }

  const getAssignmentHeight = (assignment: Assignment) => {
    const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
    const endHour = parseInt(assignment.time_slot.end_time.split(':')[0])
    return (endHour - startHour) * 60 // 60px per hour
  }

  const getAssignmentColor = (index: number) => {
    return COLORS[index % COLORS.length]
  }

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) {
      setActiveId(null)
      return
    }

    const assignmentId = active.id as string
    const dropZone = over.id as string
    
    // Check if dropping back to unassigned
    if (dropZone === 'unassigned-drop') {
      const assignment = assignments.find(a => a.id === assignmentId)
      if (assignment) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId))
        setUnassignedAssignments(prev => [...prev, {
          ...assignment,
          time_slot: {
            ...assignment.time_slot,
            day_of_week: 0,
            start_time: '00:00',
            end_time: '00:00'
          }
        }])
      }
      setActiveId(null)
      return
    }
    
    // Parse drop zone ID (format: "drop-{day}-{hour}")
    const [, day, hour] = dropZone.split('-')
    
    if (assignmentId && day && hour) {
      // Check if it's from unassigned
      const unassigned = unassignedAssignments.find(a => a.id === assignmentId)
      if (unassigned) {
        // Move from unassigned to assigned
        setUnassignedAssignments(prev => prev.filter(a => a.id !== assignmentId))
        setAssignments(prev => [...prev, {
          ...unassigned,
          time_slot: {
            ...unassigned.time_slot,
            day_of_week: parseInt(day),
            start_time: `${hour}:00`,
            end_time: `${parseInt(hour) + 2}:00` // Default 2-hour duration
          }
        }])
      } else {
        // Update existing assignment time slot
        setAssignments(prev => prev.map(assignment => {
          if (assignment.id === assignmentId) {
            return {
              ...assignment,
              time_slot: {
                ...assignment.time_slot,
                day_of_week: parseInt(day),
                start_time: `${hour}:00`,
                end_time: `${parseInt(hour) + 2}:00` // Default 2-hour duration
              }
            }
          }
          return assignment
        }))
      }
    }
    
    setActiveId(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Could add visual feedback here
  }

  const activeAssignment = assignments.find(a => a.id === activeId) || unassignedAssignments.find(a => a.id === activeId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Horari</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona els horaris de classes i assignacions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Assignació
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h3 className="font-semibold">
                  {format(weekStart, 'd MMMM', { locale: ca })} - {format(addDays(weekStart, 4), 'd MMMM yyyy', { locale: ca })}
                </h3>
                <p className="text-sm text-muted-foreground">Setmana {format(selectedDate, 'w')}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Setmana
              </Button>
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Dia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
              >
                Avui
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-[1fr_300px] gap-6">
          {/* Calendar Grid */}
          <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-48"></div>
                  <div className="h-32 bg-muted rounded w-96"></div>
                </div>
              </div>
            ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Days Header */}
                <div className="grid grid-cols-[80px_1fr] border-b">
                  <div className="p-4 border-r"></div>
                  <div className="grid grid-cols-5">
                    {DAYS.map((day, index) => (
                      <div
                        key={day}
                        className="p-4 text-center border-r last:border-r-0 font-medium"
                      >
                        <div>{day}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(addDays(weekStart, index), 'd MMM', { locale: ca })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="relative">
                  {HOURS.map((hour) => (
                    <div key={hour} className="grid grid-cols-[80px_1fr] border-b h-[60px]">
                      <div className="p-2 text-sm text-muted-foreground text-right border-r">
                        {hour}:00
                      </div>
                      <div className="grid grid-cols-5">
                        {DAYS.map((_, dayIndex) => (
                          <DroppableTimeSlot
                            key={`drop-${dayIndex + 1}-${hour}`}
                            id={`drop-${dayIndex + 1}-${hour}`}
                            isActive={activeId !== null}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Assignments */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="grid grid-cols-[80px_1fr] h-full">
                      <div></div>
                      <div className="grid grid-cols-5 h-full">
                        {DAYS.map((_, dayIndex) => (
                          <div key={dayIndex} className="relative">
                            {assignments
                              .filter(a => a.time_slot.day_of_week === dayIndex + 1)
                              .map((assignment, index) => {
                                const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
                                const topPosition = (startHour - 8) * 60
                                
                                return (
                                  <DraggableAssignment
                                    key={assignment.id}
                                    id={assignment.id}
                                    subject={assignment.subject}
                                    teacher={assignment.teacher}
                                    student_group={assignment.student_group}
                                    classroom={assignment.classroom}
                                    color={getAssignmentColor(index)}
                                    style={{
                                      top: `${topPosition}px`,
                                      height: `${getAssignmentHeight(assignment) - 4}px`
                                    }}
                                  />
                                )
                              })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Drag Overlay */}
      <DragOverlay>
        {activeAssignment && (
          <div
            className={cn(
              "p-2 rounded-lg border shadow-2xl",
              getAssignmentColor(assignments.indexOf(activeAssignment))
            )}
            style={{ width: '200px' }}
          >
            <div className="text-xs space-y-1">
              <div className="font-semibold truncate">
                {activeAssignment.subject.code}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span className="truncate">{activeAssignment.student_group.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{activeAssignment.classroom.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                <span className="truncate">
                  {activeAssignment.teacher.first_name} {activeAssignment.teacher.last_name}
                </span>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
      
      {/* Unassigned Panel */}
      <UnassignedPanel assignments={unassignedAssignments} />
    </div>
  </DndContext>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Llegenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Horari: 8:00 - 21:00</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">P: Pujades, L: Llacuna, G: Granada</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">GDB001</Badge>
              <span className="text-sm">Codi assignatura</span>
            </div>
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Arrossega per moure assignacions</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}