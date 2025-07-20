'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { 
  Package, 
  Calendar,
  Clock,
  Users,
  BookOpen,
  Monitor,
  AlertCircle,
  School,
  MapPin,
  Hash
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface SubjectDetailDialogProps {
  subject: {
    id: string
    code: string
    name: string
    credits: number
    year: number
    semester: string
    type: string
    department?: string | null
    itinerari?: string | null
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SoftwareRequirement {
  id: string
  software: {
    id: string
    name: string
    category: string
    license_type: string
  }
  academic_year: string
  is_required: boolean
  notes?: string
}

interface SubjectGroup {
  id: string
  group_code: string
  max_students: number
  semester_id: string
  semester: {
    id: string
    name: string
    number: number
    academic_year: {
      id: string
      year: string
    }
  }
  assignments: {
    id: string
    classroom: {
      id: string
      code: string
      name: string
      building?: string
      capacity: number
    } | null
    time_slot: {
      id: string
      day_of_week: number
      start_time: string
      end_time: string
    } | null
  }[]
  teaching_assignments?: {
    id: number
    ects_assigned: number
    is_coordinator: boolean
    teacher: {
      id: number
      code: string
      first_name: string
      last_name: string
    }
  }[]
}

export function SubjectDetailDialog({ subject, open, onOpenChange }: SubjectDetailDialogProps) {
  const [loading, setLoading] = useState(false)
  const [softwareRequirements, setSoftwareRequirements] = useState<SoftwareRequirement[]>([])
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const supabase = createClient()

  // Get current academic year
  const getCurrentAcademicYear = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    // Academic year starts in September
    if (month >= 8) {
      return `${year}-${year + 1}`
    } else {
      return `${year - 1}-${year}`
    }
  }

  const currentYear = getCurrentAcademicYear()

  useEffect(() => {
    if (subject && open) {
      loadSoftwareRequirements()
      loadSubjectGroups()
    }
  }, [subject, open])

  const loadSoftwareRequirements = async () => {
    if (!subject) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subject_software')
        .select(`
          id,
          academic_year,
          is_required,
          notes,
          software:software_id (
            id,
            name,
            category,
            license_type
          )
        `)
        .eq('subject_id', subject.id)
        .order('academic_year', { ascending: false })

      if (error) throw error
      setSoftwareRequirements((data as any) || [])
    } catch (error) {
      console.error('Error loading software requirements:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectGroups = async () => {
    if (!subject) return

    try {
      setGroupsLoading(true)
      const { data, error } = await supabase
        .from('subject_groups')
        .select(`
          id,
          group_code,
          max_students,
          semester_id,
          semester:semesters (
            id,
            name,
            number,
            academic_year:academic_years (
              id,
              year:name
            )
          ),
          assignments (
            id,
            classroom:classrooms (
              id,
              code,
              name,
              building,
              capacity
            ),
            time_slot:time_slots (
              id,
              day_of_week,
              start_time,
              end_time
            )
          ),
          teaching_assignments (
            id,
            ects_assigned,
            is_coordinator,
            teacher:teacher_id (
              id,
              code,
              first_name,
              last_name
            )
          )
        `)
        .eq('subject_id', subject.id)
        .order('semester_id', { ascending: false })
        .order('group_code', { ascending: true })

      if (error) throw error
      setSubjectGroups((data as any) || [])
    } catch (error) {
      console.error('Error loading subject groups:', error)
    } finally {
      setGroupsLoading(false)
    }
  }

  // Group requirements by academic year
  const requirementsByYear = softwareRequirements.reduce((acc, req) => {
    if (!acc[req.academic_year]) {
      acc[req.academic_year] = []
    }
    acc[req.academic_year].push(req)
    return acc
  }, {} as Record<string, SoftwareRequirement[]>)

  const years = Object.keys(requirementsByYear).sort().reverse()
  const currentYearRequirements = requirementsByYear[currentYear] || []
  const hasCurrentYearData = currentYearRequirements.length > 0

  // Group subject groups by semester
  const groupsBySemester = subjectGroups.reduce((acc, group) => {
    const semesterKey = `${group.semester.academic_year.year} - ${group.semester.name}`
    if (!acc[semesterKey]) {
      acc[semesterKey] = []
    }
    acc[semesterKey].push(group)
    return acc
  }, {} as Record<string, SubjectGroup[]>)

  // Get day name from day_of_week number
  const getDayName = (dayNumber: number) => {
    const days = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte']
    return days[dayNumber] || ''
  }

  // Format time
  const formatTime = (time: string) => {
    return time.slice(0, 5) // Remove seconds
  }

  // Calculate summary statistics
  const groupStats = subjectGroups.reduce((acc, group) => {
    acc.total++
    acc.totalCapacity += group.max_students
    return acc
  }, { total: 0, totalCapacity: 0 })

  if (!subject) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {subject.name}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Badge variant="outline">{subject.code}</Badge>
            <Badge variant={subject.type === 'Obligatòria' ? 'default' : 'secondary'}>
              {subject.type}
            </Badge>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {subject.credits} ECTS
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {subject.year}r curs
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {subject.semester}
            </span>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Subject Info */}
          <Card className="bg-sky-50 border-sky-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Informació de l'assignatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">Departament</dt>
                  <dd className="mt-1">{subject.department || 'No especificat'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Crèdits ECTS</dt>
                  <dd className="mt-1">{subject.credits}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Curs</dt>
                  <dd className="mt-1">{subject.year}r</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Semestre</dt>
                  <dd className="mt-1">{subject.semester}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Itinerari</dt>
                  <dd className="mt-1">{subject.itinerari || 'No especificat'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Tipus</dt>
                  <dd className="mt-1">{subject.type}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Software Requirements */}
          <Card className="bg-sky-50 border-sky-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Software necessari
              </CardTitle>
              <CardDescription>
                Programari requerit per cursar aquesta assignatura
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <Tabs defaultValue={currentYear} className="w-full">
                  <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${years.length}, 1fr)` }}>
                    {years.map(year => (
                      <TabsTrigger key={year} value={year}>
                        {year}
                        {year === currentYear && ' (Actual)'}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {!hasCurrentYearData && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <p className="font-medium">No hi ha requisits definits per al curs actual ({currentYear})</p>
                        <p className="mt-1">Es mostren els requisits d'anys anteriors com a referència.</p>
                      </div>
                    </div>
                  )}

                  {years.map(year => {
                    const yearRequirements = requirementsByYear[year] || []
                    const requiredSoftware = yearRequirements.filter(r => r.is_required)
                    const optionalSoftware = yearRequirements.filter(r => !r.is_required)

                    return (
                      <TabsContent key={year} value={year} className="mt-4 space-y-4">
                        {yearRequirements.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            No hi ha software assignat per aquest any acadèmic
                          </p>
                        ) : (
                          <>
                            {requiredSoftware.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                                  Software obligatori ({requiredSoftware.length})
                                </h4>
                                <div className="grid gap-2">
                                  {requiredSoftware.map(req => (
                                    <div
                                      key={req.id}
                                      className="flex items-center justify-between p-3 rounded-lg border bg-sky-50 border-sky-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="font-medium">{req.software.name}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                              {req.software.category}
                                            </Badge>
                                            <Badge 
                                              variant={req.software.license_type === 'proprietary' ? 'destructive' : 'secondary'}
                                              className="text-xs"
                                            >
                                              {req.software.license_type === 'proprietary' ? 'Privatiu' : 'Lliure'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      {req.notes && (
                                        <p className="text-xs text-muted-foreground max-w-[200px]">
                                          {req.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {optionalSoftware.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                                  Software opcional ({optionalSoftware.length})
                                </h4>
                                <div className="grid gap-2">
                                  {optionalSoftware.map(req => (
                                    <div
                                      key={req.id}
                                      className="flex items-center justify-between p-3 rounded-lg border bg-sky-50/70 border-sky-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <p className="font-medium">{req.software.name}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                              {req.software.category}
                                            </Badge>
                                            <Badge 
                                              variant={req.software.license_type === 'proprietary' ? 'destructive' : 'secondary'}
                                              className="text-xs"
                                            >
                                              {req.software.license_type === 'proprietary' ? 'Privatiu' : 'Lliure'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                      {req.notes && (
                                        <p className="text-xs text-muted-foreground max-w-[200px]">
                                          {req.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </TabsContent>
                    )
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Subject Groups */}
          <Card className="bg-sky-50 border-sky-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <School className="h-5 w-5" />
                Grups de l'assignatura
              </CardTitle>
              <CardDescription>
                Distribució de grups i aules assignades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : subjectGroups.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hi ha grups assignats per aquesta assignatura
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{groupStats.total}</p>
                      <p className="text-sm text-muted-foreground">Grups totals</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{groupStats.totalCapacity}</p>
                      <p className="text-sm text-muted-foreground">Capacitat total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{Object.keys(groupStats.byType).length}</p>
                      <p className="text-sm text-muted-foreground">Tipus de grups</p>
                    </div>
                  </div>


                  {/* Groups by semester */}
                  <Tabs defaultValue={Object.keys(groupsBySemester)[0]} className="w-full">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(groupsBySemester).length}, 1fr)` }}>
                      {Object.keys(groupsBySemester).map(semester => (
                        <TabsTrigger key={semester} value={semester}>
                          {semester}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Object.entries(groupsBySemester).map(([semester, groups]) => (
                      <TabsContent key={semester} value={semester} className="mt-4 space-y-4">
                        {groups.map(group => (
                          <div
                            key={group.id}
                            className="border rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Hash className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">{group.group_code}</span>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Users className="h-3 w-3" />
                                  <span>Max: {group.max_students} estudiants</span>
                                </div>
                              </div>
                            </div>

                            {/* Assignments */}
                            {group.assignments.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Horaris i aules:</p>
                                <div className="grid gap-2">
                                  {group.assignments.map((assignment) => (
                                    <div
                                      key={assignment.id}
                                      className="flex items-center gap-4 p-2 bg-muted/50 rounded-md text-sm"
                                    >
                                      {assignment.time_slot && (
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-3 w-3 text-muted-foreground" />
                                          <span>{getDayName(assignment.time_slot.day_of_week)}</span>
                                          <span className="text-muted-foreground">
                                            {formatTime(assignment.time_slot.start_time)} - {formatTime(assignment.time_slot.end_time)}
                                          </span>
                                        </div>
                                      )}
                                      {assignment.classroom && (
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-3 w-3 text-muted-foreground" />
                                          <span className="font-medium">{assignment.classroom.code}</span>
                                          {assignment.classroom.building && (
                                            <span className="text-muted-foreground">
                                              ({assignment.classroom.building})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      {!assignment.time_slot && !assignment.classroom && (
                                        <span className="text-muted-foreground italic">
                                          Sense horari ni aula assignada
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {group.assignments.length === 0 && (
                              <p className="text-sm text-muted-foreground italic">
                                Aquest grup no té horaris ni aules assignades
                              </p>
                            )}

                            {/* Teaching assignments */}
                            {group.teaching_assignments && group.teaching_assignments.length > 0 && (
                              <div className="space-y-2 pt-2 border-t">
                                <p className="text-sm font-medium text-muted-foreground">Professors assignats:</p>
                                <div className="grid gap-2">
                                  {group.teaching_assignments.map((teaching) => (
                                    <div
                                      key={teaching.id}
                                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <School className="h-3 w-3 text-muted-foreground" />
                                        <span className="font-medium">
                                          {teaching.teacher.first_name} {teaching.teacher.last_name}
                                        </span>
                                        <span className="text-muted-foreground">
                                          ({teaching.teacher.code})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {teaching.is_coordinator && (
                                          <Badge variant="secondary" className="text-xs">
                                            Coordinador
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className="text-xs">
                                          {teaching.ects_assigned} ECTS
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}