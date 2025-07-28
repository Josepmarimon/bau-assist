'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { SchedulePDFView } from '@/components/schedules/schedule-pdf-view'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter } from 'lucide-react'

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
  const [assignments1, setAssignments1] = useState<Record<string, Assignment[]>>({})
  const [assignments2, setAssignments2] = useState<Record<string, Assignment[]>>({})
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<StudentGroup[]>([])
  const [loading, setLoading] = useState(true)
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
      // Always load both semesters for PDF view
      loadAllSemesterAssignments()
    }
  }, [filteredGroups])

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


  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Horaris</h1>
            <p className="text-muted-foreground">
              Visualització i exportació dels horaris
            </p>
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
      ) : (
        <SchedulePDFView
          groups={filteredGroups}
          assignments1={assignments1}
          assignments2={assignments2}
          academicYear="2025-2026"
        />
        )}
      </div>
    </div>
  )
}