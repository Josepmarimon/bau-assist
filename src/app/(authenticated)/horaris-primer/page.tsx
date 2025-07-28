'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { SchedulePDFView } from '@/components/schedules/schedule-pdf-view'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Calendar,
  Clock,
  Building2,
  GraduationCap,
  Users,
  FileText,
  Eye,
  Filter
} from 'lucide-react'

interface Assignment {
  id: string
  subject: {
    name: string
    code: string
    type: string
  }
  teacher: {
    first_name: string
    last_name: string
  } | null
  classrooms: {
    code: string
    name: string
  }[]
  time_slot: {
    day_of_week: number
    start_time: string
    end_time: string
  }
}

interface StudentGroup {
  id: string
  name: string
  year: number
  shift: 'mati' | 'tarda'
  max_students: number
}

export default function HorarisPage() {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({})
  const [assignments1, setAssignments1] = useState<Record<string, Assignment[]>>({})
  const [assignments2, setAssignments2] = useState<Record<string, Assignment[]>>({})
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<StudentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSemester, setSelectedSemester] = useState('1')
  const [viewMode, setViewMode] = useState<'grid' | 'pdf'>('grid')
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterShift, setFilterShift] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')

  useEffect(() => {
    loadAllGroups()
  }, [])

  useEffect(() => {
    applyFilter()
  }, [filterCourse, filterYear, filterShift, filterGroup, studentGroups])

  useEffect(() => {
    if (filteredGroups.length > 0) {
      if (viewMode === 'pdf') {
        // Load both semesters for PDF view
        loadAllSemesterAssignments()
      } else {
        // Load only selected semester for grid view
        loadAssignmentsForAllGroups()
      }
    }
  }, [filteredGroups, selectedSemester, viewMode])

  const loadAllGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('student_groups')
        .select('*')
        .order('year')
        .order('name')

      if (error) {
        console.error('Error loading groups:', error)
        return
      }

      if (data) {
        setStudentGroups(data)
        setFilteredGroups(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const applyFilter = () => {
    let filtered = [...studentGroups]

    // Apply course filter
    if (filterCourse !== 'all') {
      filtered = filtered.filter(group => {
        if (filterCourse === 'disseny') {
          return group.name.startsWith('GR')
        } else if (filterCourse === 'belles-arts') {
          return group.name.startsWith('GBA')
        }
        return true
      })
    }

    // Apply year filter
    if (filterYear !== 'all') {
      filtered = filtered.filter(group => group.year === parseInt(filterYear))
    }

    // Apply shift filter
    if (filterShift !== 'all') {
      filtered = filtered.filter(group => group.shift === filterShift)
    }

    // Apply specific group filter
    if (filterGroup !== 'all') {
      filtered = filtered.filter(group => group.name === filterGroup)
    }

    setFilteredGroups(filtered)
  }

  const loadAssignmentsForAllGroups = async () => {
    try {
      setLoading(true)
      
      // Get semester ID
      const { data: semester } = await supabase
        .from('semesters')
        .select('id')
        .eq('number', parseInt(selectedSemester))
        .eq('academic_year_id', '2b210161-5447-4494-8003-f09a0b553a3f')
        .single()

      if (!semester) {
        console.error('Semester not found')
        return
      }

      // Load assignments for all first year groups
      const groupAssignments: Record<string, Assignment[]> = {}

      for (const group of filteredGroups) {
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select(`
            id,
            subjects!subject_id (name, code, type),
            teachers!teacher_id (first_name, last_name),
            time_slots!time_slot_id (day_of_week, start_time, end_time)
          `)
          .eq('student_group_id', group.id)
          .eq('semester_id', semester.id)

        if (assignmentsData) {
          // Load classrooms for each assignment
          const assignmentIds = assignmentsData.map(a => a.id)
          
          const { data: assignmentClassrooms } = await supabase
            .from('assignment_classrooms')
            .select(`
              assignment_id,
              classrooms (code, name)
            `)
            .in('assignment_id', assignmentIds)
          
          // Group classrooms by assignment
          const classroomsByAssignment: Record<string, any[]> = {}
          if (assignmentClassrooms) {
            assignmentClassrooms.forEach(ac => {
              if (!classroomsByAssignment[ac.assignment_id]) {
                classroomsByAssignment[ac.assignment_id] = []
              }
              if (ac.classrooms) {
                classroomsByAssignment[ac.assignment_id].push(ac.classrooms)
              }
            })
          }

          // Transform assignments
          const transformed = assignmentsData.map(a => ({
            id: a.id,
            subject: a.subjects as any,
            teacher: a.teachers as any,
            classrooms: classroomsByAssignment[a.id] || [],
            time_slot: a.time_slots as any
          }))

          groupAssignments[group.name] = transformed
        }
      }

      setAssignments(groupAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllSemesterAssignments = async () => {
    try {
      setLoading(true)
      
      // Get both semester IDs
      const { data: semesters } = await supabase
        .from('semesters')
        .select('id, number')
        .in('number', [1, 2])
        .eq('academic_year_id', '2b210161-5447-4494-8003-f09a0b553a3f')

      if (!semesters || semesters.length !== 2) {
        console.error('Semesters not found')
        return
      }

      const semester1 = semesters.find(s => s.number === 1)
      const semester2 = semesters.find(s => s.number === 2)

      // Load assignments for both semesters
      const groupAssignments1: Record<string, Assignment[]> = {}
      const groupAssignments2: Record<string, Assignment[]> = {}

      for (const group of filteredGroups) {
        // Load semester 1
        const { data: assignmentsData1 } = await supabase
          .from('assignments')
          .select(`
            id,
            subjects!subject_id (name, code, type),
            teachers!teacher_id (first_name, last_name),
            time_slots!time_slot_id (day_of_week, start_time, end_time)
          `)
          .eq('student_group_id', group.id)
          .eq('semester_id', semester1?.id)

        // Load semester 2
        const { data: assignmentsData2 } = await supabase
          .from('assignments')
          .select(`
            id,
            subjects!subject_id (name, code, type),
            teachers!teacher_id (first_name, last_name),
            time_slots!time_slot_id (day_of_week, start_time, end_time)
          `)
          .eq('student_group_id', group.id)
          .eq('semester_id', semester2?.id)

        // Process semester 1 assignments
        if (assignmentsData1) {
          const assignmentIds = assignmentsData1.map(a => a.id)
          const { data: assignmentClassrooms } = await supabase
            .from('assignment_classrooms')
            .select(`
              assignment_id,
              classrooms (code, name)
            `)
            .in('assignment_id', assignmentIds)
          
          const classroomsByAssignment: Record<string, any[]> = {}
          if (assignmentClassrooms) {
            assignmentClassrooms.forEach(ac => {
              if (!classroomsByAssignment[ac.assignment_id]) {
                classroomsByAssignment[ac.assignment_id] = []
              }
              if (ac.classrooms) {
                classroomsByAssignment[ac.assignment_id].push(ac.classrooms)
              }
            })
          }

          groupAssignments1[group.name] = assignmentsData1.map(a => ({
            id: a.id,
            subject: a.subjects as any,
            teacher: a.teachers as any,
            classrooms: classroomsByAssignment[a.id] || [],
            time_slot: a.time_slots as any
          }))
        }

        // Process semester 2 assignments
        if (assignmentsData2) {
          const assignmentIds = assignmentsData2.map(a => a.id)
          const { data: assignmentClassrooms } = await supabase
            .from('assignment_classrooms')
            .select(`
              assignment_id,
              classrooms (code, name)
            `)
            .in('assignment_id', assignmentIds)
          
          const classroomsByAssignment: Record<string, any[]> = {}
          if (assignmentClassrooms) {
            assignmentClassrooms.forEach(ac => {
              if (!classroomsByAssignment[ac.assignment_id]) {
                classroomsByAssignment[ac.assignment_id] = []
              }
              if (ac.classrooms) {
                classroomsByAssignment[ac.assignment_id].push(ac.classrooms)
              }
            })
          }

          groupAssignments2[group.name] = assignmentsData2.map(a => ({
            id: a.id,
            subject: a.subjects as any,
            teacher: a.teachers as any,
            classrooms: classroomsByAssignment[a.id] || [],
            time_slot: a.time_slots as any
          }))
        }
      }

      setAssignments1(groupAssignments1)
      setAssignments2(groupAssignments2)
    } catch (error) {
      console.error('Error loading assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAssignmentsForDay = (groupAssignments: Assignment[], day: number) => {
    return groupAssignments.filter(assignment => 
      assignment.time_slot && assignment.time_slot.day_of_week === day
    )
  }

  const getSubjectColor = (type: string) => {
    const colors: Record<string, string> = {
      'FB': 'bg-blue-500',
      'OB': 'bg-green-500',
      'OP': 'bg-purple-500',
      'PE': 'bg-orange-500',
      'TFG': 'bg-red-500',
      'obligatoria': 'bg-green-500',
      'optativa': 'bg-purple-500',
      'formacio_basica': 'bg-blue-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  const weekDays = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Horaris</h1>
          <p className="text-muted-foreground">
            Visualització i exportació dels horaris
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Tabs value={selectedSemester} onValueChange={setSelectedSemester}>
            <TabsList>
              <TabsTrigger value="1">Primer Semestre</TabsTrigger>
              <TabsTrigger value="2">Segon Semestre</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Vista normal
            </Button>
            <Button
              variant={viewMode === 'pdf' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('pdf')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Vista PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filter section */}
      <div className="space-y-4 print:hidden bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Filtres</span>
          {(filterCourse !== 'all' || filterYear !== 'all' || filterShift !== 'all' || filterGroup !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCourse('all')
                setFilterYear('all')
                setFilterShift('all')
                setFilterGroup('all')
              }}
              className="ml-auto"
            >
              Netejar filtres
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Course filter */}
          <div>
            <label className="text-sm font-medium mb-1 block">Titulació</label>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Totes</SelectItem>
                <SelectItem value="disseny">Grau en Disseny</SelectItem>
                <SelectItem value="belles-arts">Grau en Belles Arts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year filter */}
          <div>
            <label className="text-sm font-medium mb-1 block">Curs</label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots</SelectItem>
                <SelectItem value="1">Primer</SelectItem>
                <SelectItem value="2">Segon</SelectItem>
                <SelectItem value="3">Tercer</SelectItem>
                <SelectItem value="4">Quart</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Shift filter */}
          <div>
            <label className="text-sm font-medium mb-1 block">Torn</label>
            <Select value={filterShift} onValueChange={setFilterShift}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots</SelectItem>
                <SelectItem value="mati">Matí</SelectItem>
                <SelectItem value="tarda">Tarda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Group filter */}
          <div>
            <label className="text-sm font-medium mb-1 block">Grup específic</label>
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots</SelectItem>
                {studentGroups
                  .filter(group => {
                    // Apply other filters to group list
                    let show = true
                    if (filterCourse !== 'all') {
                      if (filterCourse === 'disseny' && !group.name.startsWith('GR')) show = false
                      if (filterCourse === 'belles-arts' && !group.name.startsWith('GBA')) show = false
                    }
                    if (filterYear !== 'all' && group.year !== parseInt(filterYear)) show = false
                    if (filterShift !== 'all' && group.shift !== filterShift) show = false
                    return show
                  })
                  .map(group => (
                    <SelectItem key={group.id} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredGroups.length} {filteredGroups.length === 1 ? 'grup' : 'grups'} seleccionats
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregant horaris...</div>
        </div>
      ) : viewMode === 'pdf' ? (
        <SchedulePDFView
          groups={filteredGroups}
          assignments1={assignments1}
          assignments2={assignments2}
          academicYear="2025-2026"
        />
      ) : (
        <div className="space-y-8">
          {filteredGroups.map(group => {
            const groupAssignments = assignments[group.name] || []
            
            return (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {group.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.name.startsWith('GR') ? 'Grau en Disseny' : 'Grau en Belles Arts'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {group.shift === 'mati' ? 'Matí' : 'Tarda'}
                      </Badge>
                      <Badge variant="secondary">
                        {group.max_students} estudiants
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {/* Header */}
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        {weekDays.map(day => (
                          <div key={day} className="text-center font-semibold text-sm border-r border-gray-200 last:border-r-0 py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Schedule Grid */}
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map(day => {
                          const dayAssignments = getAssignmentsForDay(groupAssignments, day)
                          const isAfternoon = group.shift === 'tarda'
                          
                          return (
                            <div key={day} className="bg-gray-50 rounded-lg p-1 h-[260px] relative border-r border-gray-200 last:border-r-0">
                              {/* Time labels */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute left-1 top-0 text-[10px] text-gray-400">
                                  {isAfternoon ? '15:00' : '9:00'}
                                </div>
                                <div className="absolute left-1 bottom-0 text-[10px] text-gray-400">
                                  {isAfternoon ? '19:30' : '14:30'}
                                </div>
                              </div>
                              
                              {/* Assignments */}
                              {dayAssignments.map(assignment => {
                                if (!assignment.time_slot || !assignment.time_slot.start_time || !assignment.time_slot.end_time) {
                                  return null
                                }
                                
                                const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
                                const endHour = parseInt(assignment.time_slot.end_time.split(':')[0])
                                const startMinutes = parseInt(assignment.time_slot.start_time.split(':')[1])
                                const endMinutes = parseInt(assignment.time_slot.end_time.split(':')[1])
                                
                                // Calculate position and height based on time
                                let top = 0
                                let height = 100
                                
                                if (!isAfternoon) {
                                  // Morning slot is from 9:00 to 14:30 (5.5 hours)
                                  const slotStart = 9 * 60 // 9:00 in minutes
                                  const slotEnd = 14.5 * 60 // 14:30 in minutes
                                  const totalMinutes = slotEnd - slotStart
                                  
                                  const assignmentStart = (startHour * 60 + startMinutes) - slotStart
                                  const assignmentEnd = (endHour * 60 + endMinutes) - slotStart
                                  
                                  top = (assignmentStart / totalMinutes) * 100
                                  height = ((assignmentEnd - assignmentStart) / totalMinutes) * 100
                                } else {
                                  // Afternoon slot is from 15:00 to 19:30 (4.5 hours)
                                  const slotStart = 15 * 60 // 15:00 in minutes
                                  const slotEnd = 19.5 * 60 // 19:30 in minutes
                                  const totalMinutes = slotEnd - slotStart
                                  
                                  const assignmentStart = (startHour * 60 + startMinutes) - slotStart
                                  const assignmentEnd = (endHour * 60 + endMinutes) - slotStart
                                  
                                  top = (assignmentStart / totalMinutes) * 100
                                  height = ((assignmentEnd - assignmentStart) / totalMinutes) * 100
                                }
                                
                                return (
                                  <div
                                    key={assignment.id}
                                    style={{
                                      position: 'absolute',
                                      top: `${top}%`,
                                      height: `${height}%`,
                                      left: '4px',
                                      right: '4px'
                                    }}
                                    className={`rounded-md p-2 text-white flex flex-col gap-1 shadow-sm overflow-hidden ${getSubjectColor(assignment.subject.type)}`}
                                  >
                                    <div className="font-semibold text-xs line-clamp-2 leading-tight">
                                      {assignment.subject.name}
                                    </div>
                                    
                                    {assignment.teacher && (
                                      <div className="text-[11px] opacity-90 flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">
                                          {assignment.teacher.first_name} {assignment.teacher.last_name}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {assignment.classrooms.length > 0 && (
                                      <div className="text-[11px] opacity-90 flex items-center gap-1">
                                        <Building2 className="h-3 w-3 flex-shrink-0" />
                                        <span>{assignment.classrooms.map(c => c.code).join(', ')}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}