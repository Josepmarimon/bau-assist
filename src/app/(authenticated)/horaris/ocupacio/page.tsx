'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Monitor,
  Boxes,
  Filter,
  MapPin,
  Search,
  Loader2
} from 'lucide-react'
import { CLASSROOM_TYPES } from '@/lib/constants/classroom-types'

interface Classroom {
  id: string
  code: string
  name: string
  building: string | null
  floor: number | null
  capacity: number
  type: string
  is_available: boolean
}

interface Assignment {
  id: string
  subject: {
    id: string
    name: string
    code: string
  }
  teacher: {
    id: string
    first_name: string
    last_name: string
  } | null
  student_group: {
    id: string
    name: string
  } | null
  time_slot: {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
  } | null
  semester: {
    id: string
    name: string
    number: number
  }
}

export default function OcupacioPage() {
  const supabase = createClient()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassrooms, setSelectedClassrooms] = useState<Classroom[]>([])
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({})
  const [loading, setLoading] = useState(false)
  const [loadingClassrooms, setLoadingClassrooms] = useState(true)
  const [selectedSemester, setSelectedSemester] = useState('1')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterBuilding, setFilterBuilding] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all')
  
  useEffect(() => {
    loadClassrooms()
  }, [])

  useEffect(() => {
    if (selectedClassrooms.length > 0) {
      loadAssignmentsForClassrooms()
    }
  }, [selectedClassrooms, selectedSemester])

  useEffect(() => {
    applyFilters()
  }, [filterType, filterBuilding, searchTerm, selectedClassroom, classrooms])

  const loadClassrooms = async () => {
    try {
      setLoadingClassrooms(true)
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('is_available', true)
        .order('building', { ascending: true })
        .order('code', { ascending: true })

      if (error) throw error
      setClassrooms(data || [])
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setLoadingClassrooms(false)
    }
  }

  const loadAssignmentsForClassrooms = async () => {
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

      // Load assignments for each classroom
      const newAssignments: Record<string, Assignment[]> = {}
      
      for (const classroom of selectedClassrooms) {
        // Get assignment IDs for this classroom
        const { data: assignmentClassrooms } = await supabase
          .from('assignment_classrooms')
          .select('assignment_id')
          .eq('classroom_id', classroom.id)

        if (!assignmentClassrooms || assignmentClassrooms.length === 0) {
          newAssignments[classroom.id] = []
          continue
        }

        const assignmentIds = assignmentClassrooms.map(ac => ac.assignment_id)

        // Get assignments with related data
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select(`
            id,
            subjects!subject_id (id, name, code),
            teachers!teacher_id (id, first_name, last_name),
            student_groups!student_group_id (id, name),
            time_slots!time_slot_id (id, day_of_week, start_time, end_time),
            semesters!semester_id (id, name, number)
          `)
          .in('id', assignmentIds)
          .eq('semester_id', semester.id)

        if (assignmentsData) {
          const transformed = assignmentsData.map(a => ({
            id: a.id,
            subject: a.subjects as any,
            teacher: a.teachers as any,
            student_group: a.student_groups as any,
            time_slot: a.time_slots as any,
            semester: a.semesters as any
          })).filter(a => a.time_slot && a.subject)

          newAssignments[classroom.id] = transformed
        } else {
          newAssignments[classroom.id] = []
        }
      }
      
      setAssignments(newAssignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...classrooms]

    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'informatica') {
        filtered = filtered.filter(c => c.type === CLASSROOM_TYPES.INFORMATICA)
      } else if (filterType === 'polivalent') {
        filtered = filtered.filter(c => c.type === CLASSROOM_TYPES.POLIVALENT)
      }
    }

    // Apply building filter
    if (filterBuilding !== 'all') {
      filtered = filtered.filter(c => c.building === filterBuilding)
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(search) ||
        c.code.toLowerCase().includes(search)
      )
    }

    // Apply specific classroom filter
    if (selectedClassroom !== 'all') {
      filtered = filtered.filter(c => c.id === selectedClassroom)
    }

    setSelectedClassrooms(filtered)
  }

  const handlePresetFilter = (preset: 'informatica' | 'polivalent') => {
    setFilterType(preset)
    setFilterBuilding('all')
    setSearchTerm('')
    setSelectedClassroom('all')
  }

  const formatBuildingName = (building: string | null): string => {
    if (!building) return '-'
    if (building === 'G') return 'Edifici Granada'
    return building
  }

  const getAssignmentsForDay = (classroomAssignments: Assignment[], day: number) => {
    return classroomAssignments.filter(assignment => 
      assignment.time_slot && assignment.time_slot.day_of_week === day
    )
  }

  const getSubjectColor = (code: string) => {
    if (code.startsWith('GD')) return '#3B82F6' // Blue for Design
    if (code.startsWith('GBA')) return '#8B5CF6' // Purple for Belles Arts
    if (code.startsWith('TR')) return '#10B981' // Green for transversal
    return '#00CED1' // Default
  }

  const weekDays = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
  const buildings = [...new Set(classrooms.map(c => c.building).filter(Boolean))].sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ocupació d'Aules</h1>
          <p className="text-muted-foreground mt-2">
            Visualització de l'ocupació setmanal de les aules
          </p>
        </div>
        
        <Tabs value={selectedSemester} onValueChange={setSelectedSemester}>
          <TabsList>
            <TabsTrigger value="1">Primer Semestre</TabsTrigger>
            <TabsTrigger value="2">Segon Semestre</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Preset Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres ràpids
            </h3>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant={filterType === 'informatica' ? 'default' : 'outline'}
              onClick={() => handlePresetFilter('informatica')}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              Aules Informàtica
            </Button>
            <Button
              variant={filterType === 'polivalent' ? 'default' : 'outline'}
              onClick={() => handlePresetFilter('polivalent')}
              className="flex items-center gap-2"
            >
              <Boxes className="h-4 w-4" />
              Espais Polivalents
            </Button>
            <Button
              variant={filterType === 'all' && filterBuilding === 'all' && !searchTerm && selectedClassroom === 'all' ? 'default' : 'outline'}
              onClick={() => {
                setFilterType('all')
                setFilterBuilding('all')
                setSearchTerm('')
                setSelectedClassroom('all')
              }}
            >
              Totes les Aules
            </Button>
          </div>
        </div>
      </Card>

      {/* Advanced Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cercar aula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border rounded-md"
            />
          </div>

          {/* Building filter */}
          <Select value={filterBuilding} onValueChange={setFilterBuilding}>
            <SelectTrigger>
              <SelectValue placeholder="Edifici" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els edificis</SelectItem>
              {buildings.map(building => (
                <SelectItem key={building || 'null'} value={building || 'null'}>
                  {formatBuildingName(building)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipus d'aula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els tipus</SelectItem>
              <SelectItem value="informatica">Informàtica</SelectItem>
              <SelectItem value="polivalent">Polivalent</SelectItem>
              <SelectItem value="taller">Taller</SelectItem>
              <SelectItem value="projectes">Projectes</SelectItem>
            </SelectContent>
          </Select>

          {/* Specific classroom */}
          <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
            <SelectTrigger>
              <SelectValue placeholder="Aula específica" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Totes les aules</SelectItem>
              {classrooms.map(classroom => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.code} - {classroom.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedClassrooms.length} aules seleccionades</span>
          {(filterType !== 'all' || filterBuilding !== 'all' || searchTerm || selectedClassroom !== 'all') && (
            <>
              <span>•</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterType('all')
                  setFilterBuilding('all')
                  setSearchTerm('')
                  setSelectedClassroom('all')
                }}
                className="h-6 px-2 text-xs"
              >
                Netejar filtres
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Classroom Schedules */}
      {loadingClassrooms ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : selectedClassrooms.length === 0 ? (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">
            No s'han trobat aules amb els filtres aplicats
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {selectedClassrooms.map(classroom => {
            const classroomAssignments = assignments[classroom.id] || []
            
            return (
              <Card key={classroom.id} className={loading ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {classroom.name}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Codi: {classroom.code}</span>
                        {classroom.building && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {formatBuildingName(classroom.building)}
                            </span>
                          </>
                        )}
                        {classroom.floor !== null && (
                          <>
                            <span>•</span>
                            <span>Planta {classroom.floor}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {classroom.capacity} persones
                        </span>
                      </div>
                    </div>
                    <Badge variant={classroom.type === CLASSROOM_TYPES.INFORMATICA ? 'default' : 'secondary'}>
                      {classroom.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-[280px]">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregant ocupació...
                      </div>
                    </div>
                  ) : classroomAssignments.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                      Aula lliure aquest semestre
                    </div>
                  ) : (
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
                            const dayAssignments = getAssignmentsForDay(classroomAssignments, day)
                            
                            return (
                              <div key={day} className="bg-gray-50 rounded-lg p-1 h-[320px] relative border-r border-gray-200 last:border-r-0">
                                {/* Time labels */}
                                <div className="absolute inset-0 pointer-events-none">
                                  <div className="absolute left-1 top-0 text-[10px] text-gray-400">
                                    8:00
                                  </div>
                                  <div className="absolute left-1 top-[50%] text-[10px] text-gray-400">
                                    14:00
                                  </div>
                                  <div className="absolute left-1 bottom-0 text-[10px] text-gray-400">
                                    20:00
                                  </div>
                                </div>
                                
                                {/* Assignments */}
                                {dayAssignments.map(assignment => {
                                  if (!assignment.time_slot) return null
                                  
                                  const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
                                  const endHour = parseInt(assignment.time_slot.end_time.split(':')[0])
                                  const startMinutes = parseInt(assignment.time_slot.start_time.split(':')[1])
                                  const endMinutes = parseInt(assignment.time_slot.end_time.split(':')[1])
                                  
                                  // Calculate position and height (8:00 to 20:00 = 12 hours)
                                  const dayStart = 8 * 60
                                  const dayEnd = 20 * 60
                                  const totalMinutes = dayEnd - dayStart
                                  
                                  const assignmentStart = (startHour * 60 + startMinutes) - dayStart
                                  const assignmentEnd = (endHour * 60 + endMinutes) - dayStart
                                  
                                  const top = Math.max(0, (assignmentStart / totalMinutes) * 100)
                                  const height = Math.min(100 - top, ((assignmentEnd - assignmentStart) / totalMinutes) * 100)
                                  
                                  return (
                                    <div
                                      key={assignment.id}
                                      style={{
                                        position: 'absolute',
                                        top: `${top}%`,
                                        height: `${height}%`,
                                        left: '4px',
                                        right: '4px',
                                        backgroundColor: getSubjectColor(assignment.subject.code)
                                      }}
                                      className="rounded-md p-1.5 text-white flex flex-col gap-0.5 shadow-sm overflow-hidden"
                                    >
                                      <div className="font-semibold text-[10px] line-clamp-2 leading-tight">
                                        {assignment.subject.name}
                                      </div>
                                      
                                      {assignment.student_group && (
                                        <div className="text-[9px] opacity-90 flex items-center gap-0.5">
                                          <Users className="h-2.5 w-2.5 flex-shrink-0" />
                                          <span className="truncate">{assignment.student_group.name}</span>
                                        </div>
                                      )}
                                      
                                      {assignment.teacher && (
                                        <div className="text-[9px] opacity-90 flex items-center gap-0.5">
                                          <GraduationCap className="h-2.5 w-2.5 flex-shrink-0" />
                                          <span className="truncate">
                                            {assignment.teacher.first_name} {assignment.teacher.last_name}
                                          </span>
                                        </div>
                                      )}
                                      
                                      <div className="text-[9px] opacity-80 mt-auto">
                                        {assignment.time_slot.start_time.substring(0, 5)} - {assignment.time_slot.end_time.substring(0, 5)}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {selectedClassrooms.length > 0 && !loading && (
        <Card className="p-4">
          <p className="text-sm font-medium mb-3">Llegenda de colors:</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-sm">Grau en Disseny</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
              <span className="text-sm">Grau en Belles Arts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-sm">Transversal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00CED1' }}></div>
              <span className="text-sm">Altres</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}