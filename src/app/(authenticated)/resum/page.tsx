'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  GraduationCap, 
  Users, 
  Home, 
  Wrench,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  Building2,
  Monitor,
  Lightbulb
} from 'lucide-react'
import { CLASSROOM_TYPES } from '@/lib/constants/classroom-types'

interface SummaryStats {
  programs: {
    total: number
    byType: { type: string; count: number }[]
  }
  teachers: {
    total: number
    averageWorkload: number
    maxWorkload: number
  }
  classrooms: {
    total: number
    withoutAssignments: { id: string; name: string; building: string }[]
    byBuilding: { building: string; count: number }[]
    occupancyRate: number
    totalCapacity: number
    byType: {
      polivalent: number
      taller: number
      informatica: number
      projectes: number
      seminari: number
    }
  }
  subjects: {
    total: number
    byType: { type: string; count: number }[]
    withoutAssignments: number
  }
  assignments: {
    total: number
    bySemester: { semester: string; count: number }[]
    conflicts: number
    conflictDetails: {
      type: 'teacher' | 'classroom'
      resource: string
      assignments: {
        subject: string
        group: string
        timeSlot: string
        day: string
        semester: string
      }[]
    }[]
  }
  workshops: {
    total: number
    byProgram: { program_name: string; count: number }[]
  }
}

