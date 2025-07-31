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
import { Filter, Loader2, GraduationCap, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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
  color: string
}

interface StudentGroup {
  id: string
  name: string
  year: number
  shift: 'mati' | 'tarda'
  max_students: number
}

interface CourseColor {
  id: string
  course_name: string
  course_code: string
  year: number
  color: string
  color_type?: string
  itinerary_code?: string
}

export default function HorarisPage() {
  const supabase = createClient()
  const [assignments1, setAssignments1] = useState<Record<string, Assignment[]>>({})
  const [assignments2, setAssignments2] = useState<Record<string, Assignment[]>>({})
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<StudentGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [filterCourse, setFilterCourse] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterShift, setFilterShift] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [courseColors, setCourseColors] = useState<CourseColor[]>([])
  const [loadedGroups, setLoadedGroups] = useState<Set<string>>(new Set())
  const [semester1Id, setSemester1Id] = useState<string>('')
  const [semester2Id, setSemester2Id] = useState<string>('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    const filtered = applyFilters()
    setFilteredGroups(filtered)
  }, [filterCourse, filterYear, filterShift, filterGroup, studentGroups])

  useEffect(() => {
    if (filteredGroups.length > 0 && semester1Id && semester2Id) {
      loadAssignmentsProgressive()
    }
  }, [filteredGroups, semester1Id, semester2Id])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load all initial data in parallel
      const [groupsResult, colorsResult, semestersResult] = await Promise.all([
        supabase.from('student_groups').select('*').order('year').order('name'),
        supabase.from('course_colors').select('*'),
        supabase
          .from('semesters')
          .select('id, number')
          .in('number', [1, 2])
          .eq('academic_year_id', '2b210161-5447-4494-8003-f09a0b553a3f')
      ])

      if (groupsResult.data) {
        setStudentGroups(groupsResult.data)
        setFilteredGroups(groupsResult.data)
      }
      
      if (colorsResult.data) {
        setCourseColors(colorsResult.data)
      }

      if (semestersResult.data && semestersResult.data.length === 2) {
        const sem1 = semestersResult.data.find(s => s.number === 1)
        const sem2 = semestersResult.data.find(s => s.number === 2)
        if (sem1) setSemester1Id(sem1.id)
        if (sem2) setSemester2Id(sem2.id)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...studentGroups]

    if (filterCourse !== 'all') {
      filtered = filtered.filter(group => {
        if (filterCourse === 'disseny') {
          return group.name.startsWith('GD') || group.name.startsWith('GR')
        } else if (filterCourse === 'belles-arts') {
          return group.name.startsWith('GBA')
        }
        return true
      })
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(group => group.year === parseInt(filterYear))
    }

    if (filterShift !== 'all') {
      filtered = filtered.filter(group => group.shift === filterShift)
    }

    if (filterGroup !== 'all') {
      filtered = filtered.filter(group => group.name === filterGroup)
    }

    return filtered
  }

  const getSubjectColor = (subjectCode: string, year: number): string => {
    const color = courseColors.find(
      cc => cc.course_code === subjectCode && cc.year === year
    )
    return color?.color || '#94a3b8'
  }

  const loadAssignmentsForGroup = async (group: StudentGroup) => {
    try {
      // Skip if already loaded
      if (loadedGroups.has(group.id)) return

      // Load both semesters in parallel
      const [assignments1Data, assignments2Data] = await Promise.all([
        supabase
          .from('assignments')
          .select(`
            id,
            subjects!subject_id (name, code, type),
            teachers!teacher_id (first_name, last_name),
            time_slots!time_slot_id (day_of_week, start_time, end_time)
          `)
          .eq('student_group_id', group.id)
          .eq('semester_id', semester1Id),
        supabase
          .from('assignments')
          .select(`
            id,
            subjects!subject_id (name, code, type),
            teachers!teacher_id (first_name, last_name),
            time_slots!time_slot_id (day_of_week, start_time, end_time)
          `)
          .eq('student_group_id', group.id)
          .eq('semester_id', semester2Id)
      ])

      // Get all assignment IDs
      const allAssignmentIds = [
        ...(assignments1Data.data?.map(a => a.id) || []),
        ...(assignments2Data.data?.map(a => a.id) || [])
      ]

      // Load classrooms for all assignments at once
      let classroomsByAssignment: Record<string, any[]> = {}
      if (allAssignmentIds.length > 0) {
        const { data: assignmentClassrooms } = await supabase
          .from('assignment_classrooms')
          .select(`
            assignment_id,
            classrooms (code, name)
          `)
          .in('assignment_id', allAssignmentIds)
        
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
      }

      // Process assignments for semester 1
      if (assignments1Data.data) {
        const processedAssignments1 = assignments1Data.data.map(a => ({
          id: a.id,
          subject: a.subjects as any,
          teacher: a.teachers as any,
          classrooms: classroomsByAssignment[a.id] || [],
          time_slot: a.time_slots as any,
          color: getSubjectColor((a.subjects as any)?.code || '', group.year)
        }))
        
        setAssignments1(prev => ({
          ...prev,
          [group.name]: processedAssignments1
        }))
      }

      // Process assignments for semester 2
      if (assignments2Data.data) {
        const processedAssignments2 = assignments2Data.data.map(a => ({
          id: a.id,
          subject: a.subjects as any,
          teacher: a.teachers as any,
          classrooms: classroomsByAssignment[a.id] || [],
          time_slot: a.time_slots as any,
          color: getSubjectColor((a.subjects as any)?.code || '', group.year)
        }))
        
        setAssignments2(prev => ({
          ...prev,
          [group.name]: processedAssignments2
        }))
      }

      // Mark group as loaded
      setLoadedGroups(prev => new Set(prev).add(group.id))
    } catch (error) {
      console.error(`Error loading assignments for group ${group.name}:`, error)
    }
  }

  const loadAssignmentsProgressive = async () => {
    setLoadingAssignments(true)
    
    // Reset loaded groups when filters change
    setLoadedGroups(new Set())
    setAssignments1({})
    setAssignments2({})
    
    // Load assignments for each group in parallel batches
    const batchSize = 3 // Load 3 groups at a time
    for (let i = 0; i < filteredGroups.length; i += batchSize) {
      const batch = filteredGroups.slice(i, i + batchSize)
      await Promise.all(batch.map(group => loadAssignmentsForGroup(group)))
    }
    
    setLoadingAssignments(false)
  }

  const uniqueGroups = Array.from(new Set(studentGroups.map(g => g.name)))

  const handleQuickFilter = (type: 'course' | 'degree', value: string) => {
    if (type === 'course') {
      setFilterCourse('all')
      setFilterYear(value)
      setFilterShift('all')
      setFilterGroup('all')
    } else {
      setFilterCourse(value)
      setFilterYear('all')
      setFilterShift('all')
      setFilterGroup('all')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-lg">Carregant dades inicials...</p>
        </div>
      </div>
    )
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

        {/* Quick access buttons */}
        <div className="print:hidden space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Accés ràpid per curs
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={filterYear === '1' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('course', '1')}
              >
                1r Curs
              </Button>
              <Button 
                variant={filterYear === '2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('course', '2')}
              >
                2n Curs
              </Button>
              <Button 
                variant={filterYear === '3' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('course', '3')}
              >
                3r Curs
              </Button>
              <Button 
                variant={filterYear === '4' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('course', '4')}
              >
                4t Curs
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Accés ràpid per grau
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={filterCourse === 'disseny' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('degree', 'disseny')}
              >
                Grau en Disseny
              </Button>
              <Button 
                variant={filterCourse === 'belles-arts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter('degree', 'belles-arts')}
              >
                Grau en Belles Arts
              </Button>
              <Button 
                variant={(filterCourse === 'all' && filterYear === 'all') ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilterCourse('all')
                  setFilterYear('all')
                  setFilterShift('all')
                  setFilterGroup('all')
                }}
                className="ml-4"
              >
                Mostrar tots
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tots els graus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els graus</SelectItem>
              <SelectItem value="disseny">Grau en Disseny</SelectItem>
              <SelectItem value="belles-arts">Grau en Belles Arts</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger>
              <SelectValue placeholder="Tots els cursos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els cursos</SelectItem>
              <SelectItem value="1">1r curs</SelectItem>
              <SelectItem value="2">2n curs</SelectItem>
              <SelectItem value="3">3r curs</SelectItem>
              <SelectItem value="4">4t curs</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterShift} onValueChange={setFilterShift}>
            <SelectTrigger>
              <SelectValue placeholder="Tots els torns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els torns</SelectItem>
              <SelectItem value="mati">Matí</SelectItem>
              <SelectItem value="tarda">Tarda</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterGroup} onValueChange={setFilterGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Tots els grups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els grups</SelectItem>
              {uniqueGroups.map(name => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading indicator for assignments */}
        {loadingAssignments && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <p className="text-blue-800">
              Carregant horaris per {filteredGroups.length} grups...
            </p>
          </div>
        )}

        {/* Schedule view */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No s'han trobat grups amb els filtres seleccionats
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredGroups.map((group, index) => {
              const isLoaded = loadedGroups.has(group.id)
              const groupAssignments1 = assignments1[group.name] || []
              const groupAssignments2 = assignments2[group.name] || []
              
              return (
                <div key={group.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <h2 className="text-xl font-semibold mb-4">
                    {group.name} - {group.year}r curs ({group.shift === 'mati' ? 'Matí' : 'Tarda'})
                  </h2>
                  
                  {!isLoaded && loadingAssignments ? (
                    <div className="space-y-4">
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </div>
                  ) : (
                    <SchedulePDFView
                      groups={[group]}
                      assignments1={{ [group.name]: groupAssignments1 }}
                      assignments2={{ [group.name]: groupAssignments2 }}
                      academicYear="2025-2026"
                      courseColors={courseColors}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}