export default function ResumPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SummaryStats | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const supabase = createClient()

  useEffect(() => {
    loadSummaryData()
  }, [])

  const loadSummaryData = async () => {
    try {
      setLoading(true)

      // Programs data
      const { data: programs } = await supabase
        .from('programs')
        .select('id, type')
      
      const programsByType = programs?.reduce((acc, p) => {
        const type = p.type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Teachers data - calculate workload from assignments
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, max_hours')
      
      const { data: teacherAssignments } = await supabase
        .from('assignments')
        .select(`
          teacher_id,
          subjects!inner(
            credits
          )
        `)
        .not('teacher_id', 'is', null)
      
      // Calculate workload per teacher
      const teacherWorkloadMap = new Map<string, number>()
      teacherAssignments?.forEach(assignment => {
        if (assignment.teacher_id && assignment.subjects) {
          const currentHours = teacherWorkloadMap.get(assignment.teacher_id) || 0
          // Handle subjects as array (Supabase returns array for joins)
          const credits = Array.isArray(assignment.subjects) 
            ? assignment.subjects[0]?.credits || 0
            : (assignment.subjects as any).credits || 0
          teacherWorkloadMap.set(assignment.teacher_id, currentHours + credits)
        }
      })
      
      const workloads = Array.from(teacherWorkloadMap.values())
      const teacherStats = {
        total: teachers?.length || 0,
        averageWorkload: workloads.length 
          ? workloads.reduce((sum, hours) => sum + hours, 0) / workloads.length 
          : 0,
        maxWorkload: workloads.length ? Math.max(...workloads) : 0
      }

      // Classrooms data
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('id, name, building, capacity, type')

      // Check both assignments.classroom_id (legacy) and assignment_classrooms table
      const { data: assignments } = await supabase
        .from('assignments')
        .select('classroom_id')
        .not('classroom_id', 'is', null)

      const { data: assignmentClassrooms } = await supabase
        .from('assignment_classrooms')
        .select('classroom_id')

      // Combine both sources of classroom assignments
      const assignedClassroomIds = new Set([
        ...(assignments?.map(a => a.classroom_id) || []),
        ...(assignmentClassrooms?.map(ac => ac.classroom_id) || [])
      ])

      const classroomsWithoutAssignments = classrooms?.filter(
        c => !assignedClassroomIds.has(c.id)
      ) || []

      const classroomsByBuilding = classrooms?.reduce((acc, c) => {
        const building = c.building || 'Unknown'
        acc[building] = (acc[building] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Calculate total capacity and classroom types
      const totalCapacity = classrooms?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0
      const classroomsByType = {
        polivalent: classrooms?.filter(c => c.type === CLASSROOM_TYPES.POLIVALENT).length || 0,
        taller: classrooms?.filter(c => c.type === CLASSROOM_TYPES.TALLER).length || 0,
        informatica: classrooms?.filter(c => c.type === CLASSROOM_TYPES.INFORMATICA).length || 0,
        projectes: classrooms?.filter(c => c.type === CLASSROOM_TYPES.PROJECTES).length || 0,
        seminari: classrooms?.filter(c => c.type === CLASSROOM_TYPES.SEMINARI).length || 0
      }

      // Subjects data
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, type')
      
      const { data: subjectAssignments } = await supabase
        .from('assignments')
        .select('subject_id')
        .not('subject_id', 'is', null)
      
      const assignedSubjectIds = new Set(subjectAssignments?.map(a => a.subject_id))
      const subjectsWithoutAssignments = subjects?.filter(
        s => !assignedSubjectIds.has(s.id)
      ).length || 0

      const subjectsByType = subjects?.reduce((acc, s) => {
        const type = s.type || 'unknown'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Assignments and conflicts
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select(`
          id,
          semester_id,
          semesters(name)
        `)

      const assignmentsBySemester = allAssignments?.reduce((acc, a) => {
        const semester = (a.semesters as any)?.name || 'unknown'
        acc[semester] = (acc[semester] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Check for conflicts by looking for overlapping assignments
      // Only check assignments with student_group_id (actual student schedules)
      const { data: potentialConflicts } = await supabase
        .from('assignments')
        .select(`
          id,
          time_slot_id,
          classroom_id,
          teacher_id,
          semester_id,
          student_group_id,
          time_slots(day_of_week, start_time, end_time),
          subjects(name),
          subject_groups(group_code),
          semesters(name),
          teachers(first_name, last_name),
          classrooms(name)
        `)
        .not('time_slot_id', 'is', null)
        .not('student_group_id', 'is', null)

      // Detect conflicts (same teacher or classroom at same time)
      let conflictsCount = 0
      const conflictDetailsMap = new Map<string, any>()
      const assignmentMap = new Map<string, any[]>()

      const dayNames = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

      potentialConflicts?.forEach(assignment => {
        const timeSlot = assignment.time_slots as any
        if (timeSlot?.day_of_week && assignment.time_slot_id) {
          const assignmentInfo = {
            subject: (assignment.subjects as any)?.name || 'Unknown',
            group: (assignment.subject_groups as any)?.group_code || 'Unknown',
            timeSlot: `${timeSlot.start_time} - ${timeSlot.end_time}`,
            day: dayNames[timeSlot.day_of_week] || 'Unknown',
            semester: (assignment.semesters as any)?.name || 'Unknown'
          }

          // Check teacher conflicts
          if (assignment.teacher_id) {
            const teacherKey = `teacher-${assignment.teacher_id}-${timeSlot.day_of_week}-${assignment.time_slot_id}-${assignment.semester_id}`
            if (assignmentMap.has(teacherKey)) {
              conflictsCount++
              const teacher = assignment.teachers as any
              const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown'

              if (!conflictDetailsMap.has(teacherKey)) {
                conflictDetailsMap.set(teacherKey, {
                  type: 'teacher' as const,
                  resource: teacherName,
                  assignments: [assignmentMap.get(teacherKey)![0]]
                })
              }
              conflictDetailsMap.get(teacherKey)!.assignments.push(assignmentInfo)
            } else {
              assignmentMap.set(teacherKey, [assignmentInfo])
            }
          }

          // Check classroom conflicts
          if (assignment.classroom_id) {
            const classroomKey = `classroom-${assignment.classroom_id}-${timeSlot.day_of_week}-${assignment.time_slot_id}-${assignment.semester_id}`
            if (assignmentMap.has(classroomKey)) {
              conflictsCount++
              const classroom = assignment.classrooms as any
              const classroomName = classroom?.name || 'Unknown'

              if (!conflictDetailsMap.has(classroomKey)) {
                conflictDetailsMap.set(classroomKey, {
                  type: 'classroom' as const,
                  resource: classroomName,
                  assignments: [assignmentMap.get(classroomKey)![0]]
                })
              }
              conflictDetailsMap.get(classroomKey)!.assignments.push(assignmentInfo)
            } else {
              assignmentMap.set(classroomKey, [assignmentInfo])
            }
          }
        }
      })

      const conflictDetails = Array.from(conflictDetailsMap.values())

      // Workshops (Tallers) - subjects with 'Taller' in the name
      const { data: workshops } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          program_id,
          programs(name)
        `)
        .ilike('name', '%Taller%')

      const workshopsByProgram = workshops?.reduce((acc, w) => {
        const programName = (w.programs as any)?.name || 'Sense programa'
        acc[programName] = (acc[programName] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Calculate occupancy rate
      const occupancyRate = classrooms?.length 
        ? ((classrooms.length - classroomsWithoutAssignments.length) / classrooms.length) * 100
        : 0

      setStats({
        programs: {
          total: programs?.length || 0,
          byType: Object.entries(programsByType || {}).map(([type, count]) => ({ type, count }))
        },
        teachers: teacherStats,
        classrooms: {
          total: classrooms?.length || 0,
          withoutAssignments: classroomsWithoutAssignments,
          byBuilding: Object.entries(classroomsByBuilding || {}).map(([building, count]) => ({ building, count })),
          occupancyRate,
          totalCapacity,
          byType: classroomsByType
        },
        subjects: {
          total: subjects?.length || 0,
          byType: Object.entries(subjectsByType || {}).map(([type, count]) => ({ type, count })),
          withoutAssignments: subjectsWithoutAssignments
        },
        assignments: {
          total: allAssignments?.length || 0,
          bySemester: Object.entries(assignmentsBySemester || {}).map(([semester, count]) => ({ semester, count })),
          conflicts: conflictsCount,
          conflictDetails
        },
        workshops: {
          total: workshops?.length || 0,
          byProgram: Object.entries(workshopsByProgram || {}).map(([program_name, count]) => ({ program_name, count }))
        }
      })
    } catch (error) {
      console.error('Error loading summary data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">
          No s'han pogut carregar les dades
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resum de Dades</h1>
        <p className="text-muted-foreground">Vista general del sistema acadèmic</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.programs.total}</div>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              {stats.programs.byType.map(({ type, count }) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize">{type}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teachers.total}</div>
            <div className="text-xs text-muted-foreground">
              Càrrega mitjana: {stats.teachers.averageWorkload.toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground">
              Càrrega màxima: {stats.teachers.maxWorkload}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aules</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classrooms.total}</div>
            <div className="text-xs text-muted-foreground">
              Ocupació: {stats.classrooms.occupancyRate.toFixed(1)}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${stats.classrooms.occupancyRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tallers</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workshops.total}</div>
            <div className="text-xs text-muted-foreground">
              En {stats.workshops.byProgram.length} programes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="aules">Aules</TabsTrigger>
          <TabsTrigger value="assignatures">Assignatures</TabsTrigger>
          <TabsTrigger value="conflictes">Conflictes</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Assignatures per tipus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.subjects.byType.map(({ type, count }) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize">{type}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Assignacions per semestre
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.assignments.bySemester.map(({ semester, count }) => (
                    <div key={semester} className="flex items-center justify-between">
                      <span>{semester}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aules" className="space-y-4">
          {/* Classroom Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resum d'Aules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Total</p>
                  </div>
                  <p className="text-xl font-bold">{stats.classrooms.total}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Capacitat</p>
                  </div>
                  <p className="text-xl font-bold">{stats.classrooms.totalCapacity}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Polivalent</p>
                  </div>
                  <p className="text-xl font-bold">{stats.classrooms.byType.polivalent}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Taller</p>
                  </div>
                  <p className="text-xl font-bold">{stats.classrooms.byType.taller}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Informàtica</p>
                  </div>
                  <p className="text-xl font-bold">{stats.classrooms.byType.informatica}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Projectes</p>
                  </div>
                  <p className="text-xl font-bold">{stats.classrooms.byType.projectes}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Seminari</p>
                  </div>
                  <p className="text-xl font-bold">{stats.classrooms.byType.seminari}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aules per edifici</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.classrooms.byBuilding.map(({ building, count }) => (
                  <div key={building} className="flex items-center justify-between">
                    <span>{building}</span>
                    <Badge>{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {stats.classrooms.withoutAssignments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                  Aules sense assignació horària
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.classrooms.withoutAssignments.map(classroom => (
                    <div key={classroom.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                      <span className="font-medium">{classroom.name}</span>
                      <Badge variant="outline">{classroom.building}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assignatures" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estadístiques d'assignatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total d'assignatures</span>
                  <span className="font-bold">{stats.subjects.total}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Sense assignacions</span>
                  <span className="font-bold">{stats.subjects.withoutAssignments}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Amb assignacions</span>
                  <span className="font-bold">
                    {stats.subjects.total - stats.subjects.withoutAssignments}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tallers per programa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.workshops.byProgram.map(({ program_name, count }) => (
                    <div key={program_name} className="flex items-center justify-between">
                      <span className="text-sm">{program_name}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conflictes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Conflictes d'horari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl font-bold text-red-500">
                  {stats.assignments.conflicts}
                </div>
                <p className="text-muted-foreground mt-2">
                  conflictes detectats
                </p>
              </div>
              {stats.assignments.conflicts > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-900 mb-4">
                      Detall dels conflictes detectats:
                    </p>
                  </div>

                  {stats.assignments.conflictDetails.map((conflict, index) => (
                    <Card key={index} className="border-red-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          {conflict.type === 'teacher' ? (
                            <>
                              <Users className="h-4 w-4 text-red-500" />
                              Professor: {conflict.resource}
                            </>
                          ) : (
                            <>
                              <Building2 className="h-4 w-4 text-red-500" />
                              Aula: {conflict.resource}
                            </>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {conflict.assignments.map((assignment, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3 bg-red-50 rounded-md text-sm"
                            >
                              <Clock className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-red-900">
                                  {assignment.subject} - {assignment.group}
                                </div>
                                <div className="text-red-700 text-xs mt-1">
                                  {assignment.day} · {assignment.timeSlot} · {assignment.semester}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {stats.assignments.conflicts === 0 && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 text-center">
                    ✓ No s'han detectat conflictes d'horari
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}